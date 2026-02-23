from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import base64
import secrets
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# =============================================================================
# CRITICAL: Environment Variable Validation for Production
# =============================================================================
def validate_required_env_vars():
    """
    Validates that all required environment variables are set.
    Fails explicitly if any required variable is missing.
    """
    required_vars = {
        'MONGO_URL': 'MongoDB connection string (required for database)',
        'DB_NAME': 'Database name (required for database)',
    }
    
    missing_vars = []
    for var, description in required_vars.items():
        value = os.environ.get(var)
        if not value:
            missing_vars.append(f"  - {var}: {description}")
        else:
            # Log that variable is set (mask sensitive data)
            if 'URL' in var or 'KEY' in var:
                masked = value[:20] + '...' if len(value) > 20 else value
                logger.info(f"✓ {var} is set: {masked}")
            else:
                logger.info(f"✓ {var} is set: {value}")
    
    if missing_vars:
        error_msg = (
            "\n"
            "=" * 60 + "\n"
            "CRITICAL ERROR: Missing required environment variables!\n"
            "=" * 60 + "\n"
            "The following environment variables MUST be set:\n\n"
            + "\n".join(missing_vars) + "\n\n"
            "For production, these are injected by Emergent deployment.\n"
            "For local development, create a .env file in /app/backend/\n"
            "=" * 60
        )
        logger.critical(error_msg)
        sys.exit(1)

# Run validation before anything else
validate_required_env_vars()

# =============================================================================
# MongoDB Connection - NO FALLBACKS (Production Ready)
# =============================================================================
MONGO_URL = os.environ['MONGO_URL']  # Will fail if not set (validated above)
DB_NAME = os.environ['DB_NAME']      # Will fail if not set (validated above)

logger.info("=" * 60)
logger.info("INITIALIZING DATABASE CONNECTION")
logger.info("=" * 60)
logger.info(f"MongoDB URL: {MONGO_URL[:30]}..." if len(MONGO_URL) > 30 else f"MongoDB URL: {MONGO_URL}")
logger.info(f"Database Name: {DB_NAME}")
logger.info("=" * 60)

# Create single MongoDB client instance (used throughout the app)
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# =============================================================================
# SendGrid Configuration (Optional - for email verification)
# =============================================================================
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')
SENDGRID_FROM_EMAIL = os.environ.get('SENDGRID_FROM_EMAIL', '')

if SENDGRID_API_KEY:
    logger.info(f"✓ SendGrid configured with email: {SENDGRID_FROM_EMAIL}")
else:
    logger.warning("⚠ SendGrid not configured - email verification will be skipped")

# =============================================================================
# JWT Configuration
# =============================================================================
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', '')
if not SECRET_KEY:
    logger.warning("⚠ JWT_SECRET_KEY not set - using generated key (not recommended for production)")
    SECRET_KEY = secrets.token_urlsafe(32)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# =============================================================================
# FastAPI App Initialization
# =============================================================================
app = FastAPI(title="Cuban-Serbia Visa API")
api_router = APIRouter(prefix="/api")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/token")

# Visa Types and Prices for Serbia
VISA_TYPES = {
    "turismo": {
        "name": "Visado de Turismo",
        "price": 1500,
        "currency": "EUR",
        "processing_time": "1-2 meses"
    },
    "trabajo": {
        "name": "Visado por Contrato de Trabajo",
        "price": 2500,
        "currency": "EUR",
        "processing_time": "1-2 meses"
    }
}

# Embassy locations by country of residence
EMBASSIES = {
    "Cuba": "Embajada de Serbia en La Habana",
    "Rusia": "Embajada de Serbia en Moscú",
    "Egipto": "Embajada de Serbia en El Cairo",
    "default": "Consultar Embajada más cercana"
}

# Países que usan E-visa (visa electrónica, no requiere embajada)
EVISA_COUNTRIES = ["Georgia", "Armenia", "India", "Dubai"]

def get_visa_pickup_location(destination_country: str, user_residence: str) -> str:
    """Determina donde se recoge la visa según el destino"""
    if destination_country in EVISA_COUNTRIES:
        return "E-Visa (Electrónica - No requiere recogida física)"
    return EMBASSIES.get(user_residence, EMBASSIES["default"])

# ============== MODELS ==============

class Token(BaseModel):
    access_token: str
    token_type: str
    admin_id: str
    email: str
    full_name: str

class TokenData(BaseModel):
    email: Optional[str] = None
    admin_id: Optional[str] = None

