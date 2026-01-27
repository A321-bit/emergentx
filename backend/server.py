from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
import base64

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

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = Field(default="personel", description="admin, personel, bayi")
    phone: Optional[str] = None
    dealer_id: Optional[str] = None  # If role is bayi user, which dealer they belong to

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
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
    role: str
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
    category: str = Field(description="panel, inverter, batarya, aksesuar")
    description: Optional[str] = None
    purchase_price: float
    sale_price: float
    dealer_price: float
    stock_quantity: int = 0
    unit: str = "adet"
    specifications: Optional[dict] = None
    image_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    purchase_price: Optional[float] = None
    sale_price: Optional[float] = None
    dealer_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    unit: Optional[str] = None
    specifications: Optional[dict] = None
    image_url: Optional[str] = None

class Product(ProductBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Stock Movement Models
class StockMovement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    movement_type: str = Field(description="giris, cikis")
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
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    customer_type: str = Field(default="villa", description="villa, isletme, fabrika")
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    customer_type: Optional[str] = None
    notes: Optional[str] = None

class Customer(CustomerBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str
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
    items: List[dict]  # product_id, quantity
    discount_rate: float = 0
    currency: str = "TRY"
    validity_days: int = 15
    notes: Optional[str] = None

class QuoteStatusUpdate(BaseModel):
    status: str = Field(description="teklif_gonderildi, onaylandi, satisa_dondu, iptal")

class Quote(QuoteBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quote_number: str
    status: str = "teklif_gonderildi"
    created_by: str
    created_by_name: str
    dealer_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    valid_until: datetime

# Dealer Models
class DealerBase(BaseModel):
    name: str
    contact_person: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    discount_rate: float = 0  # Percentage discount for this dealer

class DealerCreate(DealerBase):
    pass

class DealerUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    discount_rate: Optional[float] = None
    is_active: Optional[bool] = None

class Dealer(DealerBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_token(user_id: str, email: str, role: str, dealer_id: Optional[str] = None) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
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
    return user

def require_role(*roles):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
        return current_user
    return role_checker

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
    
    token = create_token(user["id"], user["email"], user["role"], user.get("dealer_id"))
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
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
        role=current_user["role"],
        phone=current_user.get("phone"),
        dealer_id=current_user.get("dealer_id"),
        is_active=current_user.get("is_active", True),
        created_at=current_user["created_at"] if isinstance(current_user["created_at"], str) else current_user["created_at"].isoformat()
    )

# ==================== USER ROUTES ====================

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_role("admin"))):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")
    
    user = User(**user_data.model_dump(exclude={"password"}))
    user_dict = user.model_dump()
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    await db.user_passwords.insert_one({
        "user_id": user.id,
        "password_hash": hash_password(user_data.password)
    })
    
    return UserResponse(**{**user_dict, "created_at": user_dict["created_at"]})

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_role("admin"))):
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return [UserResponse(**{**u, "created_at": u["created_at"] if isinstance(u["created_at"], str) else u["created_at"].isoformat()}) for u in users]

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(require_role("admin"))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return UserResponse(**{**user, "created_at": user["created_at"] if isinstance(user["created_at"], str) else user["created_at"].isoformat()})

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate, current_user: dict = Depends(require_role("admin"))):
    update_dict = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Güncellenecek veri yok")
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    return UserResponse(**{**user, "created_at": user["created_at"] if isinstance(user["created_at"], str) else user["created_at"].isoformat()})

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_role("admin"))):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Kendinizi silemezsiniz")
    
    result = await db.users.delete_one({"id": user_id})
    await db.user_passwords.delete_one({"user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return {"message": "Kullanıcı silindi"}

# ==================== PRODUCT ROUTES ====================

@api_router.post("/products", response_model=dict)
async def create_product(product_data: ProductCreate, current_user: dict = Depends(require_role("admin"))):
    product = Product(**product_data.model_dump())
    product_dict = product.model_dump()
    product_dict["created_at"] = product_dict["created_at"].isoformat()
    
    # Create a copy for insertion to avoid ObjectId contamination
    insert_dict = product_dict.copy()
    await db.products.insert_one(insert_dict)
    return product_dict

@api_router.get("/products", response_model=List[dict])
async def get_products(current_user: dict = Depends(get_current_user)):
    products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    # If dealer, apply dealer discount
    if current_user["role"] == "bayi" and current_user.get("dealer_id"):
        dealer = await db.dealers.find_one({"id": current_user["dealer_id"]}, {"_id": 0})
        if dealer:
            discount_rate = dealer.get("discount_rate", 0) / 100
            for p in products:
                p["dealer_price"] = p["sale_price"] * (1 - discount_rate)
    
    return products

@api_router.get("/products/{product_id}", response_model=dict)
async def get_product(product_id: str, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    return product

@api_router.put("/products/{product_id}", response_model=dict)
async def update_product(product_id: str, product_data: ProductUpdate, current_user: dict = Depends(require_role("admin"))):
    update_dict = {k: v for k, v in product_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Güncellenecek veri yok")
    
    result = await db.products.update_one({"id": product_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    return product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(require_role("admin"))):
    result = await db.products.update_one({"id": product_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    return {"message": "Ürün silindi"}

# ==================== STOCK MOVEMENT ROUTES ====================

@api_router.post("/stock-movements", response_model=dict)
async def create_stock_movement(movement_data: StockMovementCreate, current_user: dict = Depends(require_role("admin"))):
    product = await db.products.find_one({"id": movement_data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    movement = StockMovement(
        **movement_data.model_dump(),
        created_by=current_user["id"]
    )
    movement_dict = movement.model_dump()
    movement_dict["created_at"] = movement_dict["created_at"].isoformat()
    
    # Create a copy for insertion to avoid ObjectId contamination
    insert_dict = movement_dict.copy()
    await db.stock_movements.insert_one(insert_dict)
    
    # Update product stock
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
async def get_stock_movements(product_id: Optional[str] = None, current_user: dict = Depends(require_role("admin"))):
    query = {}
    if product_id:
        query["product_id"] = product_id
    movements = await db.stock_movements.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return movements

# ==================== CUSTOMER ROUTES ====================

@api_router.post("/customers", response_model=dict)
async def create_customer(customer_data: CustomerCreate, current_user: dict = Depends(get_current_user)):
    customer = Customer(
        **customer_data.model_dump(),
        created_by=current_user["id"],
        dealer_id=current_user.get("dealer_id") if current_user["role"] == "bayi" else None
    )
    customer_dict = customer.model_dump()
    customer_dict["created_at"] = customer_dict["created_at"].isoformat()
    
    # Create a copy for insertion to avoid ObjectId contamination
    insert_dict = customer_dict.copy()
    await db.customers.insert_one(insert_dict)
    return customer_dict

@api_router.get("/customers", response_model=List[dict])
async def get_customers(current_user: dict = Depends(get_current_user)):
    query = {"is_active": True}
    
    # Filter by role
    if current_user["role"] == "personel":
        query["created_by"] = current_user["id"]
    elif current_user["role"] == "bayi":
        query["dealer_id"] = current_user.get("dealer_id")
    
    customers = await db.customers.find(query, {"_id": 0}).to_list(1000)
    return customers

@api_router.get("/customers/{customer_id}", response_model=dict)
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    return customer

@api_router.put("/customers/{customer_id}", response_model=dict)
async def update_customer(customer_id: str, customer_data: CustomerUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in customer_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Güncellenecek veri yok")
    
    result = await db.customers.update_one({"id": customer_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    return customer

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.customers.update_one({"id": customer_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    return {"message": "Müşteri silindi"}

# ==================== QUOTE ROUTES ====================

@api_router.post("/quotes", response_model=dict)
async def create_quote(quote_data: QuoteCreate, current_user: dict = Depends(get_current_user)):
    # Get customer
    customer = await db.customers.find_one({"id": quote_data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    # Get dealer discount if applicable
    dealer_discount = 0
    if current_user["role"] == "bayi" and current_user.get("dealer_id"):
        dealer = await db.dealers.find_one({"id": current_user["dealer_id"]}, {"_id": 0})
        if dealer:
            dealer_discount = dealer.get("discount_rate", 0)
    
    # Build quote items
    items = []
    subtotal = 0
    
    for item in quote_data.items:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Ürün bulunamadı: {item['product_id']}")
        
        # Use dealer price if bayi, otherwise sale price
        unit_price = product["dealer_price"] if current_user["role"] == "bayi" else product["sale_price"]
        if dealer_discount > 0:
            unit_price = product["sale_price"] * (1 - dealer_discount / 100)
        
        total_price = unit_price * item["quantity"]
        
        items.append(QuoteItem(
            product_id=product["id"],
            product_name=product["name"],
            quantity=item["quantity"],
            unit_price=unit_price,
            total_price=total_price
        ))
        subtotal += total_price
    
    # Calculate totals
    discount_amount = subtotal * (quote_data.discount_rate / 100)
    total = subtotal - discount_amount
    
    quote_number = await generate_quote_number()
    
    quote = Quote(
        customer_id=quote_data.customer_id,
        customer_name=customer["name"],
        items=[item.model_dump() for item in items],
        subtotal=subtotal,
        discount_rate=quote_data.discount_rate,
        discount_amount=discount_amount,
        total=total,
        currency=quote_data.currency,
        validity_days=quote_data.validity_days,
        notes=quote_data.notes,
        quote_number=quote_number,
        created_by=current_user["id"],
        created_by_name=current_user["name"],
        dealer_id=current_user.get("dealer_id") if current_user["role"] == "bayi" else None,
        valid_until=datetime.now(timezone.utc) + timedelta(days=quote_data.validity_days)
    )
    
    quote_dict = quote.model_dump()
    quote_dict["created_at"] = quote_dict["created_at"].isoformat()
    quote_dict["valid_until"] = quote_dict["valid_until"].isoformat()
    
    # Create a copy for insertion to avoid ObjectId contamination
    insert_dict = quote_dict.copy()
    await db.quotes.insert_one(insert_dict)
    return quote_dict

@api_router.get("/quotes", response_model=List[dict])
async def get_quotes(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"is_active": True}
    
    if status:
        query["status"] = status
    
    # Filter by role
    if current_user["role"] == "personel":
        query["created_by"] = current_user["id"]
    elif current_user["role"] == "bayi":
        query["dealer_id"] = current_user.get("dealer_id")
    
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return quotes

@api_router.get("/quotes/{quote_id}", response_model=dict)
async def get_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    return quote

@api_router.put("/quotes/{quote_id}/status", response_model=dict)
async def update_quote_status(quote_id: str, status_data: QuoteStatusUpdate, current_user: dict = Depends(get_current_user)):
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
async def delete_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.quotes.update_one({"id": quote_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    return {"message": "Teklif silindi"}

# ==================== DEALER ROUTES ====================

@api_router.post("/dealers", response_model=dict)
async def create_dealer(dealer_data: DealerCreate, current_user: dict = Depends(require_role("admin"))):
    dealer = Dealer(**dealer_data.model_dump())
    dealer_dict = dealer.model_dump()
    dealer_dict["created_at"] = dealer_dict["created_at"].isoformat()
    
    # Create a copy for insertion to avoid ObjectId contamination
    insert_dict = dealer_dict.copy()
    await db.dealers.insert_one(insert_dict)
    return dealer_dict

@api_router.get("/dealers", response_model=List[dict])
async def get_dealers(current_user: dict = Depends(require_role("admin"))):
    dealers = await db.dealers.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return dealers

@api_router.get("/dealers/{dealer_id}", response_model=dict)
async def get_dealer(dealer_id: str, current_user: dict = Depends(get_current_user)):
    dealer = await db.dealers.find_one({"id": dealer_id}, {"_id": 0})
    if not dealer:
        raise HTTPException(status_code=404, detail="Bayi bulunamadı")
    return dealer

@api_router.put("/dealers/{dealer_id}", response_model=dict)
async def update_dealer(dealer_id: str, dealer_data: DealerUpdate, current_user: dict = Depends(require_role("admin"))):
    update_dict = {k: v for k, v in dealer_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Güncellenecek veri yok")
    
    result = await db.dealers.update_one({"id": dealer_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bayi bulunamadı")
    
    dealer = await db.dealers.find_one({"id": dealer_id}, {"_id": 0})
    return dealer

@api_router.delete("/dealers/{dealer_id}")
async def delete_dealer(dealer_id: str, current_user: dict = Depends(require_role("admin"))):
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
        await db.company_settings.insert_one(settings)
    return settings

@api_router.put("/settings/company", response_model=dict)
async def update_company_settings(settings_data: dict, current_user: dict = Depends(require_role("admin"))):
    await db.company_settings.update_one(
        {"id": "company_settings"},
        {"$set": settings_data},
        upsert=True
    )
    settings = await db.company_settings.find_one({"id": "company_settings"}, {"_id": 0})
    return settings

@api_router.post("/settings/upload-logo")
async def upload_logo(file: UploadFile = File(...), current_user: dict = Depends(require_role("admin"))):
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

# ==================== DASHBOARD STATS ROUTES ====================

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Base query filters based on role
    quote_query = {"is_active": True}
    customer_query = {"is_active": True}
    
    if current_user["role"] == "personel":
        quote_query["created_by"] = current_user["id"]
        customer_query["created_by"] = current_user["id"]
    elif current_user["role"] == "bayi":
        quote_query["dealer_id"] = current_user.get("dealer_id")
        customer_query["dealer_id"] = current_user.get("dealer_id")
    
    # Get counts
    total_products = await db.products.count_documents({"is_active": True})
    total_customers = await db.customers.count_documents(customer_query)
    total_quotes = await db.quotes.count_documents(quote_query)
    
    # Get quote stats
    quotes = await db.quotes.find(quote_query, {"_id": 0}).to_list(10000)
    
    total_revenue = sum(q["total"] for q in quotes if q.get("status") == "satisa_dondu")
    pending_quotes = len([q for q in quotes if q.get("status") == "teklif_gonderildi"])
    approved_quotes = len([q for q in quotes if q.get("status") == "onaylandi"])
    converted_quotes = len([q for q in quotes if q.get("status") == "satisa_dondu"])
    
    # Stock value (admin only)
    stock_value = 0
    if current_user["role"] == "admin":
        products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(10000)
        stock_value = sum(p["purchase_price"] * p["stock_quantity"] for p in products)
        total_dealers = await db.dealers.count_documents({"is_active": True})
        total_users = await db.users.count_documents({})
    else:
        total_dealers = 0
        total_users = 0
    
    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_quotes": total_quotes,
        "total_revenue": total_revenue,
        "pending_quotes": pending_quotes,
        "approved_quotes": approved_quotes,
        "converted_quotes": converted_quotes,
        "stock_value": stock_value,
        "total_dealers": total_dealers,
        "total_users": total_users
    }

@api_router.get("/stats/sales-by-user")
async def get_sales_by_user(current_user: dict = Depends(require_role("admin"))):
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
async def get_sales_by_dealer(current_user: dict = Depends(require_role("admin"))):
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
    
    # Get dealer names
    for r in results:
        dealer = await db.dealers.find_one({"id": r["_id"]}, {"_id": 0})
        r["dealer_name"] = dealer["name"] if dealer else "Bilinmeyen"
    
    return [{"dealer_id": r["_id"], "dealer_name": r["dealer_name"], "total_sales": r["total_sales"], "count": r["count"]} for r in results]

# ==================== INIT DEFAULT DATA ====================

@api_router.post("/init-data")
async def init_default_data():
    # Check if admin exists
    admin = await db.users.find_one({"email": "admin@solar.com"}, {"_id": 0})
    if admin:
        return {"message": "Veriler zaten mevcut"}
    
    # Create default admin
    admin_id = str(uuid.uuid4())
    admin_user = {
        "id": admin_id,
        "email": "admin@solar.com",
        "name": "Sistem Yöneticisi",
        "role": "admin",
        "phone": "0212 555 0000",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_user)
    await db.user_passwords.insert_one({
        "user_id": admin_id,
        "password_hash": hash_password("admin123")
    })
    
    # Create sample products
    products = [
        {
            "id": str(uuid.uuid4()),
            "name": "Mono PERC 550W Panel",
            "category": "panel",
            "description": "Yüksek verimli monokristal güneş paneli",
            "purchase_price": 2500,
            "sale_price": 3500,
            "dealer_price": 3000,
            "stock_quantity": 100,
            "unit": "adet",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Half-Cut 450W Panel",
            "category": "panel",
            "description": "Half-cut hücre teknolojisi",
            "purchase_price": 2000,
            "sale_price": 2800,
            "dealer_price": 2400,
            "stock_quantity": 150,
            "unit": "adet",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Hybrid Inverter 5kW",
            "category": "inverter",
            "description": "Akıllı hibrit inverter, batarya uyumlu",
            "purchase_price": 15000,
            "sale_price": 22000,
            "dealer_price": 18500,
            "stock_quantity": 25,
            "unit": "adet",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "On-Grid Inverter 10kW",
            "category": "inverter",
            "description": "Şebeke bağlantılı inverter",
            "purchase_price": 20000,
            "sale_price": 28000,
            "dealer_price": 24000,
            "stock_quantity": 15,
            "unit": "adet",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Lityum Batarya 10kWh",
            "category": "batarya",
            "description": "LiFePO4 teknolojisi, uzun ömür",
            "purchase_price": 45000,
            "sale_price": 65000,
            "dealer_price": 55000,
            "stock_quantity": 10,
            "unit": "adet",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Montaj Seti Çatı Tipi",
            "category": "aksesuar",
            "description": "Kiremit çatı montaj sistemi",
            "purchase_price": 500,
            "sale_price": 800,
            "dealer_price": 650,
            "stock_quantity": 200,
            "unit": "set",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.products.insert_many(products)
    
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
