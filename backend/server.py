from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime
import hashlib
import secrets
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Cuban-Serbia Visa API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBasic()

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Jmg910217*"

# Visa Types and Prices
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

# Define Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    passport_number: str

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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class VisaApplication(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    user_name: str
    user_phone: str
    passport_number: str
    visa_type: str  # 'turismo' or 'trabajo'
    visa_name: str
    price: int
    deposit_paid: int = 0  # 50% deposit
    total_paid: int = 0
    status: str = "pendiente"  # pendiente, revision, aprobado, rechazado, completado
    documents: List[dict] = []  # List of uploaded documents
    notes: str = ""
    admin_notes: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ApplicationCreate(BaseModel):
    visa_type: str
    notes: Optional[str] = ""

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None
    deposit_paid: Optional[int] = None
    total_paid: Optional[int] = None

class DocumentInfo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    data: str  # Base64 encoded file data

# Helper functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    return hash_password(password) == password_hash

def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    is_correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    is_correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de administrador incorrectas",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# Routes
@api_router.get("/")
async def root():
    return {"message": "Bienvenido a Cuban-Serbia Visa API", "version": "1.0"}

@api_router.get("/visa-types")
async def get_visa_types():
    return VISA_TYPES

# User Authentication Routes
@api_router.post("/auth/register")
async def register_user(user_data: UserRegister):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Create new user
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
        passport_number=user_data.passport_number
    )
    
    await db.users.insert_one(user.dict())
    
    return {
        "message": "Usuario registrado exitosamente",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "passport_number": user.passport_number
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
            "passport_number": user["passport_number"]
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
        "passport_number": user["passport_number"]
    }

# Visa Application Routes
@api_router.post("/applications")
async def create_application(user_id: str, application_data: ApplicationCreate):
    # Get user
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Validate visa type
    if application_data.visa_type not in VISA_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de visa inválido")
    
    visa_info = VISA_TYPES[application_data.visa_type]
    
    # Create application
    application = VisaApplication(
        user_id=user_id,
        user_email=user["email"],
        user_name=user["full_name"],
        user_phone=user["phone"],
        passport_number=user["passport_number"],
        visa_type=application_data.visa_type,
        visa_name=visa_info["name"],
        price=visa_info["price"],
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
    file_name: str = Form(...),
    file_type: str = Form(...),
    file_data: str = Form(...)  # Base64 encoded
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

# Admin Routes
@api_router.get("/admin/applications")
async def admin_get_all_applications(admin: str = Depends(verify_admin)):
    applications = await db.applications.find().sort("created_at", -1).to_list(1000)
    return [{k: v for k, v in app.items() if k != "_id"} for app in applications]

@api_router.get("/admin/applications/{application_id}")
async def admin_get_application(application_id: str, admin: str = Depends(verify_admin)):
    application = await db.applications.find_one({"id": application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return {k: v for k, v in application.items() if k != "_id"}

@api_router.put("/admin/applications/{application_id}")
async def admin_update_application(
    application_id: str,
    update_data: ApplicationUpdate,
    admin: str = Depends(verify_admin)
):
    application = await db.applications.find_one({"id": application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    update_dict = {"updated_at": datetime.utcnow()}
    if update_data.status is not None:
        update_dict["status"] = update_data.status
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
async def admin_delete_application(application_id: str, admin: str = Depends(verify_admin)):
    result = await db.applications.delete_one({"id": application_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return {"message": "Solicitud eliminada exitosamente"}

@api_router.get("/admin/stats")
async def admin_get_stats(admin: str = Depends(verify_admin)):
    total_applications = await db.applications.count_documents({})
    pending = await db.applications.count_documents({"status": "pendiente"})
    in_review = await db.applications.count_documents({"status": "revision"})
    approved = await db.applications.count_documents({"status": "aprobado"})
    rejected = await db.applications.count_documents({"status": "rechazado"})
    completed = await db.applications.count_documents({"status": "completado"})
    
    # Calculate revenue
    applications = await db.applications.find().to_list(1000)
    total_revenue = sum(app.get("total_paid", 0) for app in applications)
    pending_revenue = sum(app.get("price", 0) - app.get("total_paid", 0) for app in applications if app.get("status") not in ["rechazado"])
    
    return {
        "total_applications": total_applications,
        "pending": pending,
        "in_review": in_review,
        "approved": approved,
        "rejected": rejected,
        "completed": completed,
        "total_revenue": total_revenue,
        "pending_revenue": pending_revenue
    }

@api_router.get("/admin/users")
async def admin_get_all_users(admin: str = Depends(verify_admin)):
    users = await db.users.find().to_list(1000)
    return [{
        "id": u["id"],
        "email": u["email"],
        "full_name": u["full_name"],
        "phone": u["phone"],
        "passport_number": u["passport_number"],
        "created_at": u["created_at"]
    } for u in users]

# Testimonials / Success Stories (Clientes Satisfechos)
class Testimonial(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    visa_type: str
    description: str
    image_data: str  # Base64 encoded image
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class TestimonialCreate(BaseModel):
    client_name: str
    visa_type: str
    description: str
    image_data: str  # Base64 encoded image

# Public endpoint to get testimonials
@api_router.get("/testimonials")
async def get_testimonials():
    testimonials = await db.testimonials.find({"is_active": True}).sort("created_at", -1).to_list(50)
    return [{
        "id": t["id"],
        "client_name": t["client_name"],
        "visa_type": t["visa_type"],
        "description": t["description"],
        "image_data": t["image_data"],
        "created_at": t["created_at"]
    } for t in testimonials]

# Admin endpoints for testimonials
@api_router.post("/admin/testimonials")
async def admin_create_testimonial(testimonial_data: TestimonialCreate, admin: str = Depends(verify_admin)):
    testimonial = Testimonial(
        client_name=testimonial_data.client_name,
        visa_type=testimonial_data.visa_type,
        description=testimonial_data.description,
        image_data=testimonial_data.image_data
    )
    await db.testimonials.insert_one(testimonial.dict())
    return {"message": "Testimonio creado exitosamente", "testimonial": testimonial.dict()}

@api_router.get("/admin/testimonials")
async def admin_get_all_testimonials(admin: str = Depends(verify_admin)):
    testimonials = await db.testimonials.find().sort("created_at", -1).to_list(100)
    return [{k: v for k, v in t.items() if k != "_id"} for t in testimonials]

@api_router.delete("/admin/testimonials/{testimonial_id}")
async def admin_delete_testimonial(testimonial_id: str, admin: str = Depends(verify_admin)):
    result = await db.testimonials.delete_one({"id": testimonial_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Testimonio no encontrado")
    return {"message": "Testimonio eliminado exitosamente"}

@api_router.put("/admin/testimonials/{testimonial_id}/toggle")
async def admin_toggle_testimonial(testimonial_id: str, admin: str = Depends(verify_admin)):
    testimonial = await db.testimonials.find_one({"id": testimonial_id})
    if not testimonial:
        raise HTTPException(status_code=404, detail="Testimonio no encontrado")
    
    new_status = not testimonial.get("is_active", True)
    await db.testimonials.update_one(
        {"id": testimonial_id},
        {"$set": {"is_active": new_status}}
    )
    return {"message": f"Testimonio {'activado' if new_status else 'desactivado'}", "is_active": new_status}

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
