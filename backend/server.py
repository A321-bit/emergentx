from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.staticfiles import StaticFiles
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import jwt
from io import BytesIO
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'solar-panel-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI()

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# ==================== MODELS ====================

# Permission definitions
PERMISSIONS = {
    "dashboard_view": "Dashboard Görüntüleme",
    "users_view": "Kullanıcıları Görüntüleme",
    "users_manage": "Kullanıcı Ekleme/Düzenleme/Silme",
    "roles_manage": "Rol Yönetimi",
    "categories_view": "Kategorileri Görüntüleme",
    "categories_manage": "Kategori Ekleme/Düzenleme/Silme",
    "products_view": "Ürünleri Görüntüleme",
    "products_manage": "Ürün Ekleme/Düzenleme/Silme",
    "products_prices_view": "Ürün Alış Fiyatlarını Görme",
    "stock_view": "Stok Görüntüleme",
    "stock_manage": "Stok Giriş/Çıkış",
    "customers_view": "Müşterileri Görüntüleme",
    "customers_manage": "Müşteri Ekleme/Düzenleme/Silme",
    "quotes_view": "Teklifleri Görüntüleme",
    "quotes_manage": "Teklif Oluşturma/Düzenleme",
    "quotes_approve": "Teklif Onaylama/Satışa Dönüştürme",
    "dealers_view": "Bayileri Görüntüleme",
    "dealers_manage": "Bayi Ekleme/Düzenleme/Silme",
    "dealer_groups_manage": "Bayi Grubu Yönetimi",
    "finance_view": "Finans Raporları Görüntüleme",
    "finance_manage": "Satış/Gider/Muhasebe Yönetimi",
    "settings_manage": "Sistem Ayarları",
    "customer_categories_manage": "Müşteri Kategorisi Yönetimi",
    "customer_sources_manage": "Müşteri Edinme Yeri Yönetimi",
}

# Role Model
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []  # List of permission keys

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None

