from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Cuban-Serbia Visa API")
api_router = APIRouter(prefix="/api")

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'cuban-serbia-visa-secret-key-2025-very-secure')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

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
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

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

# ============== ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Bienvenido a Cuban-Serbia Visa API", "version": "2.0"}

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
    
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
        passport_number=user_data.passport_number,
        country_of_residence=user_data.country_of_residence
    )
    
    await db.users.insert_one(user.dict())
    
    return {
        "message": "Usuario registrado exitosamente",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "passport_number": user.passport_number,
            "country_of_residence": user.country_of_residence,
            "embassy_location": get_embassy_location(user.country_of_residence)
        }
    }

@api_router.post("/auth/login")
async def login_user(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    return {
        "message": "Login exitoso",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "phone": user["phone"],
            "passport_number": user["passport_number"],
            "country_of_residence": user.get("country_of_residence", "Cuba"),
            "profile_image": user.get("profile_image"),
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
    
    application = VisaApplication(
        user_id=user_id,
        user_email=user["email"],
        user_name=user["full_name"],
        user_phone=user["phone"],
        passport_number=user["passport_number"],
        country_of_residence=country_of_residence,
        destination_id=destination["id"],
        destination_country=destination["country"],
        visa_type_id=visa_type["id"],
        visa_type_name=visa_type["name"],
        price=visa_type["price"],
        embassy_location=get_embassy_location(country_of_residence),
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

@api_router.post("/applications/{application_id}/documents")
async def upload_document(
    application_id: str,
    user_id: str,
    file_name: str,
    file_type: str,
    file_data: str
):
    application = await db.applications.find_one({"id": application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if application["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    document = DocumentInfo(
        name=file_name,
        type=file_type,
        data=file_data
    )
    
    await db.applications.update_one(
        {"id": application_id},
        {
            "$push": {"documents": document.dict()},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"message": "Documento subido exitosamente", "document_id": document.id}

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
        "created_at": u["created_at"]
    } for u in users]

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