class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class Admin(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    full_name: str
    is_active: bool = True
    is_superadmin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    passport_number: str
    country_of_residence: str = "Cuba"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    full_name: str
    phone: str
    passport_number: str
    country_of_residence: str = "Cuba"
    profile_image: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    email_verified: bool = False
    verification_token: Optional[str] = None
    verification_token_expires: Optional[datetime] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    country_of_residence: Optional[str] = None
    profile_image: Optional[str] = None

class VisaType(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: int
    currency: str = "EUR"
    processing_time: str
    requirements: str = ""

class Destination(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    country: str
    country_code: str
    enabled: bool = False
    image_url: str = ""
    visa_types: List[VisaType] = []
    requirements: str = ""
    message: str = "Muy pronto disponible"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DestinationCreate(BaseModel):
    country: str
    country_code: str
    enabled: bool = False
    image_url: str = ""
    requirements: str = ""
    message: str = "Muy pronto disponible"

class DestinationUpdate(BaseModel):
    country: Optional[str] = None
    enabled: Optional[bool] = None
    image_url: Optional[str] = None
    requirements: Optional[str] = None
    message: Optional[str] = None

class VisaApplication(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    user_name: str
    user_phone: str
    passport_number: str
    country_of_residence: str = "Cuba"
    destination_id: str
    destination_country: str
    visa_type_id: str
    visa_type_name: str
    price: int
    deposit_paid: int = 0
    total_paid: int = 0
    status: str = "pendiente"
    progress_step: int = 1  # 1-4: solicitud, revision, cita, aprobada
    documents: List[dict] = []
    notes: str = ""
    admin_notes: str = ""
    embassy_location: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ApplicationCreate(BaseModel):
    destination_id: str
    visa_type_id: str
    notes: Optional[str] = ""

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    progress_step: Optional[int] = None
    admin_notes: Optional[str] = None
    deposit_paid: Optional[int] = None
    total_paid: Optional[int] = None

class Testimonial(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    visa_type: str
    destination_country: str = "Serbia"
    description: str
    image_data: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class TestimonialCreate(BaseModel):
    client_name: str
    visa_type: str
    destination_country: str = "Serbia"
    description: str
    image_data: str

class DocumentInfo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    data: str

class Advisor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    whatsapp: str
    role: str = "Asesor de Visas"
    photo_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AdvisorCreate(BaseModel):
    name: str
    whatsapp: str
    role: str = "Asesor de Visas"
    photo_url: Optional[str] = None

class AdvisorUpdate(BaseModel):
    name: Optional[str] = None
    whatsapp: Optional[str] = None
    role: Optional[str] = None
    photo_url: Optional[str] = None
    is_active: Optional[bool] = None

# ============== HELPER FUNCTIONS ==============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Try bcrypt hash first
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # If hash is unrecognized, check if it's plain text (legacy)
        # This handles users created before password hashing was implemented
        if plain_password == hashed_password:
            return True
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def migrate_user_password(user_id: str, plain_password: str):
    """Migrate a user's plain text password to hashed password"""
    new_hash = get_password_hash(plain_password)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": new_hash}}
    )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_admin(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        admin_id: str = payload.get("admin_id")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email, admin_id=admin_id)
    except JWTError:
        raise credentials_exception
    
    admin = await db.admins.find_one({"email": token_data.email})
    if admin is None:
        raise credentials_exception
    if not admin.get("is_active", True):
        raise HTTPException(status_code=400, detail="Admin desactivado")
    return admin

def get_embassy_location(country: str) -> str:
    return EMBASSIES.get(country, EMBASSIES["default"])

def generate_verification_token() -> str:
    """Generate a secure random verification token"""
    return secrets.token_urlsafe(32)

async def send_verification_email(email: str, full_name: str, verification_code: str):
    """Send verification email using SendGrid"""
    if not SENDGRID_API_KEY:
        logging.warning("SendGrid API key not configured, skipping email")
        return False
    
    try:
        message = Mail(
            from_email=SENDGRID_FROM_EMAIL,
            to_emails=email,
            subject='Verifica tu cuenta - Cuban Visa Center',
            html_content=f'''
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #0a1628, #132743); padding: 30px; border-radius: 10px; text-align: center;">
                    <h1 style="color: #d4af37; margin: 0;">Cuban Visa Center</h1>
                    <p style="color: #ffffff; margin-top: 10px;">Tu puerta a nuevos destinos</p>
                </div>
                
                <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #0a1628;">¡Hola {full_name}!</h2>
                    <p style="color: #333; font-size: 16px;">
                        Gracias por registrarte en Cuban Visa Center. Para completar tu registro y poder hacer solicitudes de visa, necesitamos verificar tu correo electrónico.
                    </p>
                    
                    <div style="background: #0a1628; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
                        <p style="color: #d4af37; font-size: 14px; margin: 0 0 10px 0;">Tu código de verificación es:</p>
                        <h1 style="color: #ffffff; font-size: 36px; letter-spacing: 8px; margin: 0;">{verification_code}</h1>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        Este código expira en 24 horas. Si no solicitaste esta verificación, puedes ignorar este correo.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        © 2025 Cuban Visa Center. Todos los derechos reservados.
                    </p>
                </div>
            </div>
            '''
        )
        
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        logging.info(f"Email sent to {email}, status: {response.status_code}")
        return response.status_code == 202
    except Exception as e:
        logging.error(f"Error sending email: {e}")
        return False

# ============== ROUTES ==============

@api_router.get("/")
async def root():
    """Root endpoint with basic API info"""
    return {
        "message": "Bienvenido a Cuban-Serbia Visa API",
        "version": "2.0",
        "status": "running"
    }

@api_router.get("/health")
async def health_check():
    """
    Health check endpoint for production monitoring.
    Verifies database connectivity and returns system status.
    """
    try:
        # Test database connection
        await db.command('ping')
        db_status = "connected"
        db_name_actual = db.name
    except Exception as e:
        db_status = f"error: {str(e)}"
        db_name_actual = "unknown"
    
    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": {
            "status": db_status,
            "name": db_name_actual,
            "url_prefix": MONGO_URL[:30] + "..." if len(MONGO_URL) > 30 else MONGO_URL
        },
        "services": {
            "sendgrid": "configured" if SENDGRID_API_KEY else "not_configured",
            "jwt": "configured"
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@api_router.get("/visa-types")
async def get_visa_types():
    return VISA_TYPES

@api_router.get("/embassies")
async def get_embassies():
    return EMBASSIES

# ============== ADMIN AUTH ROUTES ==============

@api_router.post("/admin/token", response_model=Token)
async def admin_login_for_token(form_data: OAuth2PasswordRequestForm = Depends()):
    admin = await db.admins.find_one({"email": form_data.username})
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not verify_password(form_data.password, admin["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    await db.admins.update_one(
        {"id": admin["id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin["email"], "admin_id": admin["id"]},
        expires_delta=access_token_expires
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        admin_id=admin["id"],
        email=admin["email"],
        full_name=admin["full_name"]
    )

@api_router.post("/admin/login", response_model=Token)
async def admin_login(credentials: AdminLogin):
    admin = await db.admins.find_one({"email": credentials.email})
    if not admin:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    if not verify_password(credentials.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    # Update last login
    await db.admins.update_one(
        {"id": admin["id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin["email"], "admin_id": admin["id"]},
        expires_delta=access_token_expires
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        admin_id=admin["id"],
        email=admin["email"],
        full_name=admin["full_name"]
    )

@api_router.post("/admin/register")
async def admin_register(admin_data: AdminCreate, current_admin: dict = Depends(get_current_admin)):
    # Only superadmin can create new admins
    if not current_admin.get("is_superadmin", False):
        raise HTTPException(status_code=403, detail="Solo superadmin puede crear administradores")
    
    existing = await db.admins.find_one({"email": admin_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    admin = Admin(
        email=admin_data.email,
        password_hash=get_password_hash(admin_data.password),
        full_name=admin_data.full_name
    )
    await db.admins.insert_one(admin.dict())
    return {"message": "Administrador creado exitosamente", "admin_id": admin.id}

@api_router.post("/admin/init-superadmin")
async def init_superadmin(admin_data: AdminCreate):
    """
    Creates the first superadmin. Only works if no admins exist.
    """
    # Check if any admin exists
    existing_admin = await db.admins.find_one({})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Ya existe un administrador. Use el login normal.")
    
    # Create superadmin
    admin = Admin(
        email=admin_data.email,
        password_hash=get_password_hash(admin_data.password),
        full_name=admin_data.full_name,
        is_superadmin=True
    )
    await db.admins.insert_one(admin.dict())
    return {"message": "Superadmin creado exitosamente", "admin_id": admin.id}

@api_router.get("/admin/me")
async def get_current_admin_info(current_admin: dict = Depends(get_current_admin)):
    return {
        "id": current_admin["id"],
        "email": current_admin["email"],
        "full_name": current_admin["full_name"],
        "is_superadmin": current_admin.get("is_superadmin", False),
        "last_login": current_admin.get("last_login")
    }

# ============== USER AUTH ROUTES ==============

@api_router.post("/auth/register")
async def register_user(user_data: UserRegister):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Generate 6-digit verification code
    verification_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
        passport_number=user_data.passport_number,
        country_of_residence=user_data.country_of_residence,
        email_verified=False,
        verification_token=verification_code,
        verification_token_expires=datetime.utcnow() + timedelta(hours=24)
    )
    
    await db.users.insert_one(user.dict())
    
    # Send verification email
    await send_verification_email(user.email, user.full_name, verification_code)
    
    return {
        "message": "Usuario registrado. Por favor verifica tu email.",
        "requires_verification": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "passport_number": user.passport_number,
            "country_of_residence": user.country_of_residence,
            "email_verified": False,
            "embassy_location": get_embassy_location(user.country_of_residence)
        }
    }

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str

@api_router.post("/auth/verify-email")
async def verify_email(data: VerifyEmailRequest):
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.get("email_verified", False):
        return {"message": "Email ya verificado", "verified": True}
    
    # Check verification token
    stored_token = user.get("verification_token")
    token_expires = user.get("verification_token_expires")
    
    if not stored_token or stored_token != data.code:
        raise HTTPException(status_code=400, detail="Código de verificación incorrecto")
    
    if token_expires and datetime.utcnow() > token_expires:
        raise HTTPException(status_code=400, detail="El código ha expirado. Solicita uno nuevo.")
    
    # Update user as verified
    await db.users.update_one(
        {"email": data.email},
        {"$set": {"email_verified": True, "verification_token": None}}
    )
    
    return {
        "message": "Email verificado exitosamente",
        "verified": True,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "phone": user["phone"],
            "passport_number": user["passport_number"],
            "country_of_residence": user.get("country_of_residence", "Cuba"),
            "email_verified": True,
            "embassy_location": get_embassy_location(user.get("country_of_residence", "Cuba"))
        }
    }

@api_router.post("/auth/resend-verification")
async def resend_verification(email_data: dict):
    email = email_data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email requerido")
    
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.get("email_verified", False):
        return {"message": "Email ya está verificado"}
    
    # Generate new verification code
    verification_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    await db.users.update_one(
        {"email": email},
        {"$set": {
            "verification_token": verification_code,
            "verification_token_expires": datetime.utcnow() + timedelta(hours=24)
        }}
    )
    
    # Send new verification email
    await send_verification_email(email, user["full_name"], verification_code)
    
    return {"message": "Nuevo código de verificación enviado"}

@api_router.post("/auth/login")
async def login_user(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    password_valid = verify_password(credentials.password, user["password_hash"])
    
    if not password_valid:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    # Migrate plain text passwords to hashed passwords (legacy users)
    stored_password = user["password_hash"]
    if not stored_password.startswith("$2") and credentials.password == stored_password:
        # Password was plain text, migrate it to bcrypt hash
        await migrate_user_password(user["id"], credentials.password)
    
    # Check if email is verified
    email_verified = user.get("email_verified", True)  # Default to True for legacy users
    
    return {
        "message": "Login exitoso",
        "email_verified": email_verified,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "phone": user["phone"],
            "passport_number": user["passport_number"],
            "country_of_residence": user.get("country_of_residence", "Cuba"),
            "profile_image": user.get("profile_image"),
            "email_verified": email_verified,
            "embassy_location": get_embassy_location(user.get("country_of_residence", "Cuba"))
        }
    }

@api_router.get("/user/{user_id}")
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "phone": user["phone"],
        "passport_number": user["passport_number"],
        "country_of_residence": user.get("country_of_residence", "Cuba"),
        "profile_image": user.get("profile_image"),
        "email_verified": user.get("email_verified", True),
        "embassy_location": get_embassy_location(user.get("country_of_residence", "Cuba"))
    }

@api_router.put("/user/{user_id}")
async def update_user(user_id: str, update_data: UserUpdate):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    update_dict = {}
    if update_data.full_name is not None:
        update_dict["full_name"] = update_data.full_name
    if update_data.phone is not None:
        update_dict["phone"] = update_data.phone
    if update_data.country_of_residence is not None:
        update_dict["country_of_residence"] = update_data.country_of_residence
    if update_data.profile_image is not None:
        update_dict["profile_image"] = update_data.profile_image
    
    if update_dict:
        await db.users.update_one({"id": user_id}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"id": user_id})
    return {
        "id": updated_user["id"],
        "email": updated_user["email"],
        "full_name": updated_user["full_name"],
        "phone": updated_user["phone"],
        "passport_number": updated_user["passport_number"],
        "country_of_residence": updated_user.get("country_of_residence", "Cuba"),
        "profile_image": updated_user.get("profile_image"),
        "embassy_location": get_embassy_location(updated_user.get("country_of_residence", "Cuba"))
    }

# ============== DESTINATIONS ROUTES ==============

@api_router.get("/destinations")
async def get_destinations():
    destinations = await db.destinations.find().to_list(100)
    return [{k: v for k, v in d.items() if k != "_id"} for d in destinations]

@api_router.get("/destinations/{destination_id}")
async def get_destination(destination_id: str):
    destination = await db.destinations.find_one({"id": destination_id})
    if not destination:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    return {k: v for k, v in destination.items() if k != "_id"}

@api_router.get("/destinations/country/{country_code}")
async def get_destination_by_country(country_code: str):
    destination = await db.destinations.find_one({"country_code": country_code.upper()})
    if not destination:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    return {k: v for k, v in destination.items() if k != "_id"}

# Admin destination management
@api_router.post("/admin/destinations")
async def create_destination(dest_data: DestinationCreate, current_admin: dict = Depends(get_current_admin)):
    existing = await db.destinations.find_one({"country_code": dest_data.country_code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Destino ya existe")
    
    destination = Destination(
        country=dest_data.country,
        country_code=dest_data.country_code.upper(),
        enabled=dest_data.enabled,
        image_url=dest_data.image_url,
        requirements=dest_data.requirements,
        message=dest_data.message
    )
    await db.destinations.insert_one(destination.dict())
    return {"message": "Destino creado", "destination": destination.dict()}

@api_router.put("/admin/destinations/{destination_id}")
async def update_destination(destination_id: str, update_data: DestinationUpdate, current_admin: dict = Depends(get_current_admin)):
    destination = await db.destinations.find_one({"id": destination_id})
    if not destination:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    
    update_dict = {}
    if update_data.country is not None:
        update_dict["country"] = update_data.country
    if update_data.enabled is not None:
        update_dict["enabled"] = update_data.enabled
    if update_data.image_url is not None:
        update_dict["image_url"] = update_data.image_url
    if update_data.requirements is not None:
        update_dict["requirements"] = update_data.requirements
    if update_data.message is not None:
        update_dict["message"] = update_data.message
    
    if update_dict:
        await db.destinations.update_one({"id": destination_id}, {"$set": update_dict})
    
    updated = await db.destinations.find_one({"id": destination_id})
    return {k: v for k, v in updated.items() if k != "_id"}

@api_router.delete("/admin/destinations/{destination_id}")
async def delete_destination(destination_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.destinations.delete_one({"id": destination_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    return {"message": "Destino eliminado"}

# Visa types for destinations
@api_router.post("/admin/destinations/{destination_id}/visa-types")
async def add_visa_type(destination_id: str, visa_data: VisaType, current_admin: dict = Depends(get_current_admin)):
    destination = await db.destinations.find_one({"id": destination_id})
    if not destination:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    
    visa_type = VisaType(
        name=visa_data.name,
        price=visa_data.price,
        currency=visa_data.currency,
        processing_time=visa_data.processing_time,
        requirements=visa_data.requirements
    )
    
    await db.destinations.update_one(
        {"id": destination_id},
        {"$push": {"visa_types": visa_type.dict()}}
    )
    return {"message": "Tipo de visa agregado", "visa_type": visa_type.dict()}

@api_router.put("/admin/destinations/{destination_id}/visa-types/{visa_type_id}")
async def update_visa_type(destination_id: str, visa_type_id: str, visa_data: VisaType, current_admin: dict = Depends(get_current_admin)):
    destination = await db.destinations.find_one({"id": destination_id})
    if not destination:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    
    await db.destinations.update_one(
        {"id": destination_id, "visa_types.id": visa_type_id},
        {"$set": {
            "visa_types.$.name": visa_data.name,
            "visa_types.$.price": visa_data.price,
            "visa_types.$.currency": visa_data.currency,
            "visa_types.$.processing_time": visa_data.processing_time,
            "visa_types.$.requirements": visa_data.requirements
        }}
    )
    return {"message": "Tipo de visa actualizado"}

@api_router.delete("/admin/destinations/{destination_id}/visa-types/{visa_type_id}")
async def delete_visa_type(destination_id: str, visa_type_id: str, current_admin: dict = Depends(get_current_admin)):
    await db.destinations.update_one(
        {"id": destination_id},
        {"$pull": {"visa_types": {"id": visa_type_id}}}
    )
    return {"message": "Tipo de visa eliminado"}

# ============== APPLICATIONS ROUTES ==============

@api_router.post("/applications")
async def create_application(user_id: str, application_data: ApplicationCreate):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    destination = await db.destinations.find_one({"id": application_data.destination_id})
    if not destination:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    
    if not destination.get("enabled", False):
        raise HTTPException(status_code=400, detail="Este destino no está disponible aún")
    
    # Find visa type
    visa_type = None
    for vt in destination.get("visa_types", []):
        if vt["id"] == application_data.visa_type_id:
            visa_type = vt
            break
    
    if not visa_type:
        raise HTTPException(status_code=404, detail="Tipo de visa no encontrado")
    
    country_of_residence = user.get("country_of_residence", "Cuba")
    destination_country = destination["country"]
    
    # Determinar ubicación de recogida de visa
    visa_pickup = get_visa_pickup_location(destination_country, country_of_residence)
    
    application = VisaApplication(
        user_id=user_id,
        user_email=user["email"],
        user_name=user["full_name"],
        user_phone=user["phone"],
        passport_number=user["passport_number"],
        country_of_residence=country_of_residence,
        destination_id=destination["id"],
        destination_country=destination_country,
        visa_type_id=visa_type["id"],
        visa_type_name=visa_type["name"],
        price=visa_type["price"],
        embassy_location=visa_pickup,
        notes=application_data.notes or ""
    )
    
    await db.applications.insert_one(application.dict())
    
    return {
        "message": "Solicitud creada exitosamente",
        "application": application.dict()
    }

@api_router.get("/applications/user/{user_id}")
async def get_user_applications(user_id: str):
    applications = await db.applications.find({"user_id": user_id}).to_list(100)
    return [{k: v for k, v in app.items() if k != "_id"} for app in applications]

@api_router.get("/applications/{application_id}")
async def get_application(application_id: str):
    application = await db.applications.find_one({"id": application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return {k: v for k, v in application.items() if k != "_id"}

class DocumentUpload(BaseModel):
    file_name: str
    file_type: str
    file_data: str

@api_router.post("/applications/{application_id}/documents")
async def upload_document(
    application_id: str,
    user_id: str,
    doc_data: DocumentUpload
):
    application = await db.applications.find_one({"id": application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if application["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    document = DocumentInfo(
        name=doc_data.file_name,
        type=doc_data.file_type,
        data=doc_data.file_data
    )
    
    await db.applications.update_one(
        {"id": application_id},
        {
            "$push": {"documents": document.dict()},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"message": "Documento subido exitosamente", "document_id": document.id}

# Get document data for download (Admin)
@api_router.get("/admin/applications/{application_id}/documents/{document_id}")
async def admin_get_document(
    application_id: str, 
    document_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    application = await db.applications.find_one({"id": application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    documents = application.get("documents", [])
    for doc in documents:
        if doc.get("id") == document_id:
            return {
                "id": doc["id"],
                "name": doc["name"],
                "type": doc["type"],
                "data": doc.get("data", ""),
                "uploaded_at": doc.get("uploaded_at")
            }
    
    raise HTTPException(status_code=404, detail="Documento no encontrado")

# Delete document (Admin)
@api_router.delete("/admin/applications/{application_id}/documents/{document_id}")
async def admin_delete_document(
    application_id: str, 
    document_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    application = await db.applications.find_one({"id": application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    documents = application.get("documents", [])
    new_documents = [d for d in documents if d.get("id") != document_id]
    
    if len(new_documents) == len(documents):
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    await db.applications.update_one(
        {"id": application_id},
        {
            "$set": {
                "documents": new_documents,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Documento eliminado exitosamente"}

# Admin application management
@api_router.get("/admin/applications")
async def admin_get_all_applications(current_admin: dict = Depends(get_current_admin)):
    applications = await db.applications.find().sort("created_at", -1).to_list(1000)
    return [{k: v for k, v in app.items() if k != "_id"} for app in applications]

@api_router.get("/admin/applications/{application_id}")
async def admin_get_application(application_id: str, current_admin: dict = Depends(get_current_admin)):
    application = await db.applications.find_one({"id": application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return {k: v for k, v in application.items() if k != "_id"}

@api_router.put("/admin/applications/{application_id}")
async def admin_update_application(
    application_id: str,
    update_data: ApplicationUpdate,
    current_admin: dict = Depends(get_current_admin)
):
    application = await db.applications.find_one({"id": application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    update_dict = {"updated_at": datetime.utcnow()}
    if update_data.status is not None:
        update_dict["status"] = update_data.status
    if update_data.progress_step is not None:
        update_dict["progress_step"] = update_data.progress_step
    if update_data.admin_notes is not None:
        update_dict["admin_notes"] = update_data.admin_notes
    if update_data.deposit_paid is not None:
        update_dict["deposit_paid"] = update_data.deposit_paid
    if update_data.total_paid is not None:
        update_dict["total_paid"] = update_data.total_paid
    
    await db.applications.update_one(
        {"id": application_id},
        {"$set": update_dict}
    )
    
    updated = await db.applications.find_one({"id": application_id})
    return {k: v for k, v in updated.items() if k != "_id"}

@api_router.delete("/admin/applications/{application_id}")
async def admin_delete_application(application_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.applications.delete_one({"id": application_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return {"message": "Solicitud eliminada exitosamente"}

@api_router.get("/admin/stats")
async def admin_get_stats(current_admin: dict = Depends(get_current_admin)):
    total_applications = await db.applications.count_documents({})
    pending = await db.applications.count_documents({"status": "pendiente"})
    in_review = await db.applications.count_documents({"status": "revision"})
    approved = await db.applications.count_documents({"status": "aprobado"})
    rejected = await db.applications.count_documents({"status": "rechazado"})
    completed = await db.applications.count_documents({"status": "completado"})
    
    applications = await db.applications.find().to_list(1000)
    total_revenue = sum(app.get("total_paid", 0) for app in applications)
    pending_revenue = sum(app.get("price", 0) - app.get("total_paid", 0) for app in applications if app.get("status") not in ["rechazado"])
    
    total_users = await db.users.count_documents({})
    total_destinations = await db.destinations.count_documents({})
    enabled_destinations = await db.destinations.count_documents({"enabled": True})
    
    return {
        "total_applications": total_applications,
        "pending": pending,
        "in_review": in_review,
        "approved": approved,
        "rejected": rejected,
        "completed": completed,
        "total_revenue": total_revenue,
        "pending_revenue": pending_revenue,
        "total_users": total_users,
        "total_destinations": total_destinations,
        "enabled_destinations": enabled_destinations
    }

@api_router.get("/admin/users")
async def admin_get_all_users(current_admin: dict = Depends(get_current_admin)):
    users = await db.users.find().to_list(1000)
    return [{
        "id": u["id"],
        "email": u["email"],
        "full_name": u["full_name"],
        "phone": u["phone"],
        "passport_number": u["passport_number"],
        "country_of_residence": u.get("country_of_residence", "Cuba"),
        "created_at": u["created_at"],
        "is_active": u.get("is_active", True)
    } for u in users]

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_admin: dict = Depends(get_current_admin)):
    """Delete a user and all their applications (anti-spam)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Delete all user's applications first
    await db.applications.delete_many({"user_id": user_id})
    
    # Delete the user
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"message": "Usuario y sus solicitudes eliminados exitosamente"}

@api_router.put("/admin/users/{user_id}/toggle")
async def admin_toggle_user(user_id: str, current_admin: dict = Depends(get_current_admin)):
    """Toggle user active status"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    new_status = not user.get("is_active", True)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": new_status}}
    )
    return {"message": f"Usuario {'activado' if new_status else 'desactivado'}", "is_active": new_status}

# ============== TESTIMONIALS ROUTES ==============

@api_router.get("/testimonials")
async def get_testimonials():
    testimonials = await db.testimonials.find({"is_active": True}).sort("created_at", -1).to_list(50)
    return [{
        "id": t["id"],
        "client_name": t["client_name"],
        "visa_type": t["visa_type"],
        "destination_country": t.get("destination_country", "Serbia"),
        "description": t["description"],
        "image_data": t["image_data"],
        "created_at": t["created_at"]
    } for t in testimonials]

@api_router.post("/admin/testimonials")
async def admin_create_testimonial(testimonial_data: TestimonialCreate, current_admin: dict = Depends(get_current_admin)):
    testimonial = Testimonial(
        client_name=testimonial_data.client_name,
        visa_type=testimonial_data.visa_type,
        destination_country=testimonial_data.destination_country,
        description=testimonial_data.description,
        image_data=testimonial_data.image_data
    )
    await db.testimonials.insert_one(testimonial.dict())
    return {"message": "Testimonio creado exitosamente", "testimonial": testimonial.dict()}

@api_router.get("/admin/testimonials")
async def admin_get_all_testimonials(current_admin: dict = Depends(get_current_admin)):
    testimonials = await db.testimonials.find().sort("created_at", -1).to_list(100)
    return [{k: v for k, v in t.items() if k != "_id"} for t in testimonials]

@api_router.delete("/admin/testimonials/{testimonial_id}")
async def admin_delete_testimonial(testimonial_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.testimonials.delete_one({"id": testimonial_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Testimonio no encontrado")
    return {"message": "Testimonio eliminado exitosamente"}

@api_router.put("/admin/testimonials/{testimonial_id}/toggle")
async def admin_toggle_testimonial(testimonial_id: str, current_admin: dict = Depends(get_current_admin)):
    testimonial = await db.testimonials.find_one({"id": testimonial_id})
    if not testimonial:
        raise HTTPException(status_code=404, detail="Testimonio no encontrado")
    
    new_status = not testimonial.get("is_active", True)
    await db.testimonials.update_one(
        {"id": testimonial_id},
        {"$set": {"is_active": new_status}}
    )
    return {"message": f"Testimonio {'activado' if new_status else 'desactivado'}", "is_active": new_status}

# ============== ADVISORS ==============

@api_router.get("/advisors")
async def get_advisors():
    """Get all active advisors"""
    advisors = await db.advisors.find({"is_active": True}).to_list(50)
    return [{k: v for k, v in a.items() if k != "_id"} for a in advisors]

@api_router.get("/admin/advisors")
async def admin_get_all_advisors(current_admin: dict = Depends(get_current_admin)):
    """Get all advisors (admin)"""
    advisors = await db.advisors.find().sort("created_at", -1).to_list(100)
    return [{k: v for k, v in a.items() if k != "_id"} for a in advisors]

@api_router.post("/admin/advisors")
async def admin_create_advisor(advisor_data: AdvisorCreate, current_admin: dict = Depends(get_current_admin)):
    """Create a new advisor"""
    advisor = Advisor(
        name=advisor_data.name,
        whatsapp=advisor_data.whatsapp,
        role=advisor_data.role,
        photo_url=advisor_data.photo_url
    )
    await db.advisors.insert_one(advisor.dict())
    return {"message": "Asesor creado exitosamente", "advisor": advisor.dict()}

@api_router.put("/admin/advisors/{advisor_id}")
async def admin_update_advisor(advisor_id: str, advisor_data: AdvisorUpdate, current_admin: dict = Depends(get_current_admin)):
    """Update an advisor"""
    advisor = await db.advisors.find_one({"id": advisor_id})
    if not advisor:
        raise HTTPException(status_code=404, detail="Asesor no encontrado")
    
    update_dict = {k: v for k, v in advisor_data.dict().items() if v is not None}
    if update_dict:
        await db.advisors.update_one({"id": advisor_id}, {"$set": update_dict})
    
    updated = await db.advisors.find_one({"id": advisor_id})
    return {k: v for k, v in updated.items() if k != "_id"}

@api_router.delete("/admin/advisors/{advisor_id}")
async def admin_delete_advisor(advisor_id: str, current_admin: dict = Depends(get_current_admin)):
    """Delete an advisor"""
    result = await db.advisors.delete_one({"id": advisor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Asesor no encontrado")
    return {"message": "Asesor eliminado exitosamente"}

@api_router.put("/admin/advisors/{advisor_id}/toggle")
async def admin_toggle_advisor(advisor_id: str, current_admin: dict = Depends(get_current_admin)):
    """Toggle advisor active status"""
    advisor = await db.advisors.find_one({"id": advisor_id})
    if not advisor:
        raise HTTPException(status_code=404, detail="Asesor no encontrado")
    
    new_status = not advisor.get("is_active", True)
    await db.advisors.update_one(
        {"id": advisor_id},
        {"$set": {"is_active": new_status}}
    )
    return {"message": f"Asesor {'activado' if new_status else 'desactivado'}", "is_active": new_status}

# ============== ADMIN LIST ==============

@api_router.get("/admin/admins")
async def admin_get_all_admins(current_admin: dict = Depends(get_current_admin)):
    if not current_admin.get("is_superadmin", False):
        raise HTTPException(status_code=403, detail="Solo superadmin puede ver la lista de administradores")
    
    admins = await db.admins.find().to_list(100)
    return [{
        "id": a["id"],
        "email": a["email"],
        "full_name": a["full_name"],
        "is_active": a.get("is_active", True),
        "is_superadmin": a.get("is_superadmin", False),
        "last_login": a.get("last_login"),
        "created_at": a["created_at"]
    } for a in admins]

# ============== SETUP/INIT ==============

@api_router.post("/setup/init")
async def initialize_system():
    """Initialize the system with default data - run once"""
    
    # Check if already initialized
    admin_exists = await db.admins.find_one({"email": "josemgt91@gmail.com"})
    if admin_exists:
        return {"message": "Sistema ya inicializado"}
    
    # Create superadmin
    superadmin = Admin(
        email="josemgt91@gmail.com",
        password_hash=get_password_hash("Jmg910217*"),
        full_name="Jose Manuel",
        is_superadmin=True,
        is_active=True
    )
    await db.admins.insert_one(superadmin.dict())
    
    # Create default destinations
    destinations = [
        Destination(
            country="Serbia",
            country_code="RS",
            enabled=True,
            image_url="https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400",
            visa_types=[
                VisaType(name="Visado de Turismo", price=1500, processing_time="1-2 meses", requirements="Pasaporte vigente, foto carnet, formulario de solicitud").dict(),
                VisaType(name="Visado por Contrato de Trabajo", price=2500, processing_time="1-2 meses", requirements="Pasaporte vigente, contrato de trabajo, foto carnet, formulario de solicitud").dict()
            ],
            requirements="Pasaporte vigente mínimo 6 meses, foto carnet reciente, formulario de solicitud completado",
            message=""
        ),
        Destination(
            country="Armenia",
            country_code="AM",
            enabled=False,
            image_url="https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=400",
            message="Muy pronto disponible"
        ),
        Destination(
            country="Georgia",
            country_code="GE",
            enabled=False,
            image_url="https://images.unsplash.com/photo-1565008576549-57569a49371d?w=400",
            message="Muy pronto disponible"
        ),
        Destination(
            country="India",
            country_code="IN",
            enabled=False,
            image_url="https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400",
            message="Muy pronto disponible"
        ),
        Destination(
            country="Dubai",
            country_code="AE",
            enabled=False,
            image_url="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400",
            message="Muy pronto disponible"
        ),
        Destination(
            country="Egipto",
            country_code="EG",
            enabled=False,
            image_url="https://images.unsplash.com/photo-1539768942893-daf53e448371?w=400",
            message="Muy pronto disponible"
        )
    ]
    
    for dest in destinations:
        existing = await db.destinations.find_one({"country_code": dest.country_code})
        if not existing:
            await db.destinations.insert_one(dest.dict())
    
    return {
        "message": "Sistema inicializado exitosamente",
        "admin_email": "josemgt91@gmail.com",
        "destinations_created": len(destinations)
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