class Role(RoleBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_system: bool = False  # System roles cannot be deleted
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Category Models
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    default_profit_margin: float = 30

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_profit_margin: Optional[float] = None

class Category(CategoryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Customer Category Models (on-grid, off-grid, sulama etc.)
class CustomerCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CustomerCategoryCreate(CustomerCategoryBase):
    pass

class CustomerCategory(CustomerCategoryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Customer Source Models (santral, referans, lead, facebook etc.)
class CustomerSourceBase(BaseModel):
    name: str
    description: Optional[str] = None

class CustomerSourceCreate(CustomerSourceBase):
    pass

class CustomerSource(CustomerSourceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Dealer Group Models
class DealerGroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    discount_rate: float = 0

class DealerGroupCreate(DealerGroupBase):
    pass

class DealerGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    discount_rate: Optional[float] = None

class DealerGroup(DealerGroupBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role_id: str  # Reference to custom role
    phone: Optional[str] = None
    dealer_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role_id: Optional[str] = None
    is_active: Optional[bool] = None

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role_id: str
    role_name: Optional[str] = None
    permissions: List[str] = []
    phone: Optional[str] = None
    dealer_id: Optional[str] = None
    is_active: bool
    created_at: str

# Auth Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Product Models
class ProductBase(BaseModel):
    name: str
    category_id: str
    description: Optional[str] = None
    currency: str = "USD"
    purchase_price_without_vat: float
    vat_rate: float = 20
    profit_margin: Optional[float] = None
    stock_quantity: int = 0
    unit: str = "adet"

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None
    purchase_price_without_vat: Optional[float] = None
    vat_rate: Optional[float] = None
    profit_margin: Optional[float] = None
    stock_quantity: Optional[int] = None
    unit: Optional[str] = None

class Product(ProductBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    purchase_price: float = 0
    sale_price: float = 0
    images: List[str] = []  # Multiple image URLs
    datasheet_url: Optional[str] = None  # PDF datasheet
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Stock Movement Models
class StockMovement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    movement_type: str
    quantity: int
    note: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StockMovementCreate(BaseModel):
    product_id: str
    movement_type: str
    quantity: int
    note: Optional[str] = None

# Customer Models
class CustomerBase(BaseModel):
    customer_type: str = "bireysel"  # bireysel, kurumsal
    name: str
    phone: str
    email: Optional[str] = None
    # Bireysel fields
    tc_kimlik: Optional[str] = None
    # Kurumsal fields
    company_name: Optional[str] = None
    tax_number: Optional[str] = None
    tax_office: Optional[str] = None
    # Address fields
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    # Category & Source
    customer_category_id: Optional[str] = None
    customer_source_id: Optional[str] = None
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    customer_type: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    tc_kimlik: Optional[str] = None
    company_name: Optional[str] = None
    tax_number: Optional[str] = None
    tax_office: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    customer_category_id: Optional[str] = None
    customer_source_id: Optional[str] = None
    notes: Optional[str] = None

class Customer(CustomerBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str = ""
    dealer_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Quote Models
class QuoteItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    total_price: float
    datasheet_url: Optional[str] = None

class QuoteBase(BaseModel):
    customer_id: str
    customer_name: str
    items: List[QuoteItem]
    subtotal: float
    discount_rate: float = 0
    discount_amount: float = 0
    total: float
    currency: str = "TRY"
    validity_days: int = 15
    notes: Optional[str] = None

class QuoteCreate(BaseModel):
    customer_id: str
    items: List[dict]
    discount_rate: float = 0
    currency: str = "TRY"
    validity_days: int = 15
    notes: Optional[str] = None

class QuoteStatusUpdate(BaseModel):
    status: str

class Quote(QuoteBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quote_number: str = ""
    status: str = "teklif_gonderildi"
    created_by: str = ""
    created_by_name: str = ""
    dealer_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    valid_until: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Dealer Models
class DealerBase(BaseModel):
    name: str
    contact_person: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    dealer_group_id: Optional[str] = None

class DealerCreate(DealerBase):
    create_user: bool = False
    user_email: Optional[str] = None
    user_password: Optional[str] = None

class DealerUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    dealer_group_id: Optional[str] = None
    is_active: Optional[bool] = None

class Dealer(DealerBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None  # Associated user account
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Company Settings
class CompanySettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "company_settings"
    company_name: str = "Solar Enerji A.Ş."
    logo_url: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    tax_id: Optional[str] = None
    warranty_text: Optional[str] = "2 yıl garanti kapsamındadır."
    # New fields for quote PDF
    quote_cover_image: Optional[str] = None  # Teklif kapak görseli
    quote_terms: Optional[str] = None  # Teklif şartları
    bank_name: Optional[str] = None  # Banka adı
    bank_branch: Optional[str] = None  # Şube
    bank_account_holder: Optional[str] = None  # Hesap sahibi
    bank_iban: Optional[str] = None  # IBAN
    bank_swift: Optional[str] = None  # SWIFT kodu

# Exchange Rate Settings (Kur Ayarları)
class ExchangeRateSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "exchange_rate_settings"
    usd_to_try: float = 34.0  # USD/TL kuru
    eur_to_try: float = 37.0  # EUR/TL kuru
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: Optional[str] = None

# ==================== SALES & ACCOUNTING MODELS ====================

# Payment Method Options
PAYMENT_METHODS = {
    "nakit": "Nakit",
    "kart": "Kredi/Banka Kartı",
    "havale": "Havale/EFT",
    "cek": "Çek",
    "vadeli": "Vadeli",
    "diger": "Diğer"
}

# Payment Status
PAYMENT_STATUS = {
    "odendi": "Ödendi",
    "bekliyor": "Ödeme Bekliyor",
    "kismi": "Kısmi Ödeme",
    "gecikti": "Gecikmiş"
}

# Check (Çek) Model
class CheckItem(BaseModel):
    check_no: Optional[str] = None  # Çek numarası
    bank_name: Optional[str] = None  # Banka adı
    amount_tl: float  # Çek tutarı (TL)
    due_date: datetime  # Vade tarihi
    is_collected: bool = False  # Tahsil edildi mi?
    collected_date: Optional[datetime] = None  # Tahsil tarihi

# Çoklu Ödeme Detayları
class PaymentDetail(BaseModel):
    nakit_tl: float = 0  # Nakit ödeme
    kart_tl: float = 0  # Kart ile ödeme
    havale_tl: float = 0  # Havale/EFT ile ödeme
    checks: Optional[List[CheckItem]] = None  # Çekler

# Sales Model (Manuel Satış Girişi)
class SaleBase(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    sale_amount_usd: float = 0
    sale_amount_tl: float = 0
    purchase_amount_usd: float = 0
    purchase_amount_tl: float = 0
    exchange_rate: float = 1  # USD/TL kuru
    currency: str = "TRY"  # Ana para birimi
    sale_date: datetime
    notes: Optional[str] = None
    # Çoklu ödeme alanları
    nakit_tl: float = 0  # Nakit ödeme
    kart_tl: float = 0  # Kart ile ödeme
    havale_tl: float = 0  # Havale/EFT ile ödeme
    checks: Optional[List[CheckItem]] = None  # Çekler
    due_date: Optional[datetime] = None  # Genel vade tarihi (vadeli satışlar için)

class SaleCreate(SaleBase):
    pass

class Sale(SaleBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    profit_usd: float = 0
    profit_tl: float = 0
    paid_amount_tl: float = 0  # Toplam ödenen (nakit + kart + havale + tahsil edilen çekler)
    check_total_tl: float = 0  # Toplam çek tutarı
    remaining_amount_tl: float = 0  # Kalan tutar (TL)
    payment_status: str = "bekliyor"  # odendi, bekliyor, kismi, gecikti
    created_by: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Payment/Collection Model (Tahsilat Kayıtları)
class PaymentBase(BaseModel):
    sale_id: str
    amount_tl: float
    payment_method: str = "nakit"
    payment_date: datetime
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Expense Category Model (Gider Kategorileri)
class ExpenseCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_recurring: bool = False  # Sabit gider mi?

class ExpenseCategory(ExpenseCategoryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Personnel Model (Personel)
class PersonnelBase(BaseModel):
    name: str
    position: str
    salary: float
    currency: str = "TRY"
    start_date: Optional[datetime] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class Personnel(PersonnelBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Expense Model (Giderler)
class ExpenseBase(BaseModel):
    category_id: str
    category_name: Optional[str] = None
    amount: float
    currency: str = "TRY"
    exchange_rate: float = 1
    amount_tl: float = 0
    expense_date: datetime
    description: Optional[str] = None
    personnel_id: Optional[str] = None  # Personel gideri için

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_token(user_id: str, email: str, role_id: str, permissions: List[str], dealer_id: Optional[str] = None) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role_id": role_id,
        "permissions": permissions,
        "dealer_id": dealer_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Kullanıcı devre dışı")
    
    # Get role permissions
    role = await db.roles.find_one({"id": user.get("role_id")}, {"_id": 0})
    user["permissions"] = role.get("permissions", []) if role else []
    user["role_name"] = role.get("name", "") if role else ""
    
    return user

def require_permission(*perms):
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        user_perms = current_user.get("permissions", [])
        # Admin has all permissions
        if "all" in user_perms:
            return current_user
        for perm in perms:
            if perm not in user_perms:
                raise HTTPException(status_code=403, detail=f"Bu işlem için yetkiniz yok: {PERMISSIONS.get(perm, perm)}")
        return current_user
    return permission_checker

async def generate_quote_number():
    count = await db.quotes.count_documents({})
    return f"TKL-{datetime.now().strftime('%Y%m')}-{str(count + 1).zfill(4)}"

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı")
    
    stored_password = await db.user_passwords.find_one({"user_id": user["id"]}, {"_id": 0})
    if not stored_password or not verify_password(request.password, stored_password["password_hash"]):
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Hesabınız devre dışı bırakılmış")
    
    # Get role
    role = await db.roles.find_one({"id": user.get("role_id")}, {"_id": 0})
    permissions = role.get("permissions", []) if role else []
    role_name = role.get("name", "") if role else ""
    
    token = create_token(user["id"], user["email"], user.get("role_id", ""), permissions, user.get("dealer_id"))
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role_id=user.get("role_id", ""),
            role_name=role_name,
            permissions=permissions,
            phone=user.get("phone"),
            dealer_id=user.get("dealer_id"),
            is_active=user.get("is_active", True),
            created_at=user["created_at"] if isinstance(user["created_at"], str) else user["created_at"].isoformat()
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role_id=current_user.get("role_id", ""),
        role_name=current_user.get("role_name", ""),
        permissions=current_user.get("permissions", []),
        phone=current_user.get("phone"),
        dealer_id=current_user.get("dealer_id"),
        is_active=current_user.get("is_active", True),
        created_at=current_user["created_at"] if isinstance(current_user["created_at"], str) else current_user["created_at"].isoformat()
    )

# ==================== PERMISSION ROUTES ====================

@api_router.get("/permissions")
async def get_all_permissions(current_user: dict = Depends(get_current_user)):
    return [{"key": k, "label": v} for k, v in PERMISSIONS.items()]

# ==================== ROLE ROUTES ====================

@api_router.post("/roles", response_model=dict)
async def create_role(role_data: RoleCreate, current_user: dict = Depends(require_permission("roles_manage"))):
    existing = await db.roles.find_one({"name": role_data.name, "is_active": True}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Bu isimde rol zaten var")
    
    role = Role(**role_data.model_dump())
    role_dict = role.model_dump()
    role_dict["created_at"] = role_dict["created_at"].isoformat()
    
    await db.roles.insert_one(role_dict.copy())
    return role_dict

@api_router.get("/roles", response_model=List[dict])
async def get_roles(current_user: dict = Depends(get_current_user)):
    roles = await db.roles.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return roles

@api_router.get("/roles/{role_id}", response_model=dict)
async def get_role(role_id: str, current_user: dict = Depends(get_current_user)):
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Rol bulunamadı")
    return role

@api_router.put("/roles/{role_id}", response_model=dict)
async def update_role(role_id: str, role_data: RoleUpdate, current_user: dict = Depends(require_permission("roles_manage"))):
    update_dict = {k: v for k, v in role_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Güncellenecek veri yok")
    
    result = await db.roles.update_one({"id": role_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rol bulunamadı")
    
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    return role

@api_router.delete("/roles/{role_id}")
async def delete_role(role_id: str, current_user: dict = Depends(require_permission("roles_manage"))):
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Rol bulunamadı")
    if role.get("is_system"):
        raise HTTPException(status_code=400, detail="Sistem rolleri silinemez")
    
    # Check if role has users
    user_count = await db.users.count_documents({"role_id": role_id})
    if user_count > 0:
        raise HTTPException(status_code=400, detail=f"Bu rolde {user_count} kullanıcı var, önce kullanıcıları başka role atayın")
    
    result = await db.roles.update_one({"id": role_id}, {"$set": {"is_active": False}})
    return {"message": "Rol silindi"}

# ==================== USER ROUTES ====================

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_permission("users_manage"))):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")
    
    # Verify role exists
    role = await db.roles.find_one({"id": user_data.role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=400, detail="Geçersiz rol")
    
    user = User(**user_data.model_dump(exclude={"password"}))
    user_dict = user.model_dump()
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict.copy())
    await db.user_passwords.insert_one({
        "user_id": user.id,
        "password_hash": hash_password(user_data.password)
    })
    
    return UserResponse(**{**user_dict, "role_name": role["name"], "permissions": role.get("permissions", [])})

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_permission("users_view"))):
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    roles = {r["id"]: r for r in await db.roles.find({}, {"_id": 0}).to_list(100)}
    
    result = []
    for u in users:
        role = roles.get(u.get("role_id", ""), {})
        result.append(UserResponse(
            id=u["id"],
            email=u["email"],
            name=u["name"],
            role_id=u.get("role_id", ""),
            role_name=role.get("name", ""),
            permissions=role.get("permissions", []),
            phone=u.get("phone"),
            dealer_id=u.get("dealer_id"),
            is_active=u.get("is_active", True),
            created_at=u["created_at"] if isinstance(u["created_at"], str) else u["created_at"].isoformat()
        ))
    return result

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate, current_user: dict = Depends(require_permission("users_manage"))):
    update_dict = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Güncellenecek veri yok")
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    role = await db.roles.find_one({"id": user.get("role_id", "")}, {"_id": 0}) or {}
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role_id=user.get("role_id", ""),
        role_name=role.get("name", ""),
        permissions=role.get("permissions", []),
        phone=user.get("phone"),
        dealer_id=user.get("dealer_id"),
        is_active=user.get("is_active", True),
        created_at=user["created_at"] if isinstance(user["created_at"], str) else user["created_at"].isoformat()
    )

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_permission("users_manage"))):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Kendinizi silemezsiniz")
    
    result = await db.users.delete_one({"id": user_id})
    await db.user_passwords.delete_one({"user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return {"message": "Kullanıcı silindi"}

# ==================== CUSTOMER CATEGORY ROUTES ====================

@api_router.post("/customer-categories", response_model=dict)
async def create_customer_category(data: CustomerCategoryCreate, current_user: dict = Depends(require_permission("customer_categories_manage"))):
    existing = await db.customer_categories.find_one({"name": data.name, "is_active": True}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Bu isimde kategori zaten var")
    
    category = CustomerCategory(**data.model_dump())
    cat_dict = category.model_dump()
    cat_dict["created_at"] = cat_dict["created_at"].isoformat()
    
    await db.customer_categories.insert_one(cat_dict.copy())
    return cat_dict

@api_router.get("/customer-categories", response_model=List[dict])
async def get_customer_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.customer_categories.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return categories

@api_router.delete("/customer-categories/{category_id}")
async def delete_customer_category(category_id: str, current_user: dict = Depends(require_permission("customer_categories_manage"))):
    result = await db.customer_categories.update_one({"id": category_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    return {"message": "Kategori silindi"}

# ==================== CUSTOMER SOURCE ROUTES ====================

@api_router.post("/customer-sources", response_model=dict)
async def create_customer_source(data: CustomerSourceCreate, current_user: dict = Depends(require_permission("customer_sources_manage"))):
    existing = await db.customer_sources.find_one({"name": data.name, "is_active": True}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Bu isimde kaynak zaten var")
    
    source = CustomerSource(**data.model_dump())
    source_dict = source.model_dump()
    source_dict["created_at"] = source_dict["created_at"].isoformat()
    
    await db.customer_sources.insert_one(source_dict.copy())
    return source_dict

@api_router.get("/customer-sources", response_model=List[dict])
async def get_customer_sources(current_user: dict = Depends(get_current_user)):
    sources = await db.customer_sources.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return sources

@api_router.delete("/customer-sources/{source_id}")
async def delete_customer_source(source_id: str, current_user: dict = Depends(require_permission("customer_sources_manage"))):
    result = await db.customer_sources.update_one({"id": source_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kaynak bulunamadı")
    return {"message": "Kaynak silindi"}

# ==================== CATEGORY ROUTES ====================

@api_router.post("/categories", response_model=dict)
async def create_category(category_data: CategoryCreate, current_user: dict = Depends(require_permission("categories_manage"))):
    existing = await db.categories.find_one({"name": category_data.name, "is_active": True}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Bu isimde kategori zaten var")
    
    category = Category(**category_data.model_dump())
    category_dict = category.model_dump()
    category_dict["created_at"] = category_dict["created_at"].isoformat()
    
    await db.categories.insert_one(category_dict.copy())
    return category_dict

@api_router.get("/categories", response_model=List[dict])
async def get_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.categories.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return categories

@api_router.put("/categories/{category_id}", response_model=dict)
async def update_category(category_id: str, category_data: CategoryUpdate, current_user: dict = Depends(require_permission("categories_manage"))):
    update_dict = {k: v for k, v in category_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Güncellenecek veri yok")
    
    result = await db.categories.update_one({"id": category_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return category

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(require_permission("categories_manage"))):
    product_count = await db.products.count_documents({"category_id": category_id, "is_active": True})
    if product_count > 0:
        raise HTTPException(status_code=400, detail=f"Bu kategoride {product_count} ürün var")
    
    result = await db.categories.update_one({"id": category_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    return {"message": "Kategori silindi"}

# ==================== DEALER GROUP ROUTES ====================

@api_router.post("/dealer-groups", response_model=dict)
async def create_dealer_group(group_data: DealerGroupCreate, current_user: dict = Depends(require_permission("dealer_groups_manage"))):
    existing = await db.dealer_groups.find_one({"name": group_data.name, "is_active": True}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Bu isimde bayi grubu zaten var")
    
    group = DealerGroup(**group_data.model_dump())
    group_dict = group.model_dump()
    group_dict["created_at"] = group_dict["created_at"].isoformat()
    
    await db.dealer_groups.insert_one(group_dict.copy())
    return group_dict

@api_router.get("/dealer-groups", response_model=List[dict])
async def get_dealer_groups(current_user: dict = Depends(get_current_user)):
    groups = await db.dealer_groups.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return groups

@api_router.put("/dealer-groups/{group_id}", response_model=dict)
async def update_dealer_group(group_id: str, group_data: DealerGroupUpdate, current_user: dict = Depends(require_permission("dealer_groups_manage"))):
    update_dict = {k: v for k, v in group_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Güncellenecek veri yok")
    
    result = await db.dealer_groups.update_one({"id": group_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bayi grubu bulunamadı")
    
    group = await db.dealer_groups.find_one({"id": group_id}, {"_id": 0})
    return group

@api_router.delete("/dealer-groups/{group_id}")
async def delete_dealer_group(group_id: str, current_user: dict = Depends(require_permission("dealer_groups_manage"))):
    dealer_count = await db.dealers.count_documents({"dealer_group_id": group_id, "is_active": True})
    if dealer_count > 0:
        raise HTTPException(status_code=400, detail=f"Bu grupta {dealer_count} bayi var")
    
    result = await db.dealer_groups.update_one({"id": group_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bayi grubu bulunamadı")
    return {"message": "Bayi grubu silindi"}

# ==================== PRODUCT ROUTES ====================

async def calculate_product_prices(product_data: dict, category: dict = None):
    purchase_without_vat = product_data.get("purchase_price_without_vat", 0)
    vat_rate = product_data.get("vat_rate", 20)
    
    purchase_price = purchase_without_vat * (1 + vat_rate / 100)
    
    profit_margin = product_data.get("profit_margin")
    if profit_margin is None and category:
        profit_margin = category.get("default_profit_margin", 30)
    elif profit_margin is None:
        profit_margin = 30
    
    sale_price = purchase_price * (1 + profit_margin / 100)
    
    return {
        "purchase_price": round(purchase_price, 2),
        "sale_price": round(sale_price, 2),
        "profit_margin": profit_margin
    }

@api_router.post("/products", response_model=dict)
async def create_product(product_data: ProductCreate, current_user: dict = Depends(require_permission("products_manage"))):
    category = await db.categories.find_one({"id": product_data.category_id, "is_active": True}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    product_dict = product_data.model_dump()
    prices = await calculate_product_prices(product_dict, category)
    product_dict.update(prices)
    
    product_dict["id"] = str(uuid.uuid4())
    product_dict["images"] = []
    product_dict["datasheet_url"] = None
    product_dict["is_active"] = True
    product_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    product_dict["category_name"] = category["name"]
    
    await db.products.insert_one(product_dict.copy())
    return product_dict

@api_router.post("/products/{product_id}/upload-images")
async def upload_product_images(product_id: str, files: List[UploadFile] = File(...), current_user: dict = Depends(require_permission("products_manage"))):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    uploaded_urls = []
    
    for file in files:
        if file.content_type not in allowed_types:
            continue
        
        file_ext = file.filename.split(".")[-1].lower()
        filename = f"product_{product_id}_{uuid.uuid4()}.{file_ext}"
        file_path = UPLOAD_DIR / filename
        
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        uploaded_urls.append(f"/uploads/{filename}")
    
    # Add to existing images
    existing_images = product.get("images", [])
    all_images = existing_images + uploaded_urls
    
    await db.products.update_one({"id": product_id}, {"$set": {"images": all_images}})
    
    return {"images": all_images}

@api_router.post("/products/{product_id}/upload-datasheet")
async def upload_product_datasheet(product_id: str, file: UploadFile = File(...), current_user: dict = Depends(require_permission("products_manage"))):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Sadece PDF dosyası yüklenebilir")
    
    filename = f"datasheet_{product_id}_{uuid.uuid4()}.pdf"
    file_path = UPLOAD_DIR / filename
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    datasheet_url = f"/uploads/{filename}"
    await db.products.update_one({"id": product_id}, {"$set": {"datasheet_url": datasheet_url}})
    
    return {"datasheet_url": datasheet_url}

@api_router.delete("/products/{product_id}/images/{image_index}")
async def delete_product_image(product_id: str, image_index: int, current_user: dict = Depends(require_permission("products_manage"))):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    images = product.get("images", [])
    if 0 <= image_index < len(images):
        images.pop(image_index)
        await db.products.update_one({"id": product_id}, {"$set": {"images": images}})
    
    return {"images": images}

@api_router.get("/products", response_model=List[dict])
async def get_products(current_user: dict = Depends(get_current_user)):
    products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    categories = {c["id"]: c for c in await db.categories.find({"is_active": True}, {"_id": 0}).to_list(100)}
    
    dealer_discount = 0
    if current_user.get("dealer_id"):
        dealer = await db.dealers.find_one({"id": current_user["dealer_id"]}, {"_id": 0})
        if dealer and dealer.get("dealer_group_id"):
            group = await db.dealer_groups.find_one({"id": dealer["dealer_group_id"]}, {"_id": 0})
            if group:
                dealer_discount = group.get("discount_rate", 0)
    
    # Check if user can view purchase prices
    can_view_prices = "products_prices_view" in current_user.get("permissions", []) or "all" in current_user.get("permissions", [])
    
    for p in products:
        cat = categories.get(p.get("category_id"))
        p["category_name"] = cat["name"] if cat else "Bilinmiyor"
        
        purchase_price = p.get("purchase_price", 0)
        p["dealer_price"] = round(purchase_price * (1 + dealer_discount / 100), 2)
        
        # Hide purchase prices if no permission
        if not can_view_prices:
            p["purchase_price_without_vat"] = None
            p["purchase_price"] = None
    
    return products

@api_router.get("/products/{product_id}", response_model=dict)
async def get_product(product_id: str, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    if product.get("category_id"):
        category = await db.categories.find_one({"id": product["category_id"]}, {"_id": 0})
        product["category_name"] = category["name"] if category else "Bilinmiyor"
    
    return product

@api_router.put("/products/{product_id}", response_model=dict)
async def update_product(product_id: str, product_data: ProductUpdate, current_user: dict = Depends(require_permission("products_manage"))):
    update_dict = {k: v for k, v in product_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Güncellenecek veri yok")
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    merged = {**product, **update_dict}
    
    category = None
    category_id = update_dict.get("category_id", product.get("category_id"))
    if category_id:
        category = await db.categories.find_one({"id": category_id}, {"_id": 0})
        if category:
            update_dict["category_name"] = category["name"]
    
    if any(k in update_dict for k in ["purchase_price_without_vat", "vat_rate", "profit_margin", "category_id"]):
        prices = await calculate_product_prices(merged, category)
        update_dict.update(prices)
    
    await db.products.update_one({"id": product_id}, {"$set": update_dict})
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    return product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(require_permission("products_manage"))):
    result = await db.products.update_one({"id": product_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    return {"message": "Ürün silindi"}

# ==================== EXCEL IMPORT/EXPORT ROUTES ====================

@api_router.get("/products/export/excel")
async def export_products_excel(current_user: dict = Depends(require_permission("products_view"))):
    """Export all products to Excel file"""
    products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(10000)
    categories = {c["id"]: c["name"] for c in await db.categories.find({"is_active": True}, {"_id": 0}).to_list(100)}
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Ürünler"
    
    # Header styling
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="F59E0B", end_color="F59E0B", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )
    
    # Headers
    headers = ["Ürün Adı", "Kategori", "Para Birimi", "Alış Fiyatı (KDV Hariç)", "KDV %", 
               "Kar Marjı %", "Maliyet", "Satış Fiyatı", "Stok", "Birim", "Açıklama"]
    
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
        cell.border = thin_border
    
    # Data rows
    for row, product in enumerate(products, 2):
        ws.cell(row=row, column=1, value=product.get("name", "")).border = thin_border
        ws.cell(row=row, column=2, value=categories.get(product.get("category_id"), "")).border = thin_border
        ws.cell(row=row, column=3, value=product.get("currency", "USD")).border = thin_border
        ws.cell(row=row, column=4, value=product.get("purchase_price_without_vat", 0)).border = thin_border
        ws.cell(row=row, column=5, value=product.get("vat_rate", 20)).border = thin_border
        ws.cell(row=row, column=6, value=product.get("profit_margin", 30)).border = thin_border
        ws.cell(row=row, column=7, value=product.get("purchase_price", 0)).border = thin_border
        ws.cell(row=row, column=8, value=product.get("sale_price", 0)).border = thin_border
        ws.cell(row=row, column=9, value=product.get("stock_quantity", 0)).border = thin_border
        ws.cell(row=row, column=10, value=product.get("unit", "adet")).border = thin_border
        ws.cell(row=row, column=11, value=product.get("description", "")).border = thin_border
    
    # Auto-adjust column widths
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        ws.column_dimensions[column].width = min(max_length + 2, 50)
    
    # Save to BytesIO
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"urunler_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/products/export/template")
async def export_products_template(current_user: dict = Depends(require_permission("products_manage"))):
    """Download Excel template for product import"""
    categories = await db.categories.find({"is_active": True}, {"_id": 0}).to_list(100)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Ürün Şablonu"
    
    # Header styling
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="10B981", end_color="10B981", fill_type="solid")
    note_fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
    
    # Headers (required fields marked with *)
    headers = ["Ürün Adı *", "Kategori *", "Para Birimi", "Alış Fiyatı (KDV Hariç) *", 
               "KDV %", "Kar Marjı %", "Stok", "Birim", "Açıklama"]
    
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
    
    # Example row
    example_data = ["Örnek Solar Panel 400W", categories[0]["name"] if categories else "Panel", 
                    "USD", 100, 20, 30, 50, "adet", "Açıklama buraya"]
    for col, value in enumerate(example_data, 1):
        cell = ws.cell(row=2, column=col, value=value)
        cell.fill = note_fill
    
    # Notes sheet
    ws_notes = wb.create_sheet("Notlar")
    ws_notes["A1"] = "KULLANIM TALİMATLARI"
    ws_notes["A1"].font = Font(bold=True, size=14)
    
    notes = [
        "",
        "1. 'Ürün Şablonu' sayfasındaki sarı örnek satırı silin",
        "2. Ürünlerinizi ekleyin (* işaretli alanlar zorunludur)",
        "3. Dosyayı kaydedin ve sisteme yükleyin",
        "",
        "ALAN AÇIKLAMALARI:",
        "- Ürün Adı: Ürünün tam adı (zorunlu)",
        "- Kategori: Aşağıdaki listeden seçin (zorunlu)",
        "- Para Birimi: USD, EUR veya TRY (varsayılan: USD)",
        "- Alış Fiyatı: KDV hariç alış fiyatı (zorunlu)",
        "- KDV %: KDV oranı (varsayılan: 20)",
        "- Kar Marjı %: Kar oranı (boş bırakılırsa kategori marjı kullanılır)",
        "- Stok: Başlangıç stok miktarı (varsayılan: 0)",
        "- Birim: adet, paket, kutu vb. (varsayılan: adet)",
        "",
        "MEVCUT KATEGORİLER:"
    ]
    
    for i, note in enumerate(notes, 2):
        ws_notes.cell(row=i, column=1, value=note)
    
    # List categories
    for i, cat in enumerate(categories, len(notes) + 2):
        ws_notes.cell(row=i, column=1, value=f"  • {cat['name']} (Kar Marjı: %{cat.get('default_profit_margin', 30)})")
    
    ws_notes.column_dimensions["A"].width = 60
    
    # Auto-adjust main sheet columns
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        ws.column_dimensions[column].width = max_length + 4
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=urun_sablonu.xlsx"}
    )

@api_router.post("/products/import/excel")
async def import_products_excel(file: UploadFile = File(...), current_user: dict = Depends(require_permission("products_manage"))):
    """Import products from Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Sadece Excel dosyası (.xlsx, .xls) yüklenebilir")
    
    content = await file.read()
    
    try:
        wb = load_workbook(BytesIO(content))
        ws = wb.active
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Excel dosyası okunamadı: {str(e)}")
    
    # Get categories for mapping
    categories = await db.categories.find({"is_active": True}, {"_id": 0}).to_list(100)
    category_map = {c["name"].lower(): c for c in categories}
    
    imported = 0
    errors = []
    
    # Skip header row
    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
        if not row or not row[0]:  # Skip empty rows
            continue
        
        try:
            name = str(row[0]).strip() if row[0] else None
            category_name = str(row[1]).strip().lower() if row[1] else None
            currency = str(row[2]).strip().upper() if row[2] else "USD"
            purchase_price_without_vat = float(row[3]) if row[3] else None
            vat_rate = float(row[4]) if row[4] else 20
            profit_margin = float(row[5]) if row[5] else None
            stock_quantity = int(row[6]) if row[6] else 0
            unit = str(row[7]).strip() if row[7] else "adet"
            description = str(row[8]).strip() if len(row) > 8 and row[8] else None
            
            # Validations
            if not name:
                errors.append(f"Satır {row_num}: Ürün adı boş")
                continue
            
            if not category_name or category_name not in category_map:
                errors.append(f"Satır {row_num}: Geçersiz kategori '{row[1]}'")
                continue
            
            if purchase_price_without_vat is None or purchase_price_without_vat < 0:
                errors.append(f"Satır {row_num}: Geçersiz alış fiyatı")
                continue
            
            if currency not in ["USD", "EUR", "TRY"]:
                currency = "USD"
            
            category = category_map[category_name]
            
            # Calculate prices
            if profit_margin is None:
                profit_margin = category.get("default_profit_margin", 30)
            
            purchase_price = purchase_price_without_vat * (1 + vat_rate / 100)
            sale_price = purchase_price * (1 + profit_margin / 100)
            
            # Create product
            product_dict = {
                "id": str(uuid.uuid4()),
                "name": name,
                "category_id": category["id"],
                "category_name": category["name"],
                "description": description,
                "currency": currency,
                "purchase_price_without_vat": round(purchase_price_without_vat, 2),
                "vat_rate": vat_rate,
                "profit_margin": profit_margin,
                "purchase_price": round(purchase_price, 2),
                "sale_price": round(sale_price, 2),
                "stock_quantity": stock_quantity,
                "unit": unit,
                "images": [],
                "datasheet_url": None,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.products.insert_one(product_dict.copy())
            imported += 1
            
        except Exception as e:
            errors.append(f"Satır {row_num}: {str(e)}")
    
    return {
        "message": f"{imported} ürün başarıyla eklendi",
        "imported": imported,
        "errors": errors[:20] if errors else [],  # Limit errors to first 20
        "total_errors": len(errors)
    }

# ==================== STOCK MOVEMENT ROUTES ====================

@api_router.post("/stock-movements", response_model=dict)
async def create_stock_movement(movement_data: StockMovementCreate, current_user: dict = Depends(require_permission("stock_manage"))):
    product = await db.products.find_one({"id": movement_data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    movement = StockMovement(
        **movement_data.model_dump(),
        created_by=current_user["id"]
    )
    movement_dict = movement.model_dump()
    movement_dict["created_at"] = movement_dict["created_at"].isoformat()
    
    await db.stock_movements.insert_one(movement_dict.copy())
    
    quantity_change = movement_data.quantity if movement_data.movement_type == "giris" else -movement_data.quantity
    new_stock = product["stock_quantity"] + quantity_change
    if new_stock < 0:
        raise HTTPException(status_code=400, detail="Yetersiz stok")
    
    await db.products.update_one(
        {"id": movement_data.product_id},
        {"$set": {"stock_quantity": new_stock}}
    )
    
    return movement_dict

@api_router.get("/stock-movements", response_model=List[dict])
async def get_stock_movements(product_id: Optional[str] = None, current_user: dict = Depends(require_permission("stock_view"))):
    query = {}
    if product_id:
        query["product_id"] = product_id
    movements = await db.stock_movements.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return movements

# ==================== CUSTOMER ROUTES ====================

@api_router.post("/customers", response_model=dict)
async def create_customer(customer_data: CustomerCreate, current_user: dict = Depends(require_permission("customers_manage"))):
    customer = Customer(
        **customer_data.model_dump(),
        created_by=current_user["id"],
        dealer_id=current_user.get("dealer_id")
    )
    customer_dict = customer.model_dump()
    customer_dict["created_at"] = customer_dict["created_at"].isoformat()
    
    await db.customers.insert_one(customer_dict.copy())
    return customer_dict

@api_router.get("/customers", response_model=List[dict])
async def get_customers(current_user: dict = Depends(require_permission("customers_view"))):
    query = {"is_active": True}
    
    # Filter based on permissions
    user_perms = current_user.get("permissions", [])
    if "all" not in user_perms:
        if current_user.get("dealer_id"):
            query["dealer_id"] = current_user["dealer_id"]
    
    customers = await db.customers.find(query, {"_id": 0}).to_list(1000)
    
    # Add category and source names
    categories = {c["id"]: c["name"] for c in await db.customer_categories.find({"is_active": True}, {"_id": 0}).to_list(100)}
    sources = {s["id"]: s["name"] for s in await db.customer_sources.find({"is_active": True}, {"_id": 0}).to_list(100)}
    
    for c in customers:
        c["category_name"] = categories.get(c.get("customer_category_id"), "")
        c["source_name"] = sources.get(c.get("customer_source_id"), "")
    
    return customers

@api_router.get("/customers/{customer_id}", response_model=dict)
async def get_customer(customer_id: str, current_user: dict = Depends(require_permission("customers_view"))):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    return customer

@api_router.put("/customers/{customer_id}", response_model=dict)
async def update_customer(customer_id: str, customer_data: CustomerUpdate, current_user: dict = Depends(require_permission("customers_manage"))):
    update_dict = {k: v for k, v in customer_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Güncellenecek veri yok")
    
    result = await db.customers.update_one({"id": customer_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    return customer

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(require_permission("customers_manage"))):
    result = await db.customers.update_one({"id": customer_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    return {"message": "Müşteri silindi"}

# ==================== QUOTE ROUTES ====================

@api_router.post("/quotes", response_model=dict)
async def create_quote(quote_data: QuoteCreate, current_user: dict = Depends(require_permission("quotes_manage"))):
    customer = await db.customers.find_one({"id": quote_data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    dealer_discount = 0
    if current_user.get("dealer_id"):
        dealer = await db.dealers.find_one({"id": current_user["dealer_id"]}, {"_id": 0})
        if dealer and dealer.get("dealer_group_id"):
            group = await db.dealer_groups.find_one({"id": dealer["dealer_group_id"]}, {"_id": 0})
            if group:
                dealer_discount = group.get("discount_rate", 0)
    
    items = []
    subtotal = 0
    
    for item in quote_data.items:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Ürün bulunamadı: {item['product_id']}")
        
        unit_price = product["sale_price"]
        if dealer_discount > 0:
            unit_price = product["purchase_price"] * (1 + dealer_discount / 100)
        
        total_price = unit_price * item["quantity"]
        
        items.append(QuoteItem(
            product_id=product["id"],
            product_name=product["name"],
            quantity=item["quantity"],
            unit_price=unit_price,
            total_price=total_price,
            datasheet_url=product.get("datasheet_url")
        ))
        subtotal += total_price
    
    discount_amount = subtotal * (quote_data.discount_rate / 100)
    total = subtotal - discount_amount
    
    quote_number = await generate_quote_number()
    
    quote_dict = {
        "id": str(uuid.uuid4()),
        "quote_number": quote_number,
        "customer_id": quote_data.customer_id,
        "customer_name": customer["name"],
        "items": [item.model_dump() for item in items],
        "subtotal": subtotal,
        "discount_rate": quote_data.discount_rate,
        "discount_amount": discount_amount,
        "total": total,
        "currency": quote_data.currency,
        "validity_days": quote_data.validity_days,
        "notes": quote_data.notes,
        "status": "teklif_gonderildi",
        "created_by": current_user["id"],
        "created_by_name": current_user["name"],
        "dealer_id": current_user.get("dealer_id"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "valid_until": (datetime.now(timezone.utc) + timedelta(days=quote_data.validity_days)).isoformat()
    }
    
    await db.quotes.insert_one(quote_dict.copy())
    return quote_dict

@api_router.get("/quotes", response_model=List[dict])
async def get_quotes(status: Optional[str] = None, current_user: dict = Depends(require_permission("quotes_view"))):
    query = {"is_active": True}
    
    if status:
        query["status"] = status
    
    user_perms = current_user.get("permissions", [])
    if "all" not in user_perms:
        if current_user.get("dealer_id"):
            query["dealer_id"] = current_user["dealer_id"]
    
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return quotes

@api_router.get("/quotes/{quote_id}", response_model=dict)
async def get_quote(quote_id: str, current_user: dict = Depends(require_permission("quotes_view"))):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    return quote

@api_router.put("/quotes/{quote_id}/status", response_model=dict)
async def update_quote_status(quote_id: str, status_data: QuoteStatusUpdate, current_user: dict = Depends(require_permission("quotes_approve"))):
    valid_statuses = ["teklif_gonderildi", "onaylandi", "satisa_dondu", "iptal"]
    if status_data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Geçersiz durum")
    
    result = await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {"status": status_data.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    return quote

@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, current_user: dict = Depends(require_permission("quotes_manage"))):
    result = await db.quotes.update_one({"id": quote_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    return {"message": "Teklif silindi"}

# ==================== DEALER ROUTES ====================

@api_router.post("/dealers", response_model=dict)
async def create_dealer(dealer_data: DealerCreate, current_user: dict = Depends(require_permission("dealers_manage"))):
    dealer_dict = dealer_data.model_dump(exclude={"create_user", "user_email", "user_password"})
    dealer_dict["id"] = str(uuid.uuid4())
    dealer_dict["is_active"] = True
    dealer_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    dealer_dict["user_id"] = None
    
    # Create user for dealer if requested
    if dealer_data.create_user and dealer_data.user_email and dealer_data.user_password:
        # Check if email exists
        existing_user = await db.users.find_one({"email": dealer_data.user_email}, {"_id": 0})
        if existing_user:
            raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")
        
        # Get dealer role
        dealer_role = await db.roles.find_one({"name": "Bayi", "is_active": True}, {"_id": 0})
        if not dealer_role:
            raise HTTPException(status_code=400, detail="Bayi rolü bulunamadı")
        
        user_id = str(uuid.uuid4())
        user_dict = {
            "id": user_id,
            "email": dealer_data.user_email,
            "name": dealer_data.contact_person,
            "role_id": dealer_role["id"],
            "phone": dealer_data.phone,
            "dealer_id": dealer_dict["id"],
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(user_dict.copy())
        await db.user_passwords.insert_one({
            "user_id": user_id,
            "password_hash": hash_password(dealer_data.user_password)
        })
        
        dealer_dict["user_id"] = user_id
    
    await db.dealers.insert_one(dealer_dict.copy())
    return dealer_dict

@api_router.get("/dealers", response_model=List[dict])
async def get_dealers(current_user: dict = Depends(require_permission("dealers_view"))):
    dealers = await db.dealers.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    # Add group info
    groups = {g["id"]: g for g in await db.dealer_groups.find({"is_active": True}, {"_id": 0}).to_list(100)}
    
    for d in dealers:
        group = groups.get(d.get("dealer_group_id"))
        d["group_name"] = group["name"] if group else None
        d["discount_rate"] = group["discount_rate"] if group else 0
    
    return dealers

@api_router.get("/dealers/{dealer_id}", response_model=dict)
async def get_dealer(dealer_id: str, current_user: dict = Depends(require_permission("dealers_view"))):
    dealer = await db.dealers.find_one({"id": dealer_id}, {"_id": 0})
    if not dealer:
        raise HTTPException(status_code=404, detail="Bayi bulunamadı")
    return dealer

@api_router.put("/dealers/{dealer_id}", response_model=dict)
async def update_dealer(dealer_id: str, dealer_data: DealerUpdate, current_user: dict = Depends(require_permission("dealers_manage"))):
    update_dict = {k: v for k, v in dealer_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Güncellenecek veri yok")
    
    result = await db.dealers.update_one({"id": dealer_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bayi bulunamadı")
    
    dealer = await db.dealers.find_one({"id": dealer_id}, {"_id": 0})
    return dealer

@api_router.delete("/dealers/{dealer_id}")
async def delete_dealer(dealer_id: str, current_user: dict = Depends(require_permission("dealers_manage"))):
    result = await db.dealers.update_one({"id": dealer_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bayi bulunamadı")
    return {"message": "Bayi silindi"}

# ==================== COMPANY SETTINGS ROUTES ====================

@api_router.get("/settings/company", response_model=dict)
async def get_company_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.company_settings.find_one({"id": "company_settings"}, {"_id": 0})
    if not settings:
        default_settings = CompanySettings()
        settings = default_settings.model_dump()
        await db.company_settings.insert_one(settings.copy())
    return settings

@api_router.put("/settings/company", response_model=dict)
async def update_company_settings(settings_data: dict, current_user: dict = Depends(require_permission("settings_manage"))):
    await db.company_settings.update_one(
        {"id": "company_settings"},
        {"$set": settings_data},
        upsert=True
    )
    settings = await db.company_settings.find_one({"id": "company_settings"}, {"_id": 0})
    return settings

@api_router.post("/settings/upload-logo")
async def upload_logo(file: UploadFile = File(...), current_user: dict = Depends(require_permission("settings_manage"))):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Sadece resim dosyası yüklenebilir")
    
    file_ext = file.filename.split(".")[-1]
    filename = f"logo_{uuid.uuid4()}.{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    logo_url = f"/uploads/{filename}"
    
    await db.company_settings.update_one(
        {"id": "company_settings"},
        {"$set": {"logo_url": logo_url}},
        upsert=True
    )
    
    return {"logo_url": logo_url}

@api_router.post("/settings/upload-quote-cover")
async def upload_quote_cover(file: UploadFile = File(...), current_user: dict = Depends(require_permission("settings_manage"))):
    """Upload cover image for quote PDF (A4 size recommended: 2480x3508 px)"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Sadece resim dosyası yüklenebilir")
    
    file_ext = file.filename.split(".")[-1]
    filename = f"quote_cover_{uuid.uuid4()}.{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    cover_url = f"/uploads/{filename}"
    
    await db.company_settings.update_one(
        {"id": "company_settings"},
        {"$set": {"quote_cover_image": cover_url}},
        upsert=True
    )
    
    return {"quote_cover_image": cover_url}

# ==================== EXCHANGE RATE ROUTES ====================

@api_router.get("/settings/exchange-rates")
async def get_exchange_rates():
    settings = await db.exchange_rate_settings.find_one({"id": "exchange_rate_settings"}, {"_id": 0})
    if not settings:
        settings = ExchangeRateSettings().model_dump()
        settings["last_updated"] = settings["last_updated"].isoformat()
    else:
        if settings.get("last_updated"):
            settings["last_updated"] = settings["last_updated"].isoformat() if isinstance(settings["last_updated"], datetime) else settings["last_updated"]
    return settings

@api_router.put("/settings/exchange-rates")
async def update_exchange_rates(
    usd_to_try: float = Form(...),
    eur_to_try: float = Form(...),
    current_user: dict = Depends(require_permission("settings_manage"))
):
    update_data = {
        "id": "exchange_rate_settings",
        "usd_to_try": usd_to_try,
        "eur_to_try": eur_to_try,
        "last_updated": datetime.now(timezone.utc),
        "updated_by": current_user.get("email", "")
    }
    
    await db.exchange_rate_settings.update_one(
        {"id": "exchange_rate_settings"},
        {"$set": update_data},
        upsert=True
    )
    
    result = await db.exchange_rate_settings.find_one({"id": "exchange_rate_settings"}, {"_id": 0})
    if result.get("last_updated"):
        result["last_updated"] = result["last_updated"].isoformat() if isinstance(result["last_updated"], datetime) else result["last_updated"]
    return result

# ==================== DASHBOARD STATS ROUTES ====================

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(require_permission("dashboard_view"))):
    quote_query = {"is_active": True}
    customer_query = {"is_active": True}
    
    user_perms = current_user.get("permissions", [])
    if "all" not in user_perms:
        if current_user.get("dealer_id"):
            quote_query["dealer_id"] = current_user["dealer_id"]
            customer_query["dealer_id"] = current_user["dealer_id"]
    
    # Get exchange rates
    exchange_settings = await db.exchange_rate_settings.find_one({"id": "exchange_rate_settings"}, {"_id": 0})
    usd_rate = exchange_settings.get("usd_to_try", 34.0) if exchange_settings else 34.0
    eur_rate = exchange_settings.get("eur_to_try", 37.0) if exchange_settings else 37.0
    
    # Basic counts
    total_products = await db.products.count_documents({"is_active": True})
    total_customers = await db.customers.count_documents(customer_query)
    total_quotes = await db.quotes.count_documents(quote_query)
    total_dealers = await db.dealers.count_documents({"is_active": True})
    total_users = await db.users.count_documents({})
    
    # Quotes analysis
    quotes = await db.quotes.find(quote_query, {"_id": 0}).to_list(10000)
    
    total_quote_revenue = sum(q.get("total", 0) for q in quotes if q.get("status") == "satisa_dondu")
    pending_quotes = len([q for q in quotes if q.get("status") == "teklif_gonderildi"])
    approved_quotes = len([q for q in quotes if q.get("status") == "onaylandi"])
    converted_quotes = len([q for q in quotes if q.get("status") == "satisa_dondu"])
    rejected_quotes = len([q for q in quotes if q.get("status") == "reddedildi"])
    draft_quotes = len([q for q in quotes if q.get("status") == "taslak"])
    
    # Sales analysis (manuel satışlar)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    sales = await db.sales.find({"is_active": True}, {"_id": 0}).to_list(10000)
    
    total_sale_revenue_tl = sum(s.get("sale_amount_tl", 0) for s in sales)
    total_sale_cost_tl = sum(s.get("purchase_amount_tl", 0) for s in sales)
    total_sale_profit_tl = total_sale_revenue_tl - total_sale_cost_tl
    
    # Daily revenue
    daily_revenue_tl = sum(s.get("sale_amount_tl", 0) for s in sales 
        if s.get("sale_date") and datetime.fromisoformat(s["sale_date"].replace("Z", "+00:00")) >= today_start)
    
    # Stock value calculation
    stock_value_usd = 0
    stock_value_tl = 0
    stock_sale_value_usd = 0
    stock_sale_value_tl = 0
    
    if "all" in user_perms or "finance_view" in user_perms:
        products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(10000)
        
        for p in products:
            currency = p.get("currency", "USD").upper()
            purchase_price = p.get("purchase_price", 0)
            sale_price = p.get("sale_price", 0)
            quantity = p.get("stock_quantity", 0)
            
            if currency == "USD":
                stock_value_usd += purchase_price * quantity
                stock_sale_value_usd += sale_price * quantity
            elif currency == "EUR":
                stock_value_usd += (purchase_price * eur_rate / usd_rate) * quantity
                stock_sale_value_usd += (sale_price * eur_rate / usd_rate) * quantity
            else:  # TRY
                stock_value_tl += purchase_price * quantity
                stock_sale_value_tl += sale_price * quantity
        
        stock_value_tl += stock_value_usd * usd_rate
        stock_sale_value_tl += stock_sale_value_usd * usd_rate
    
    # Dealer revenue calculation
    dealer_total_revenue = 0
    dealer_sales = [q for q in quotes if q.get("dealer_id") and q.get("status") == "satisa_dondu"]
    dealer_total_revenue = sum(q.get("total", 0) for q in dealer_sales)
    
    # Upcoming payments (satışlardan kalan ödemeler)
    upcoming_payments_total = sum(s.get("remaining_amount_tl", 0) for s in sales 
        if s.get("remaining_amount_tl", 0) > 0)
    
    # Upcoming checks (tahsil edilmemiş çekler)
    upcoming_checks_total = 0
    overdue_checks_total = 0
    upcoming_checks_count = 0
    overdue_checks_count = 0
    
    for sale in sales:
        checks = sale.get("checks")
        if checks and isinstance(checks, list):
            for check in checks:
                if not check.get("is_collected"):
                    amount = check.get("amount_tl", 0)
                    due_date_str = check.get("due_date")
                    if due_date_str:
                        try:
                            due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
                            if due_date < now:
                                overdue_checks_total += amount
                                overdue_checks_count += 1
                            else:
                                upcoming_checks_total += amount
                                upcoming_checks_count += 1
                        except:
                            upcoming_checks_total += amount
                            upcoming_checks_count += 1
    
    # Profit margin calculation
    profit_margin = 0
    if total_sale_revenue_tl > 0:
        profit_margin = (total_sale_profit_tl / total_sale_revenue_tl) * 100
    
    return {
        # Counts
        "total_products": total_products,
        "total_customers": total_customers,
        "total_quotes": total_quotes,
        "total_dealers": total_dealers,
        "total_users": total_users,
        
        # Quote statuses
        "pending_quotes": pending_quotes,
        "approved_quotes": approved_quotes,
        "converted_quotes": converted_quotes,
        "rejected_quotes": rejected_quotes,
        "draft_quotes": draft_quotes,
        
        # Revenue & Costs
        "total_quote_revenue": round(total_quote_revenue, 2),
        "total_sale_revenue_tl": round(total_sale_revenue_tl, 2),
        "total_sale_cost_tl": round(total_sale_cost_tl, 2),
        "total_sale_profit_tl": round(total_sale_profit_tl, 2),
        "profit_margin": round(profit_margin, 1),
        "daily_revenue_tl": round(daily_revenue_tl, 2),
        
        # Stock values
        "stock_value_usd": round(stock_value_usd, 2),
        "stock_value_tl": round(stock_value_tl, 2),
        "stock_sale_value_usd": round(stock_sale_value_usd, 2),
        "stock_sale_value_tl": round(stock_sale_value_tl, 2),
        
        # Dealer info
        "dealer_total_revenue": round(dealer_total_revenue, 2),
        "dealer_sales_count": len(dealer_sales),
        
        # Upcoming payments & collections
        "upcoming_payments_total": round(upcoming_payments_total, 2),
        "upcoming_checks_total": round(upcoming_checks_total, 2),
        "upcoming_checks_count": upcoming_checks_count,
        "overdue_checks_total": round(overdue_checks_total, 2),
        "overdue_checks_count": overdue_checks_count,
        
        # Exchange rates
        "exchange_rate_usd": usd_rate,
        "exchange_rate_eur": eur_rate
    }

@api_router.get("/stats/sales-by-user")
async def get_sales_by_user(current_user: dict = Depends(require_permission("finance_view"))):
    pipeline = [
        {"$match": {"status": "satisa_dondu", "is_active": True}},
        {"$group": {
            "_id": "$created_by_name",
            "total_sales": {"$sum": "$total"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"total_sales": -1}}
    ]
    results = await db.quotes.aggregate(pipeline).to_list(100)
    return [{"name": r["_id"], "total_sales": r["total_sales"], "count": r["count"]} for r in results]

@api_router.get("/stats/sales-by-dealer")
async def get_sales_by_dealer(current_user: dict = Depends(require_permission("finance_view"))):
    pipeline = [
        {"$match": {"status": "satisa_dondu", "is_active": True, "dealer_id": {"$ne": None}}},
        {"$group": {
            "_id": "$dealer_id",
            "total_sales": {"$sum": "$total"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"total_sales": -1}}
    ]
    results = await db.quotes.aggregate(pipeline).to_list(100)
    
    for r in results:
        dealer = await db.dealers.find_one({"id": r["_id"]}, {"_id": 0})
        r["dealer_name"] = dealer["name"] if dealer else "Bilinmeyen"
    
    return [{"dealer_id": r["_id"], "dealer_name": r["dealer_name"], "total_sales": r["total_sales"], "count": r["count"]} for r in results]

# ==================== SALES ROUTES (Satışlar) ====================

@api_router.get("/sales")
async def get_sales(current_user: dict = Depends(require_permission("finance_view"))):
    sales = await db.sales.find({"is_active": True}, {"_id": 0}).sort("sale_date", -1).to_list(1000)
    return sales

@api_router.post("/sales")
async def create_sale(sale: SaleCreate, current_user: dict = Depends(require_permission("finance_manage"))):
    sale_dict = sale.model_dump()
    sale_dict["id"] = str(uuid.uuid4())
    sale_dict["created_by"] = current_user.get("id", current_user.get("email", ""))
    sale_dict["is_active"] = True
    sale_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    sale_dict["sale_date"] = sale_dict["sale_date"].isoformat() if isinstance(sale_dict["sale_date"], datetime) else sale_dict["sale_date"]
    if sale_dict.get("due_date"):
        sale_dict["due_date"] = sale_dict["due_date"].isoformat() if isinstance(sale_dict["due_date"], datetime) else sale_dict["due_date"]
    
    # Process checks
    check_total = 0
    collected_check_total = 0
    if sale_dict.get("checks"):
        processed_checks = []
        for check in sale_dict["checks"]:
            check_data = {
                "id": str(uuid.uuid4()),
                "check_no": check.get("check_no"),
                "bank_name": check.get("bank_name"),
                "amount_tl": check.get("amount_tl", 0),
                "due_date": check["due_date"].isoformat() if isinstance(check.get("due_date"), datetime) else check.get("due_date"),
                "is_collected": check.get("is_collected", False),
                "collected_date": check["collected_date"].isoformat() if isinstance(check.get("collected_date"), datetime) else check.get("collected_date") if check.get("collected_date") else None
            }
            check_total += check_data["amount_tl"]
            if check_data["is_collected"]:
                collected_check_total += check_data["amount_tl"]
            processed_checks.append(check_data)
        sale_dict["checks"] = processed_checks
    
    sale_dict["check_total_tl"] = check_total
    
    # Calculate profits
    sale_dict["profit_usd"] = sale_dict["sale_amount_usd"] - sale_dict["purchase_amount_usd"]
    sale_dict["profit_tl"] = sale_dict["sale_amount_tl"] - sale_dict["purchase_amount_tl"]
    
    # Calculate paid amount (nakit + kart + havale + tahsil edilen çekler)
    nakit = sale_dict.get("nakit_tl", 0)
    kart = sale_dict.get("kart_tl", 0)
    havale = sale_dict.get("havale_tl", 0)
    sale_dict["paid_amount_tl"] = nakit + kart + havale + collected_check_total
    
    # Calculate remaining amount
    total = sale_dict.get("sale_amount_tl", 0)
    total_payments = nakit + kart + havale + check_total  # Tüm ödemeler (çekler dahil)
    sale_dict["remaining_amount_tl"] = total - total_payments
    
    # Determine payment status
    if sale_dict["remaining_amount_tl"] <= 0:
        if collected_check_total >= check_total:
            sale_dict["payment_status"] = "odendi"
        else:
            sale_dict["payment_status"] = "kismi"  # Çekler henüz tahsil edilmedi
    elif total_payments > 0:
        sale_dict["payment_status"] = "kismi"
    else:
        sale_dict["payment_status"] = "bekliyor"
    
    await db.sales.insert_one(sale_dict.copy())
    sale_dict.pop("_id", None)
    return sale_dict

@api_router.put("/sales/{sale_id}")
async def update_sale(sale_id: str, sale: SaleCreate, current_user: dict = Depends(require_permission("finance_manage"))):
    sale_dict = sale.model_dump()
    sale_dict["sale_date"] = sale_dict["sale_date"].isoformat() if isinstance(sale_dict["sale_date"], datetime) else sale_dict["sale_date"]
    if sale_dict.get("due_date"):
        sale_dict["due_date"] = sale_dict["due_date"].isoformat() if isinstance(sale_dict["due_date"], datetime) else sale_dict["due_date"]
    
    # Process checks
    check_total = 0
    collected_check_total = 0
    if sale_dict.get("checks"):
        processed_checks = []
        for check in sale_dict["checks"]:
            check_data = {
                "id": check.get("id") or str(uuid.uuid4()),
                "check_no": check.get("check_no"),
                "bank_name": check.get("bank_name"),
                "amount_tl": check.get("amount_tl", 0),
                "due_date": check["due_date"].isoformat() if isinstance(check.get("due_date"), datetime) else check.get("due_date"),
                "is_collected": check.get("is_collected", False),
                "collected_date": check["collected_date"].isoformat() if isinstance(check.get("collected_date"), datetime) else check.get("collected_date") if check.get("collected_date") else None
            }
            check_total += check_data["amount_tl"]
            if check_data["is_collected"]:
                collected_check_total += check_data["amount_tl"]
            processed_checks.append(check_data)
        sale_dict["checks"] = processed_checks
    
    sale_dict["check_total_tl"] = check_total
    
    sale_dict["profit_usd"] = sale_dict["sale_amount_usd"] - sale_dict["purchase_amount_usd"]
    sale_dict["profit_tl"] = sale_dict["sale_amount_tl"] - sale_dict["purchase_amount_tl"]
    
    # Calculate paid amount
    nakit = sale_dict.get("nakit_tl", 0)
    kart = sale_dict.get("kart_tl", 0)
    havale = sale_dict.get("havale_tl", 0)
    sale_dict["paid_amount_tl"] = nakit + kart + havale + collected_check_total
    
    # Calculate remaining amount
    total = sale_dict.get("sale_amount_tl", 0)
    total_payments = nakit + kart + havale + check_total
    sale_dict["remaining_amount_tl"] = total - total_payments
    
    # Determine payment status
    if sale_dict["remaining_amount_tl"] <= 0:
        if collected_check_total >= check_total:
            sale_dict["payment_status"] = "odendi"
        else:
            sale_dict["payment_status"] = "kismi"
    elif total_payments > 0:
        sale_dict["payment_status"] = "kismi"
    else:
        sale_dict["payment_status"] = "bekliyor"
    
    result = await db.sales.update_one({"id": sale_id}, {"$set": sale_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Satış bulunamadı")
    return {"message": "Satış güncellendi"}

@api_router.delete("/sales/{sale_id}")
async def delete_sale(sale_id: str, current_user: dict = Depends(require_permission("finance_manage"))):
    result = await db.sales.update_one({"id": sale_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Satış bulunamadı")
    return {"message": "Satış silindi"}

@api_router.get("/sales/stats")
async def get_sales_stats(current_user: dict = Depends(require_permission("finance_view"))):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    year_start = today_start.replace(month=1, day=1)
    
    sales = await db.sales.find({"is_active": True}, {"_id": 0}).to_list(10000)
    
    stats = {
        "daily": {"sale_tl": 0, "sale_usd": 0, "profit_tl": 0, "profit_usd": 0, "count": 0},
        "weekly": {"sale_tl": 0, "sale_usd": 0, "profit_tl": 0, "profit_usd": 0, "count": 0},
        "monthly": {"sale_tl": 0, "sale_usd": 0, "profit_tl": 0, "profit_usd": 0, "count": 0},
        "yearly": {"sale_tl": 0, "sale_usd": 0, "profit_tl": 0, "profit_usd": 0, "count": 0},
        "total": {"sale_tl": 0, "sale_usd": 0, "profit_tl": 0, "profit_usd": 0, "count": 0}
    }
    
    for sale in sales:
        sale_date = datetime.fromisoformat(sale["sale_date"].replace("Z", "+00:00")) if isinstance(sale["sale_date"], str) else sale["sale_date"]
        
        # Total
        stats["total"]["sale_tl"] += sale.get("sale_amount_tl", 0)
        stats["total"]["sale_usd"] += sale.get("sale_amount_usd", 0)
        stats["total"]["profit_tl"] += sale.get("profit_tl", 0)
        stats["total"]["profit_usd"] += sale.get("profit_usd", 0)
        stats["total"]["count"] += 1
        
        # Yearly
        if sale_date >= year_start:
            stats["yearly"]["sale_tl"] += sale.get("sale_amount_tl", 0)
            stats["yearly"]["sale_usd"] += sale.get("sale_amount_usd", 0)
            stats["yearly"]["profit_tl"] += sale.get("profit_tl", 0)
            stats["yearly"]["profit_usd"] += sale.get("profit_usd", 0)
            stats["yearly"]["count"] += 1
        
        # Monthly
        if sale_date >= month_start:
            stats["monthly"]["sale_tl"] += sale.get("sale_amount_tl", 0)
            stats["monthly"]["sale_usd"] += sale.get("sale_amount_usd", 0)
            stats["monthly"]["profit_tl"] += sale.get("profit_tl", 0)
            stats["monthly"]["profit_usd"] += sale.get("profit_usd", 0)
            stats["monthly"]["count"] += 1
        
        # Weekly
        if sale_date >= week_start:
            stats["weekly"]["sale_tl"] += sale.get("sale_amount_tl", 0)
            stats["weekly"]["sale_usd"] += sale.get("sale_amount_usd", 0)
            stats["weekly"]["profit_tl"] += sale.get("profit_tl", 0)
            stats["weekly"]["profit_usd"] += sale.get("profit_usd", 0)
            stats["weekly"]["count"] += 1
        
        # Daily
        if sale_date >= today_start:
            stats["daily"]["sale_tl"] += sale.get("sale_amount_tl", 0)
            stats["daily"]["sale_usd"] += sale.get("sale_amount_usd", 0)
            stats["daily"]["profit_tl"] += sale.get("profit_tl", 0)
            stats["daily"]["profit_usd"] += sale.get("profit_usd", 0)
            stats["daily"]["count"] += 1
    
    return stats

# ==================== PAYMENT/COLLECTION ROUTES ====================

@api_router.get("/sales/{sale_id}/payments")
async def get_sale_payments(sale_id: str, current_user: dict = Depends(require_permission("finance_view"))):
    payments = await db.payments.find({"sale_id": sale_id, "is_active": True}, {"_id": 0}).sort("payment_date", -1).to_list(100)
    return payments

@api_router.post("/sales/{sale_id}/payments")
async def add_payment(sale_id: str, payment: PaymentCreate, current_user: dict = Depends(require_permission("finance_manage"))):
    # Get sale
    sale = await db.sales.find_one({"id": sale_id, "is_active": True}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Satış bulunamadı")
    
    # Create payment
    payment_dict = payment.model_dump()
    payment_dict["id"] = str(uuid.uuid4())
    payment_dict["sale_id"] = sale_id
    payment_dict["created_by"] = current_user.get("id", current_user.get("email", ""))
    payment_dict["is_active"] = True
    payment_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    payment_dict["payment_date"] = payment_dict["payment_date"].isoformat() if isinstance(payment_dict["payment_date"], datetime) else payment_dict["payment_date"]
    
    await db.payments.insert_one(payment_dict.copy())
    
    # Update sale's paid amount
    all_payments = await db.payments.find({"sale_id": sale_id, "is_active": True}, {"_id": 0}).to_list(100)
    total_paid = sum(p.get("amount_tl", 0) for p in all_payments)
    total_sale = sale.get("sale_amount_tl", 0)
    remaining = total_sale - total_paid
    
    if total_paid >= total_sale:
        status = "odendi"
    elif total_paid > 0:
        status = "kismi"
    else:
        status = "bekliyor"
    
    await db.sales.update_one(
        {"id": sale_id},
        {"$set": {"paid_amount_tl": total_paid, "remaining_amount_tl": remaining, "payment_status": status}}
    )
    
    payment_dict.pop("_id", None)
    return payment_dict

@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, current_user: dict = Depends(require_permission("finance_manage"))):
    # Get payment to find sale_id
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Tahsilat bulunamadı")
    
    sale_id = payment.get("sale_id")
    
    # Soft delete payment
    await db.payments.update_one({"id": payment_id}, {"$set": {"is_active": False}})
    
    # Recalculate sale totals
    if sale_id:
        sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
        if sale:
            all_payments = await db.payments.find({"sale_id": sale_id, "is_active": True}, {"_id": 0}).to_list(100)
            total_paid = sum(p.get("amount_tl", 0) for p in all_payments)
            total_sale = sale.get("sale_amount_tl", 0)
            remaining = total_sale - total_paid
            
            if total_paid >= total_sale:
                status = "odendi"
            elif total_paid > 0:
                status = "kismi"
            else:
                status = "bekliyor"
            
            await db.sales.update_one(
                {"id": sale_id},
                {"$set": {"paid_amount_tl": total_paid, "remaining_amount_tl": remaining, "payment_status": status}}
            )
    
    return {"message": "Tahsilat silindi"}

@api_router.get("/sales/upcoming-payments")
async def get_upcoming_payments(current_user: dict = Depends(require_permission("finance_view"))):
    """Get sales with upcoming due dates or overdue payments"""
    now = datetime.now(timezone.utc)
    
    # Get all sales with remaining amount > 0
    sales = await db.sales.find({
        "is_active": True,
        "remaining_amount_tl": {"$gt": 0}
    }, {"_id": 0}).to_list(1000)
    
    upcoming = []
    overdue = []
    
    for sale in sales:
        due_date_str = sale.get("due_date")
        if due_date_str:
            try:
                due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00")) if isinstance(due_date_str, str) else due_date_str
                days_until_due = (due_date - now).days
                
                sale_info = {
                    "id": sale["id"],
                    "customer_name": sale.get("customer_name", ""),
                    "sale_amount_tl": sale.get("sale_amount_tl", 0),
                    "remaining_amount_tl": sale.get("remaining_amount_tl", 0),
                    "due_date": due_date_str,
                    "days_until_due": days_until_due,
                    "payment_status": sale.get("payment_status", "bekliyor")
                }
                
                if days_until_due < 0:
                    sale_info["is_overdue"] = True
                    overdue.append(sale_info)
                elif days_until_due <= 7:  # Due within 7 days
                    sale_info["is_overdue"] = False
                    upcoming.append(sale_info)
            except:
                pass
        else:
            # No due date but has remaining - add to upcoming
            if sale.get("remaining_amount_tl", 0) > 0:
                upcoming.append({
                    "id": sale["id"],
                    "customer_name": sale.get("customer_name", ""),
                    "sale_amount_tl": sale.get("sale_amount_tl", 0),
                    "remaining_amount_tl": sale.get("remaining_amount_tl", 0),
                    "due_date": None,
                    "days_until_due": None,
                    "is_overdue": False,
                    "payment_status": sale.get("payment_status", "bekliyor")
                })
    
    # Sort by days until due
    overdue.sort(key=lambda x: x["days_until_due"])
    upcoming.sort(key=lambda x: x["days_until_due"] if x["days_until_due"] is not None else 999)
    
    return {
        "overdue": overdue,
        "upcoming": upcoming[:10],  # Top 10 upcoming
        "total_overdue_amount": sum(s["remaining_amount_tl"] for s in overdue),
        "total_upcoming_amount": sum(s["remaining_amount_tl"] for s in upcoming)
    }

@api_router.get("/payment-methods")
async def get_payment_methods():
    """Get available payment methods"""
    return PAYMENT_METHODS

# ==================== CHECK (ÇEK) ROUTES ====================

@api_router.put("/sales/{sale_id}/checks/{check_id}/collect")
async def collect_check(sale_id: str, check_id: str, current_user: dict = Depends(require_permission("finance_manage"))):
    """Mark a check as collected"""
    sale = await db.sales.find_one({"id": sale_id, "is_active": True}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Satış bulunamadı")
    
    checks = sale.get("checks", [])
    check_found = False
    collected_amount = 0
    
    for check in checks:
        if check.get("id") == check_id:
            check["is_collected"] = True
            check["collected_date"] = datetime.now(timezone.utc).isoformat()
            check_found = True
            collected_amount = check.get("amount_tl", 0)
            break
    
    if not check_found:
        raise HTTPException(status_code=404, detail="Çek bulunamadı")
    
    # Update paid amount
    new_paid = sale.get("paid_amount_tl", 0) + collected_amount
    total = sale.get("sale_amount_tl", 0)
    remaining = total - new_paid
    
    status = "bekliyor"
    if new_paid >= total:
        status = "odendi"
    elif new_paid > 0:
        status = "kismi"
    
    await db.sales.update_one(
        {"id": sale_id},
        {"$set": {
            "checks": checks,
            "paid_amount_tl": new_paid,
            "remaining_amount_tl": remaining,
            "payment_status": status
        }}
    )
    
    return {"message": "Çek tahsil edildi", "collected_amount": collected_amount}

@api_router.get("/checks/upcoming")
async def get_upcoming_checks(current_user: dict = Depends(require_permission("finance_view"))):
    """Get all uncollected checks with their due dates"""
    now = datetime.now(timezone.utc)
    
    # Çekleri olan tüm satışları getir (payment_method kontrolü kaldırıldı)
    sales = await db.sales.find({
        "is_active": True,
        "checks": {"$exists": True, "$ne": [], "$ne": None}
    }, {"_id": 0}).to_list(1000)
    
    upcoming_checks = []
    overdue_checks = []
    
    for sale in sales:
        checks = sale.get("checks")
        if not checks or not isinstance(checks, list):
            continue
            
        for check in checks:
            if check.get("is_collected"):
                continue
            
            due_date_str = check.get("due_date")
            if due_date_str:
                try:
                    due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00")) if isinstance(due_date_str, str) else due_date_str
                    days_until_due = (due_date - now).days
                    
                    check_info = {
                        "sale_id": sale["id"],
                        "check_id": check.get("id"),
                        "customer_name": sale.get("customer_name", ""),
                        "check_no": check.get("check_no"),
                        "bank_name": check.get("bank_name"),
                        "amount_tl": check.get("amount_tl", 0),
                        "due_date": due_date_str,
                        "days_until_due": days_until_due
                    }
                    
                    if days_until_due < 0:
                        check_info["is_overdue"] = True
                        overdue_checks.append(check_info)
                    else:
                        check_info["is_overdue"] = False
                        upcoming_checks.append(check_info)
                except:
                    pass
    
    # Sort by due date
    overdue_checks.sort(key=lambda x: x["days_until_due"])
    upcoming_checks.sort(key=lambda x: x["days_until_due"])
    
    return {
        "overdue": overdue_checks,
        "upcoming": upcoming_checks,
        "total_overdue_amount": sum(c["amount_tl"] for c in overdue_checks),
        "total_upcoming_amount": sum(c["amount_tl"] for c in upcoming_checks)
    }

# ==================== EXPENSE CATEGORIES ROUTES ====================

@api_router.get("/expense-categories")
async def get_expense_categories(current_user: dict = Depends(require_permission("finance_view"))):
    categories = await db.expense_categories.find({"is_active": True}, {"_id": 0}).to_list(100)
    return categories

@api_router.post("/expense-categories")
async def create_expense_category(category: ExpenseCategoryBase, current_user: dict = Depends(require_permission("finance_manage"))):
    cat_dict = category.model_dump()
    cat_dict["id"] = str(uuid.uuid4())
    cat_dict["is_active"] = True
    cat_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.expense_categories.insert_one(cat_dict.copy())
    return cat_dict

@api_router.delete("/expense-categories/{category_id}")
async def delete_expense_category(category_id: str, current_user: dict = Depends(require_permission("finance_manage"))):
    result = await db.expense_categories.update_one({"id": category_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    return {"message": "Kategori silindi"}

# ==================== PERSONNEL ROUTES ====================

@api_router.get("/personnel")
async def get_personnel(current_user: dict = Depends(require_permission("finance_view"))):
    personnel = await db.personnel.find({"is_active": True}, {"_id": 0}).to_list(100)
    return personnel

@api_router.post("/personnel")
async def create_personnel(person: PersonnelBase, current_user: dict = Depends(require_permission("finance_manage"))):
    person_dict = person.model_dump()
    person_dict["id"] = str(uuid.uuid4())
    person_dict["is_active"] = True
    person_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    if person_dict.get("start_date"):
        person_dict["start_date"] = person_dict["start_date"].isoformat() if isinstance(person_dict["start_date"], datetime) else person_dict["start_date"]
    await db.personnel.insert_one(person_dict.copy())
    return person_dict

@api_router.put("/personnel/{person_id}")
async def update_personnel(person_id: str, person: PersonnelBase, current_user: dict = Depends(require_permission("finance_manage"))):
    person_dict = person.model_dump()
    if person_dict.get("start_date"):
        person_dict["start_date"] = person_dict["start_date"].isoformat() if isinstance(person_dict["start_date"], datetime) else person_dict["start_date"]
    result = await db.personnel.update_one({"id": person_id}, {"$set": person_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    return {"message": "Personel güncellendi"}

@api_router.delete("/personnel/{person_id}")
async def delete_personnel(person_id: str, current_user: dict = Depends(require_permission("finance_manage"))):
    result = await db.personnel.update_one({"id": person_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    return {"message": "Personel silindi"}

# ==================== EXPENSES ROUTES ====================

@api_router.get("/expenses")
async def get_expenses(month: Optional[int] = None, year: Optional[int] = None, current_user: dict = Depends(require_permission("finance_view"))):
    query = {"is_active": True}
    expenses = await db.expenses.find(query, {"_id": 0}).sort("expense_date", -1).to_list(1000)
    
    # Filter by month/year if provided
    if month and year:
        filtered = []
        for exp in expenses:
            exp_date = datetime.fromisoformat(exp["expense_date"].replace("Z", "+00:00")) if isinstance(exp["expense_date"], str) else exp["expense_date"]
            if exp_date.month == month and exp_date.year == year:
                filtered.append(exp)
        return filtered
    
    return expenses

@api_router.post("/expenses")
async def create_expense(expense: ExpenseCreate, current_user: dict = Depends(require_permission("finance_manage"))):
    exp_dict = expense.model_dump()
    exp_dict["id"] = str(uuid.uuid4())
    exp_dict["created_by"] = current_user["user_id"]
    exp_dict["is_active"] = True
    exp_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    exp_dict["expense_date"] = exp_dict["expense_date"].isoformat() if isinstance(exp_dict["expense_date"], datetime) else exp_dict["expense_date"]
    
    # Get category name
    if expense.category_id:
        cat = await db.expense_categories.find_one({"id": expense.category_id}, {"_id": 0})
        exp_dict["category_name"] = cat["name"] if cat else "Bilinmiyor"
    
    # Calculate TL amount
    if exp_dict["currency"] == "USD":
        exp_dict["amount_tl"] = exp_dict["amount"] * exp_dict["exchange_rate"]
    else:
        exp_dict["amount_tl"] = exp_dict["amount"]
    
    await db.expenses.insert_one(exp_dict.copy())
    return exp_dict

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(require_permission("finance_manage"))):
    result = await db.expenses.update_one({"id": expense_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Gider bulunamadı")
    return {"message": "Gider silindi"}

@api_router.get("/expenses/stats")
async def get_expense_stats(current_user: dict = Depends(require_permission("finance_view"))):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    expenses = await db.expenses.find({"is_active": True}, {"_id": 0}).to_list(10000)
    
    monthly_total = 0
    yearly_total = 0
    by_category = {}
    
    for exp in expenses:
        exp_date = datetime.fromisoformat(exp["expense_date"].replace("Z", "+00:00")) if isinstance(exp["expense_date"], str) else exp["expense_date"]
        amount_tl = exp.get("amount_tl", exp.get("amount", 0))
        
        if exp_date >= year_start:
            yearly_total += amount_tl
        
        if exp_date >= month_start:
            monthly_total += amount_tl
            cat_name = exp.get("category_name", "Diğer")
            by_category[cat_name] = by_category.get(cat_name, 0) + amount_tl
    
    return {
        "monthly_total": monthly_total,
        "yearly_total": yearly_total,
        "by_category": by_category
    }

@api_router.get("/accounting/summary")
async def get_accounting_summary(current_user: dict = Depends(require_permission("finance_view"))):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get sales
    sales = await db.sales.find({"is_active": True}, {"_id": 0}).to_list(10000)
    monthly_sales_tl = 0
    monthly_profit_tl = 0
    
    for sale in sales:
        sale_date = datetime.fromisoformat(sale["sale_date"].replace("Z", "+00:00")) if isinstance(sale["sale_date"], str) else sale["sale_date"]
        if sale_date >= month_start:
            monthly_sales_tl += sale.get("sale_amount_tl", 0)
            monthly_profit_tl += sale.get("profit_tl", 0)
    
    # Get expenses
    expenses = await db.expenses.find({"is_active": True}, {"_id": 0}).to_list(10000)
    monthly_expenses_tl = 0
    
    for exp in expenses:
        exp_date = datetime.fromisoformat(exp["expense_date"].replace("Z", "+00:00")) if isinstance(exp["expense_date"], str) else exp["expense_date"]
        if exp_date >= month_start:
            monthly_expenses_tl += exp.get("amount_tl", exp.get("amount", 0))
    
    # Calculate net profit
    net_profit = monthly_sales_tl - monthly_expenses_tl
    
    return {
        "month": now.strftime("%B %Y"),
        "total_income": monthly_sales_tl,
        "total_expenses": monthly_expenses_tl,
        "gross_profit": monthly_profit_tl,
        "net_profit": net_profit
    }

# ==================== INIT DEFAULT DATA ====================

@api_router.post("/init-data")
async def init_default_data():
    admin = await db.users.find_one({"email": "admin@solar.com"}, {"_id": 0})
    if admin:
        return {"message": "Veriler zaten mevcut"}
    
    # Create default roles
    admin_role_id = str(uuid.uuid4())
    personel_role_id = str(uuid.uuid4())
    bayi_role_id = str(uuid.uuid4())
    
    roles = [
        {
            "id": admin_role_id,
            "name": "Yönetici",
            "description": "Tam yetkili sistem yöneticisi",
            "permissions": ["all"],
            "is_system": True,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": personel_role_id,
            "name": "Satış Personeli",
            "description": "Satış ve müşteri yönetimi",
            "permissions": [
                "dashboard_view", "products_view", "customers_view", "customers_manage",
                "quotes_view", "quotes_manage", "stock_view"
            ],
            "is_system": True,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": bayi_role_id,
            "name": "Bayi",
            "description": "Bayi kullanıcısı",
            "permissions": [
                "dashboard_view", "products_view", "customers_view", "customers_manage",
                "quotes_view", "quotes_manage"
            ],
            "is_system": True,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.roles.insert_many(roles)
    
    # Create default admin
    admin_id = str(uuid.uuid4())
    admin_user = {
        "id": admin_id,
        "email": "admin@solar.com",
        "name": "Sistem Yöneticisi",
        "role_id": admin_role_id,
        "phone": "0212 555 0000",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_user)
    await db.user_passwords.insert_one({
        "user_id": admin_id,
        "password_hash": hash_password("admin123")
    })
    
    # Create default dealer groups
    dealer_groups = [
        {
            "id": str(uuid.uuid4()),
            "name": "Silver",
            "description": "Standart bayi grubu",
            "discount_rate": 5,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Gold",
            "description": "Orta seviye bayi grubu",
            "discount_rate": 10,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Plus",
            "description": "Premium bayi grubu",
            "discount_rate": 15,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.dealer_groups.insert_many(dealer_groups)
    
    # Create default customer categories
    customer_categories = [
        {"id": str(uuid.uuid4()), "name": "On-Grid", "description": "Şebeke bağlantılı sistemler", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Off-Grid", "description": "Şebekeden bağımsız sistemler", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Hibrit", "description": "Hibrit sistemler", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Sulama", "description": "Tarımsal sulama sistemleri", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.customer_categories.insert_many(customer_categories)
    
    # Create default customer sources
    customer_sources = [
        {"id": str(uuid.uuid4()), "name": "Santral", "description": "Santral ziyareti", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Referans", "description": "Mevcut müşteri referansı", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Lead", "description": "Web sitesi/form", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Facebook", "description": "Facebook reklamları", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Instagram", "description": "Instagram reklamları", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Google Ads", "description": "Google reklamları", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.customer_sources.insert_many(customer_sources)
    
    # Create default expense categories
    expense_categories = [
        {"id": str(uuid.uuid4()), "name": "Personel Maaşları", "description": "Çalışan maaşları", "is_recurring": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Dükkan Kirası", "description": "Aylık kira ödemesi", "is_recurring": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Elektrik", "description": "Elektrik faturası", "is_recurring": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Su", "description": "Su faturası", "is_recurring": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Doğalgaz", "description": "Doğalgaz faturası", "is_recurring": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Mazot/Akaryakıt", "description": "Araç yakıt giderleri", "is_recurring": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "İnternet/Telefon", "description": "İletişim giderleri", "is_recurring": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Ofis Malzemeleri", "description": "Kırtasiye ve ofis malzemeleri", "is_recurring": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Diğer", "description": "Diğer giderler", "is_recurring": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.expense_categories.insert_many(expense_categories)
    
    # Create default company settings
    default_settings = {
        "id": "company_settings",
        "company_name": "Solar Enerji A.Ş.",
        "phone": "0212 555 0000",
        "email": "info@solarenerji.com",
        "address": "İstanbul, Türkiye",
        "warranty_text": "Tüm ürünlerimiz 2 yıl garanti kapsamındadır."
    }
    await db.company_settings.insert_one(default_settings)
    
    return {"message": "Varsayılan veriler oluşturuldu", "admin_email": "admin@solar.com", "admin_password": "admin123"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
