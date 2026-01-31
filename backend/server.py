from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, Response
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
from pdf_generator import generate_quote_pdf

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is required for security")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI()

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Note: Static files will be mounted AFTER the api_router is included

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
    "hr_view": "Personel Görüntüleme",
    "hr_manage": "Personel Ekleme/Düzenleme/Silme",
    "payroll_view": "Bordro Görüntüleme",
    "payroll_manage": "Bordro/Avans/Prim Yönetimi",
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
    power_watt: Optional[float] = None  # Güç değeri (W) - Panel, İnverter, Batarya için
    price_segment: Optional[str] = None  # ekonomik, standart, premium
    matching_group: Optional[str] = None  # Eşleştirme grubu ID (aynı güçteki ürünleri gruplar)

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
    power_watt: Optional[float] = None  # Güç değeri (W)
    price_segment: Optional[str] = None  # ekonomik, standart, premium
    matching_group: Optional[str] = None  # Eşleştirme grubu ID

# Price segment options
PRICE_SEGMENTS = [
    {"value": "ekonomik", "label": "Ekonomik", "color": "green"},
    {"value": "standart", "label": "Standart", "color": "yellow"},
    {"value": "premium", "label": "Premium", "color": "blue"},
]

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
# ==================== QUOTE MODELS (Gelişmiş Teklif Sistemi) ====================

class QuoteItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price_usd: float = 0
    unit_price_tl: float = 0
    total_price_usd: float = 0
    total_price_tl: float = 0
    unit_price: float = 0  # Legacy (TL)
    total_price: float = 0  # Legacy (TL)
    unit: str = "adet"
    datasheet_url: Optional[str] = None
    currency: str = "USD"
    description: Optional[str] = None
    sort_order: int = 0  # Sıralama için

class QuoteCreate(BaseModel):
    # Adım 1: Müşteri & Satış Bilgileri
    customer_id: str
    customer_status: str = "bilgi_amacli"  # olumlu, bilgi_amacli, yuksek_potansiyel, dusuk_potansiyel
    quote_date: Optional[str] = None
    validity_days: int = 15
    electricity_subscription_type: Optional[str] = None  # EPDK abonelik tipi (On-Grid/Hibrit için)
    
    # Adım 2: Ürünler
    items: List[dict] = []
    
    # Adım 3: Fiyat & İskonto
    shipping_cost: float = 0  # Nakliye & Montaj (KDV dahil)
    discount_type: str = "percent"
    discount_rate: float = 0
    discount_amount: float = 0
    vat_rate: float = 20
    
    # Adım 4: Notlar & Takip
    customer_notes: Optional[str] = None  # Müşteri notları
    internal_notes: Optional[str] = None  # İç not (sadece personel görür)
    callback_required: bool = False  # Tekrar aranacak mı?
    callback_date: Optional[str] = None  # Arama tarihi
    callback_time: Optional[str] = None  # Arama saati
    
    # Off-Grid segment options
    include_segment_options: bool = False  # Off-Grid için 3 farklı segment seçeneği göster
    segment_items: Optional[dict] = None  # {"ekonomik": [...], "standart": [...], "premium": [...]}
    
    status: str = "taslak"

class QuoteStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class QuoteCallbackUpdate(BaseModel):
    callback_date: str
    callback_time: str
    notes: Optional[str] = None

class QuoteDiscountUpdate(BaseModel):
    discount_type: str = "percent"
    discount_rate: float = 0
    discount_amount: float = 0

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
    contract_terms: Optional[str] = None  # Sözleşme metni (ayrı sayfa olarak PDF'e eklenir)
    # Multiple bank accounts support
    bank_accounts: Optional[List[dict]] = None  # Array of bank account objects
    # Card providers (Kart Çekilen Sistemler)
    card_providers: Optional[List[dict]] = None  # [{id, name, description}]
    # Legacy single bank fields (for backward compatibility)
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_holder: Optional[str] = None
    bank_iban: Optional[str] = None
    bank_swift: Optional[str] = None
    # Energy pricing settings (Enerji Fiyat Ayarları)
    electricity_rates: Optional[List[dict]] = None  # [{type_code, type_name, price_per_kwh}]
    diesel_price_per_liter: Optional[float] = 45.0  # Mazot fiyatı (TL/L)
    diesel_consumption_per_kwh: Optional[float] = 0.35  # Jeneratör mazot tüketimi (L/kWh)

# EPDK Electricity Subscription Types (Abonelik Türleri)
EPDK_SUBSCRIPTION_TYPES = [
    {"type_code": "mesken", "type_name": "Mesken (Konut)", "default_price": 3.00},
    {"type_code": "ticarethane", "type_name": "Ticarethane", "default_price": 3.50},
    {"type_code": "sanayi_tek", "type_name": "Sanayi (Tek Zamanlı)", "default_price": 2.80},
    {"type_code": "sanayi_cok", "type_name": "Sanayi (Çok Zamanlı)", "default_price": 2.50},
    {"type_code": "tarimsal_sulama", "type_name": "Tarımsal Sulama", "default_price": 1.50},
    {"type_code": "aydinlatma", "type_name": "Genel Aydınlatma", "default_price": 3.20},
]

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

# Sale Item Model (Satış Kalemi - Ürün/Paket)
class SaleItem(BaseModel):
    item_type: str = "product"  # product veya package
    item_id: str
    item_name: str
    quantity: int = 1
    unit_price: float = 0
    line_total: float = 0

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
    # Ürün/Paket bilgileri
    items: Optional[List[SaleItem]] = None  # Satış kalemleri
    calculated_total: float = 0  # Hesaplanan toplam (ürün/paket toplamı)
    discount_percent: float = 0  # İskonto yüzdesi
    discount_amount: float = 0  # İskonto tutarı (TL)
    net_total: float = 0  # İskonto sonrası tutar
    manual_override: bool = False  # Manuel tutar düzeltmesi yapıldı mı?
    # Çoklu ödeme alanları
    nakit_tl: float = 0  # Nakit ödeme
    kart_tl: float = 0  # Kart ile ödeme
    kart_provider_id: Optional[str] = None  # Kart çekilen sistem/tedarikçi ID
    kart_provider_name: Optional[str] = None  # Kart çekilen sistem/tedarikçi adı
    havale_tl: float = 0  # Havale/EFT ile ödeme
    havale_bank_account_id: Optional[str] = None  # Havale alınan banka hesabı ID
    havale_bank_name: Optional[str] = None  # Havale alınan banka adı
    havale_currency: str = "TRY"  # Havale para birimi (TRY/USD)
    havale_usd_amount: float = 0  # USD cinsinden havale tutarı
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

# Package Model (Paketler - E-ticaret ürün paketleri)
# Package Category Model (Paket Kategorileri)
class PackageCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None  # Icon name for UI
    color: Optional[str] = None  # Color code for UI

class PackageCategoryCreate(PackageCategoryBase):
    pass

class PackageCategory(PackageCategoryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PackageItemBase(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_cost: float = 0  # Maliyet (alış fiyatı)
    unit_price: float = 0  # Satış fiyatı
    currency: str = "USD"
    total_cost: float = 0
    total_price: float = 0

class PackageBase(BaseModel):
    name: str
    category_id: str  # Paket kategorisi
    description: Optional[str] = None
    level: str = "basic"  # basic, plus, pro
    
    # Teknik özellikler
    system_power_kwp: Optional[float] = None  # Sistem gücü (kWp)
    battery_capacity_kwh: Optional[float] = None  # Batarya kapasitesi (kWh)
    daily_production_kwh: Optional[float] = None  # Günlük üretim (kWh)
    yearly_production_kwh: Optional[float] = None  # Yıllık üretim (kWh)
    
    # Uygunluk bilgisi
    suitable_for: List[str] = []  # yazlik_ev, bahce_evi, ciftlik, sanayi, kesinti_bolgesi, yuksek_fatura
    
    # Ürün içeriği
    items: List[PackageItemBase] = []
    
    # Fiyatlandırma
    total_cost_usd: float = 0  # Toplam maliyet USD
    total_cost_tl: float = 0  # Toplam maliyet TL
    total_price_usd: float = 0  # Toplam satış USD
    total_price_tl: float = 0  # Toplam satış TL
    profit_usd: float = 0  # Kar USD
    profit_tl: float = 0  # Kar TL
    profit_margin: float = 0  # Kar oranı %
    exchange_rate: float = 34.0
    
    # Durum
    status: str = "active"  # active, inactive, campaign

class PackageCreate(BaseModel):
    name: str
    category_id: str
    description: Optional[str] = None
    level: str = "basic"
    system_power_kwp: Optional[float] = None
    battery_capacity_kwh: Optional[float] = None
    daily_production_kwh: Optional[float] = None
    yearly_production_kwh: Optional[float] = None
    suitable_for: List[str] = []
    items: List[dict] = []
    status: str = "active"

class Package(PackageBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_name: str = ""
    available_stock: int = 0  # Kaç adet paket oluşturulabilir
    created_by: str = ""
    created_by_name: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== HR MODELS ====================

# Employee Model (Personel)
class EmployeeBase(BaseModel):
    name: str
    employee_no: str
    position: str
    employment_type: str = "monthly"  # monthly (aylık maaşlı) / daily (günlük yevmiye)
    monthly_salary: float = 0
    daily_wage: float = 0
    start_date: str  # İşe giriş tarihi
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    pass

class Employee(EmployeeBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_by: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Attendance Model (Puantaj/Devam)
class AttendanceBase(BaseModel):
    employee_id: str
    employee_name: str
    date: str  # YYYY-MM-DD
    status: str = "present"  # present (geldi), absent (gelmedi), half_day (yarım gün), leave (izin), sick (rapor)
    notes: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    pass

class Attendance(AttendanceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Advance Model (Avans)
class AdvanceBase(BaseModel):
    employee_id: str
    employee_name: str
    amount: float
    date: str
    description: Optional[str] = None
    is_deducted: bool = False  # Bordrodan kesildi mi?
    deducted_month: Optional[str] = None  # Hangi ayda kesildi (YYYY-MM)

class AdvanceCreate(AdvanceBase):
    pass

class Advance(AdvanceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_by: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Bonus Model (Prim)
class BonusBase(BaseModel):
    employee_id: str
    employee_name: str
    bonus_type: str  # sales (satış), project (proje), performance (performans)
    amount: float
    month: str  # YYYY-MM
    description: Optional[str] = None

class BonusCreate(BonusBase):
    pass

class Bonus(BonusBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_by: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Employee Expense Model (Personel Giderleri)
class EmployeeExpenseBase(BaseModel):
    employee_id: str
    employee_name: str
    expense_type: str  # food (yemek), transport (yol), phone (telefon), accommodation (konaklama), other (diğer)
    amount: float
    month: str  # YYYY-MM
    description: Optional[str] = None

class EmployeeExpenseCreate(EmployeeExpenseBase):
    pass

class EmployeeExpense(EmployeeExpenseBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_by: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Salary/Payroll Model (Bordro)
class SalaryBase(BaseModel):
    employee_id: str
    employee_name: str
    month: str  # YYYY-MM
    gross_salary: float = 0  # Brüt maaş
    working_days: int = 30
    present_days: float = 0  # Çalışılan gün (yarım gün 0.5)
    absent_days: float = 0
    leave_days: int = 0
    sick_days: int = 0
    absence_deduction: float = 0  # Devamsızlık kesintisi
    advance_deduction: float = 0  # Avans kesintisi
    other_deductions: float = 0  # Diğer kesintiler
    total_bonus: float = 0  # Toplam prim
    net_salary: float = 0  # Net ödenecek
    is_paid: bool = False
    paid_date: Optional[str] = None
    is_locked: bool = False  # Kilitli bordro (değiştirilemez)
    notes: Optional[str] = None

class SalaryCreate(SalaryBase):
    pass

class Salary(SalaryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_by: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
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

@api_router.get("/products/price-segments")
async def get_price_segments():
    """Get available price segments for products"""
    return PRICE_SEGMENTS

@api_router.get("/products/matching-groups")
async def get_matching_groups(current_user: dict = Depends(get_current_user)):
    """Get all unique matching groups"""
    pipeline = [
        {"$match": {"is_active": True, "matching_group": {"$ne": None, "$ne": ""}}},
        {"$group": {"_id": "$matching_group", "products": {"$push": {"id": "$id", "name": "$name", "price_segment": "$price_segment", "power_watt": "$power_watt", "category_name": "$category_name", "sale_price": "$sale_price"}}}},
        {"$project": {"_id": 0, "matching_group": "$_id", "products": 1}}
    ]
    groups = await db.products.aggregate(pipeline).to_list(100)
    return groups

@api_router.get("/products/{product_id}/matched-products")
async def get_matched_products(product_id: str, current_user: dict = Depends(get_current_user)):
    """Get products in the same matching group as the given product"""
    product = await db.products.find_one({"id": product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    matching_group = product.get("matching_group")
    if not matching_group:
        return {"product": product, "matched": []}
    
    # Find all products in the same matching group
    matched = await db.products.find(
        {"matching_group": matching_group, "is_active": True, "id": {"$ne": product_id}},
        {"_id": 0}
    ).to_list(10)
    
    return {"product": product, "matched": matched}

@api_router.post("/quotes/calculate-segments")
async def calculate_segment_prices(
    data: dict,
    current_user: dict = Depends(require_permission("quotes_view"))
):
    """Calculate prices for all segments based on selected products"""
    items = data.get("items", [])
    
    # Get exchange rate
    exchange_settings = await db.exchange_rate_settings.find_one({"id": "exchange_rate_settings"}, {"_id": 0})
    usd_rate = exchange_settings.get("usd_to_try", 34.0) if exchange_settings else 34.0
    
    # Build result for each segment
    segments_result = {
        "ekonomik": {"items": [], "subtotal_tl": 0},
        "standart": {"items": [], "subtotal_tl": 0},
        "premium": {"items": [], "subtotal_tl": 0}
    }
    
    for item in items:
        product = await db.products.find_one({"id": item.get("product_id"), "is_active": True}, {"_id": 0})
        if not product:
            continue
        
        quantity = item.get("quantity", 1)
        
        # If product has matching_group, it's a segment product - find alternatives
        if product.get("matching_group"):
            # Find matched products for each segment
            matching_group = product["matching_group"]
            matched_products = await db.products.find(
                {"matching_group": matching_group, "is_active": True},
                {"_id": 0}
            ).to_list(10)
            
            for segment in ["ekonomik", "standart", "premium"]:
                # Find product for this segment
                segment_product = next(
                    (p for p in matched_products if p.get("price_segment") == segment),
                    product  # fallback to original if no match
                )
                
                # Calculate price
                currency = segment_product.get("currency", "USD")
                base_price = segment_product.get("sale_price", 0)
                if currency == "USD":
                    unit_price_tl = base_price * usd_rate
                else:
                    unit_price_tl = base_price
                
                total_price_tl = unit_price_tl * quantity
                
                segments_result[segment]["items"].append({
                    "product_id": segment_product["id"],
                    "product_name": segment_product["name"],
                    "quantity": quantity,
                    "unit_price_tl": round(unit_price_tl, 2),
                    "total_price_tl": round(total_price_tl, 2),
                    "power_watt": segment_product.get("power_watt"),
                    "is_segment_product": True
                })
                segments_result[segment]["subtotal_tl"] += total_price_tl
        else:
            # Non-segment product - same for all segments
            currency = product.get("currency", "USD")
            base_price = product.get("sale_price", 0)
            if currency == "USD":
                unit_price_tl = base_price * usd_rate
            else:
                unit_price_tl = base_price
            
            total_price_tl = unit_price_tl * quantity
            
            for segment in ["ekonomik", "standart", "premium"]:
                segments_result[segment]["items"].append({
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": quantity,
                    "unit_price_tl": round(unit_price_tl, 2),
                    "total_price_tl": round(total_price_tl, 2),
                    "power_watt": product.get("power_watt"),
                    "is_segment_product": False
                })
                segments_result[segment]["subtotal_tl"] += total_price_tl
    
    # Round subtotals
    for segment in segments_result:
        segments_result[segment]["subtotal_tl"] = round(segments_result[segment]["subtotal_tl"], 2)
    
    return segments_result

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

# ==================== QUOTE ROUTES (Gelişmiş Teklif Sistemi) ====================

CUSTOMER_STATUS_OPTIONS = ["olumlu", "bilgi_amacli", "yuksek_potansiyel", "dusuk_potansiyel"]
QUOTE_STATUS_OPTIONS = ["taslak", "gonderildi", "takipte", "satisa_dondu", "olumsuz", "iptal"]

@api_router.post("/quotes", response_model=dict)
async def create_quote(quote_data: QuoteCreate, current_user: dict = Depends(require_permission("quotes_manage"))):
    customer = await db.customers.find_one({"id": quote_data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    # Döviz kurunu al
    exchange_settings = await db.exchange_rate_settings.find_one({"id": "exchange_rate_settings"}, {"_id": 0})
    usd_rate = exchange_settings.get("usd_to_try", 34.0) if exchange_settings else 34.0
    
    items = []
    subtotal_usd = 0
    subtotal_tl = 0
    
    for idx, item in enumerate(quote_data.items):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Ürün bulunamadı: {item['product_id']}")
        
        # Frontend'den gelen fiyatları kullan (zaten hesaplanmış)
        # Eğer frontend'den gelmediyse ürün fiyatından hesapla
        if "unit_price_tl" in item and item["unit_price_tl"]:
            unit_price_tl = float(item["unit_price_tl"])
            unit_price_usd = float(item.get("unit_price_usd", 0)) or (unit_price_tl / usd_rate)
        elif "unit_price_usd" in item and item["unit_price_usd"]:
            unit_price_usd = float(item["unit_price_usd"])
            unit_price_tl = unit_price_usd * usd_rate
        else:
            # Ürün fiyatından hesapla
            product_currency = product.get("currency", "USD")
            base_price = product.get("sale_price", 0)
            if product_currency == "USD":
                unit_price_usd = base_price
                unit_price_tl = base_price * usd_rate
            else:
                unit_price_tl = base_price
                unit_price_usd = base_price / usd_rate
        
        quantity = int(item.get("quantity", 1))
        total_price_usd = unit_price_usd * quantity
        total_price_tl = unit_price_tl * quantity
        
        items.append({
            "product_id": product["id"],
            "product_name": product["name"],
            "quantity": quantity,
            "unit_price_usd": round(unit_price_usd, 2),
            "unit_price_tl": round(unit_price_tl, 2),
            "total_price_usd": round(total_price_usd, 2),
            "total_price_tl": round(total_price_tl, 2),
            "unit_price": round(unit_price_tl, 2),
            "total_price": round(total_price_tl, 2),
            "unit": product.get("unit", "adet"),
            "datasheet_url": product.get("datasheet_url"),
            "currency": product.get("currency", "USD"),
            "description": item.get("description", ""),
            "sort_order": item.get("sort_order", idx)
        })
        subtotal_usd += total_price_usd
        subtotal_tl += total_price_tl
    
    # Nakliye & Montaj (KDV dahil olarak girilir, KDV'siz tutarı hesapla)
    shipping_cost = quote_data.shipping_cost or 0
    shipping_cost_without_vat = shipping_cost / (1 + quote_data.vat_rate / 100) if quote_data.vat_rate > 0 else shipping_cost
    shipping_vat = shipping_cost - shipping_cost_without_vat
    
    # İndirim hesapla
    if quote_data.discount_type == "percent":
        discount_amount_tl = subtotal_tl * (quote_data.discount_rate / 100)
        discount_amount_usd = subtotal_usd * (quote_data.discount_rate / 100)
    else:
        discount_amount_tl = quote_data.discount_amount
        discount_amount_usd = quote_data.discount_amount / usd_rate
    
    # KDV hesapla
    subtotal_after_discount_tl = subtotal_tl - discount_amount_tl + shipping_cost_without_vat
    subtotal_after_discount_usd = subtotal_usd - discount_amount_usd + (shipping_cost_without_vat / usd_rate)
    vat_amount_tl = (subtotal_tl - discount_amount_tl) * (quote_data.vat_rate / 100) + shipping_vat
    vat_amount_usd = vat_amount_tl / usd_rate
    
    total_tl = subtotal_tl - discount_amount_tl + vat_amount_tl + shipping_cost_without_vat
    total_usd = total_tl / usd_rate
    
    quote_number = await generate_quote_number()
    
    quote_dict = {
        "id": str(uuid.uuid4()),
        "quote_number": quote_number,
        "customer_id": quote_data.customer_id,
        "customer_name": customer["name"],
        "customer_phone": customer.get("phone", ""),
        "customer_email": customer.get("email", ""),
        "customer_address": customer.get("address", ""),
        "customer_status": quote_data.customer_status,
        "electricity_subscription_type": quote_data.electricity_subscription_type,  # EPDK abonelik tipi
        "include_segment_options": quote_data.include_segment_options,  # Off-Grid 3 segment seçeneği
        "items": items,
        "subtotal_usd": round(subtotal_usd, 2),
        "subtotal_tl": round(subtotal_tl, 2),
        "shipping_cost": round(shipping_cost, 2),
        "shipping_cost_without_vat": round(shipping_cost_without_vat, 2),
        "discount_type": quote_data.discount_type,
        "discount_rate": quote_data.discount_rate,
        "discount_amount_usd": round(discount_amount_usd, 2),
        "discount_amount_tl": round(discount_amount_tl, 2),
        "vat_rate": quote_data.vat_rate,
        "vat_amount_usd": round(vat_amount_usd, 2),
        "vat_amount_tl": round(vat_amount_tl, 2),
        "total_usd": round(total_usd, 2),
        "total_tl": round(total_tl, 2),
        "exchange_rate": usd_rate,
        "validity_days": quote_data.validity_days,
        "customer_notes": quote_data.customer_notes,
        "internal_notes": quote_data.internal_notes,
        "callback_required": quote_data.callback_required,
        "callback_date": quote_data.callback_date,
        "callback_time": quote_data.callback_time,
        "status": quote_data.status or "taslak",
        "created_by": current_user["id"],
        "created_by_name": current_user.get("name", ""),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "valid_until": (datetime.now(timezone.utc) + timedelta(days=quote_data.validity_days)).isoformat()
    }
    
    await db.quotes.insert_one(quote_dict.copy())
    if "_id" in quote_dict:
        del quote_dict["_id"]
    return quote_dict

@api_router.get("/quotes", response_model=List[dict])
async def get_quotes(
    status: Optional[str] = None,
    customer_status: Optional[str] = None,
    created_by: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    callback_upcoming: Optional[bool] = None,
    current_user: dict = Depends(require_permission("quotes_view"))
):
    query = {"is_active": True}
    
    # Personel sadece kendi tekliflerini görebilir (admin hariç)
    user_perms = current_user.get("permissions", [])
    if "all" not in user_perms and "quotes_view_all" not in user_perms:
        query["created_by"] = current_user["id"]
    
    if status:
        query["status"] = status
    if customer_status:
        query["customer_status"] = customer_status
    if created_by:
        query["created_by"] = created_by
    
    # Tarih filtreleri
    if date_from:
        query["created_at"] = {"$gte": date_from}
    if date_to:
        if "created_at" in query:
            query["created_at"]["$lte"] = date_to
        else:
            query["created_at"] = {"$lte": date_to}
    
    # Yaklaşan arama zamanları
    if callback_upcoming:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        query["callback_required"] = True
        query["callback_date"] = {"$lte": today}
        query["status"] = {"$nin": ["satisa_dondu", "olumsuz", "iptal"]}
    
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return quotes

@api_router.get("/quotes/my-followups", response_model=List[dict])
async def get_my_followups(current_user: dict = Depends(require_permission("quotes_view"))):
    """Personelin takipteki teklifleri"""
    query = {
        "is_active": True,
        "created_by": current_user["id"],
        "status": "takipte"
    }
    quotes = await db.quotes.find(query, {"_id": 0}).sort("callback_date", 1).to_list(1000)
    return quotes

@api_router.get("/quotes/upcoming-callbacks", response_model=List[dict])
async def get_upcoming_callbacks(current_user: dict = Depends(require_permission("quotes_view"))):
    """Aranması gereken teklifler"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {
        "is_active": True,
        "callback_required": True,
        "status": {"$nin": ["satisa_dondu", "olumsuz", "iptal"]}
    }
    
    # Personel sadece kendi tekliflerini görebilir (admin hariç)
    user_perms = current_user.get("permissions", [])
    if "all" not in user_perms and "quotes_view_all" not in user_perms:
        query["created_by"] = current_user["id"]
    
    quotes = await db.quotes.find(query, {"_id": 0}).sort("callback_date", 1).to_list(1000)
    return quotes

@api_router.get("/quotes/{quote_id}", response_model=dict)
async def get_quote(quote_id: str, current_user: dict = Depends(require_permission("quotes_view"))):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    return quote

@api_router.put("/quotes/{quote_id}", response_model=dict)
async def update_quote(quote_id: str, quote_data: QuoteCreate, current_user: dict = Depends(require_permission("quotes_manage"))):
    existing = await db.quotes.find_one({"id": quote_id, "is_active": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    
    if existing.get("status") in ["satisa_dondu", "iptal"]:
        raise HTTPException(status_code=400, detail="Bu teklif düzenlenemez")
    
    customer = await db.customers.find_one({"id": quote_data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    exchange_settings = await db.exchange_rate_settings.find_one({"id": "exchange_rate_settings"}, {"_id": 0})
    usd_rate = exchange_settings.get("usd_to_try", 34.0) if exchange_settings else 34.0
    
    items = []
    subtotal_usd = 0
    subtotal_tl = 0
    
    for idx, item in enumerate(quote_data.items):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Ürün bulunamadı: {item['product_id']}")
        
        # Frontend'den gelen fiyatları kullan (zaten hesaplanmış)
        if "unit_price_tl" in item and item["unit_price_tl"]:
            unit_price_tl = float(item["unit_price_tl"])
            unit_price_usd = float(item.get("unit_price_usd", 0)) or (unit_price_tl / usd_rate)
        elif "unit_price_usd" in item and item["unit_price_usd"]:
            unit_price_usd = float(item["unit_price_usd"])
            unit_price_tl = unit_price_usd * usd_rate
        else:
            product_currency = product.get("currency", "USD")
            base_price = product.get("sale_price", 0)
            if product_currency == "USD":
                unit_price_usd = base_price
                unit_price_tl = base_price * usd_rate
            else:
                unit_price_tl = base_price
                unit_price_usd = base_price / usd_rate
        
        quantity = int(item.get("quantity", 1))
        total_price_usd = unit_price_usd * quantity
        total_price_tl = unit_price_tl * quantity
        
        items.append({
            "product_id": product["id"],
            "product_name": product["name"],
            "quantity": quantity,
            "unit_price_usd": round(unit_price_usd, 2),
            "unit_price_tl": round(unit_price_tl, 2),
            "total_price_usd": round(total_price_usd, 2),
            "total_price_tl": round(total_price_tl, 2),
            "unit_price": round(unit_price_tl, 2),
            "total_price": round(total_price_tl, 2),
            "unit": product.get("unit", "adet"),
            "datasheet_url": product.get("datasheet_url"),
            "currency": product.get("currency", "USD"),
            "description": item.get("description", ""),
            "sort_order": item.get("sort_order", idx)
        })
        subtotal_usd += total_price_usd
        subtotal_tl += total_price_tl
    
    shipping_cost = quote_data.shipping_cost or 0
    shipping_cost_without_vat = shipping_cost / (1 + quote_data.vat_rate / 100) if quote_data.vat_rate > 0 else shipping_cost
    shipping_vat = shipping_cost - shipping_cost_without_vat
    
    if quote_data.discount_type == "percent":
        discount_amount_tl = subtotal_tl * (quote_data.discount_rate / 100)
        discount_amount_usd = subtotal_usd * (quote_data.discount_rate / 100)
    else:
        discount_amount_tl = quote_data.discount_amount
        discount_amount_usd = quote_data.discount_amount / usd_rate
    
    vat_amount_tl = (subtotal_tl - discount_amount_tl) * (quote_data.vat_rate / 100) + shipping_vat
    vat_amount_usd = vat_amount_tl / usd_rate
    
    total_tl = subtotal_tl - discount_amount_tl + vat_amount_tl + shipping_cost_without_vat
    total_usd = total_tl / usd_rate
    
    update_data = {
        "customer_id": quote_data.customer_id,
        "customer_name": customer["name"],
        "customer_phone": customer.get("phone", ""),
        "customer_email": customer.get("email", ""),
        "customer_address": customer.get("address", ""),
        "customer_status": quote_data.customer_status,
        "electricity_subscription_type": quote_data.electricity_subscription_type,  # EPDK abonelik tipi
        "include_segment_options": quote_data.include_segment_options,  # Off-Grid 3 segment seçeneği
        "items": items,
        "subtotal_usd": round(subtotal_usd, 2),
        "subtotal_tl": round(subtotal_tl, 2),
        "shipping_cost": round(shipping_cost, 2),
        "shipping_cost_without_vat": round(shipping_cost_without_vat, 2),
        "discount_type": quote_data.discount_type,
        "discount_rate": quote_data.discount_rate,
        "discount_amount_usd": round(discount_amount_usd, 2),
        "discount_amount_tl": round(discount_amount_tl, 2),
        "vat_rate": quote_data.vat_rate,
        "vat_amount_usd": round(vat_amount_usd, 2),
        "vat_amount_tl": round(vat_amount_tl, 2),
        "total_usd": round(total_usd, 2),
        "total_tl": round(total_tl, 2),
        "exchange_rate": usd_rate,
        "validity_days": quote_data.validity_days,
        "customer_notes": quote_data.customer_notes,
        "internal_notes": quote_data.internal_notes,
        "callback_required": quote_data.callback_required,
        "callback_date": quote_data.callback_date,
        "callback_time": quote_data.callback_time,
        "status": quote_data.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "valid_until": (datetime.now(timezone.utc) + timedelta(days=quote_data.validity_days)).isoformat()
    }
    
    await db.quotes.update_one({"id": quote_id}, {"$set": update_data})
    updated = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    return updated

@api_router.put("/quotes/{quote_id}/status")
async def update_quote_status(quote_id: str, status_update: QuoteStatusUpdate, current_user: dict = Depends(require_permission("quotes_manage"))):
    if status_update.status not in QUOTE_STATUS_OPTIONS:
        raise HTTPException(status_code=400, detail="Geçersiz durum")
    
    update_data = {
        "status": status_update.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if status_update.notes:
        update_data["status_notes"] = status_update.notes
    
    result = await db.quotes.update_one({"id": quote_id, "is_active": True}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    return quote

@api_router.put("/quotes/{quote_id}/callback")
async def update_quote_callback(quote_id: str, callback: QuoteCallbackUpdate, current_user: dict = Depends(require_permission("quotes_manage"))):
    update_data = {
        "callback_required": True,
        "callback_date": callback.callback_date,
        "callback_time": callback.callback_time,
        "status": "takipte",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if callback.notes:
        update_data["internal_notes"] = callback.notes
    
    result = await db.quotes.update_one({"id": quote_id, "is_active": True}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    return quote

@api_router.put("/quotes/{quote_id}/discount")
async def apply_extra_discount(quote_id: str, discount: QuoteDiscountUpdate, current_user: dict = Depends(require_permission("quotes_manage"))):
    quote = await db.quotes.find_one({"id": quote_id, "is_active": True}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    
    subtotal_tl = quote.get("subtotal_tl", 0)
    subtotal_usd = quote.get("subtotal_usd", 0)
    usd_rate = quote.get("exchange_rate", 34.0)
    vat_rate = quote.get("vat_rate", 20)
    shipping_cost = quote.get("shipping_cost", 0)
    shipping_cost_without_vat = quote.get("shipping_cost_without_vat", 0)
    
    if discount.discount_type == "percent":
        discount_amount_tl = subtotal_tl * (discount.discount_rate / 100)
        discount_amount_usd = subtotal_usd * (discount.discount_rate / 100)
    else:
        discount_amount_tl = discount.discount_amount
        discount_amount_usd = discount.discount_amount / usd_rate
    
    shipping_vat = shipping_cost - shipping_cost_without_vat
    vat_amount_tl = (subtotal_tl - discount_amount_tl) * (vat_rate / 100) + shipping_vat
    vat_amount_usd = vat_amount_tl / usd_rate
    
    total_tl = subtotal_tl - discount_amount_tl + vat_amount_tl + shipping_cost_without_vat
    total_usd = total_tl / usd_rate
    
    update_data = {
        "discount_type": discount.discount_type,
        "discount_rate": discount.discount_rate,
        "discount_amount_tl": round(discount_amount_tl, 2),
        "discount_amount_usd": round(discount_amount_usd, 2),
        "vat_amount_tl": round(vat_amount_tl, 2),
        "vat_amount_usd": round(vat_amount_usd, 2),
        "total_tl": round(total_tl, 2),
        "total_usd": round(total_usd, 2),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.quotes.update_one({"id": quote_id}, {"$set": update_data})
    updated = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    return updated

@api_router.post("/quotes/{quote_id}/convert-to-sale")
async def convert_quote_to_sale(quote_id: str, current_user: dict = Depends(require_permission("quotes_manage"))):
    quote = await db.quotes.find_one({"id": quote_id, "is_active": True}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    
    # Satış kaydı oluştur
    sale_dict = {
        "id": str(uuid.uuid4()),
        "quote_id": quote_id,
        "quote_number": quote.get("quote_number"),
        "customer_id": quote.get("customer_id"),
        "customer_name": quote.get("customer_name"),
        "items": quote.get("items", []),
        "subtotal_tl": quote.get("subtotal_tl", 0),
        "subtotal_usd": quote.get("subtotal_usd", 0),
        "discount_amount_tl": quote.get("discount_amount_tl", 0),
        "vat_amount_tl": quote.get("vat_amount_tl", 0),
        "shipping_cost": quote.get("shipping_cost", 0),
        "total_tl": quote.get("total_tl", 0),
        "total_usd": quote.get("total_usd", 0),
        "exchange_rate": quote.get("exchange_rate", 34.0),
        "sale_date": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
        "created_by_name": current_user.get("name", ""),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sales.insert_one(sale_dict.copy())
    
    # Teklif durumunu güncelle
    await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {"status": "satisa_dondu", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if "_id" in sale_dict:
        del sale_dict["_id"]
    return {"message": "Teklif satışa dönüştürüldü", "sale": sale_dict}

@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, current_user: dict = Depends(require_permission("quotes_manage"))):
    result = await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {"is_active": False, "status": "iptal", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    return {"message": "Teklif iptal edildi"}


async def calculate_segment_items(items: list, db) -> dict:
    """Calculate items for each price segment (ekonomik, standart, premium)"""
    
    # Get exchange rate
    exchange_settings = await db.exchange_rate_settings.find_one({"id": "exchange_rate_settings"}, {"_id": 0})
    usd_rate = exchange_settings.get("usd_to_try", 34.0) if exchange_settings else 34.0
    
    # Build result for each segment
    segments_result = {
        "ekonomik": {"items": [], "subtotal_tl": 0},
        "standart": {"items": [], "subtotal_tl": 0},
        "premium": {"items": [], "subtotal_tl": 0}
    }
    
    for item in items:
        product = await db.products.find_one({"id": item.get("product_id"), "is_active": True}, {"_id": 0})
        if not product:
            continue
        
        quantity = item.get("quantity", 1)
        
        # If product has matching_group, it's a segment product - find alternatives
        if product.get("matching_group"):
            # Find matched products for each segment
            matching_group = product["matching_group"]
            matched_products = await db.products.find(
                {"matching_group": matching_group, "is_active": True},
                {"_id": 0}
            ).to_list(10)
            
            for segment in ["ekonomik", "standart", "premium"]:
                # Find product for this segment
                segment_product = next(
                    (p for p in matched_products if p.get("price_segment") == segment),
                    product  # fallback to original if no match
                )
                
                # Calculate price
                currency = segment_product.get("currency", "USD")
                base_price = segment_product.get("sale_price", 0)
                if currency == "USD":
                    unit_price_tl = base_price * usd_rate
                else:
                    unit_price_tl = base_price
                
                total_price_tl = unit_price_tl * quantity
                
                segments_result[segment]["items"].append({
                    "product_id": segment_product["id"],
                    "product_name": segment_product["name"],
                    "quantity": quantity,
                    "unit": item.get("unit", "adet"),
                    "unit_price_tl": round(unit_price_tl, 2),
                    "total_price_tl": round(total_price_tl, 2),
                    "power_watt": segment_product.get("power_watt"),
                    "is_segment_product": True
                })
                segments_result[segment]["subtotal_tl"] += total_price_tl
        else:
            # Non-segment product - same for all segments
            unit_price_tl = item.get("unit_price_tl") or item.get("total_price_tl", 0) / max(quantity, 1)
            total_price_tl = item.get("total_price_tl", unit_price_tl * quantity)
            
            for segment in ["ekonomik", "standart", "premium"]:
                segments_result[segment]["items"].append({
                    "product_id": item.get("product_id"),
                    "product_name": item.get("product_name"),
                    "quantity": quantity,
                    "unit": item.get("unit", "adet"),
                    "unit_price_tl": round(unit_price_tl, 2),
                    "total_price_tl": round(total_price_tl, 2),
                    "power_watt": item.get("power_watt"),
                    "is_segment_product": False
                })
                segments_result[segment]["subtotal_tl"] += total_price_tl
    
    # Round subtotals
    for segment in segments_result:
        segments_result[segment]["subtotal_tl"] = round(segments_result[segment]["subtotal_tl"], 2)
    
    return segments_result


@api_router.get("/quotes/{quote_id}/pdf")
async def generate_quote_pdf_endpoint(quote_id: str, current_user: dict = Depends(require_permission("quotes_view"))):
    """Generate professional PDF for a quote"""
    
    # Get quote
    quote = await db.quotes.find_one({"id": quote_id, "is_active": True}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    
    # Get customer details
    customer = await db.customers.find_one({"id": quote.get("customer_id")}, {"_id": 0})
    if customer:
        quote["customer_name"] = customer.get("name", "")
        quote["customer_phone"] = customer.get("phone", "")
        quote["customer_email"] = customer.get("email", "")
        quote["customer_address"] = customer.get("address", "")
        quote["customer_city"] = customer.get("city", "")
        quote["customer_district"] = customer.get("district", "")
        quote["customer_category_id"] = customer.get("customer_category_id", "")
        quote["customer_category_name"] = customer.get("category_name", "")
        
        # If category_name not populated, fetch it
        if not quote["customer_category_name"] and quote["customer_category_id"]:
            category = await db.customer_categories.find_one({"id": quote["customer_category_id"]}, {"_id": 0})
            if category:
                quote["customer_category_name"] = category.get("name", "")
    
    # Get product datasheets for items (and power_watt)
    items = quote.get("items", [])
    for item in items:
        product_id = item.get("product_id")
        if product_id:
            product = await db.products.find_one({"id": product_id}, {"_id": 0})
            if product:
                item["datasheet_url"] = product.get("datasheet_url")
                item["description"] = product.get("description", "")
                item["power_watt"] = product.get("power_watt")
                item["category_name"] = product.get("category_name", "")
    
    quote["items"] = items
    
    # Calculate segment items if include_segment_options is true
    if quote.get("include_segment_options"):
        segment_items = await calculate_segment_items(items, db)
        quote["segment_items"] = segment_items
    
    # Get company settings
    company_settings = await db.company_settings.find_one({"id": "company_settings"}, {"_id": 0})
    if not company_settings:
        company_settings = {
            "company_name": "Solar Enerji A.Ş.",
            "phone": "",
            "email": "",
            "address": "",
            "warranty_text": ""
        }
    
    # Map logo_url to logo for PDF generator
    if company_settings.get("logo_url"):
        company_settings["logo"] = company_settings["logo_url"]
    
    # Generate PDF
    try:
        pdf_buffer = generate_quote_pdf(
            quote_data=quote,
            company_settings=company_settings,
            upload_dir=str(UPLOAD_DIR)
        )
        
        # Create filename
        quote_number = quote.get("quote_number", quote_id)
        filename = f"Teklif_{quote_number}.pdf"
        
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF oluşturma hatası: {str(e)}")


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

# ==================== ENERGY PRICING SETTINGS ====================

@api_router.get("/settings/epdk-subscription-types")
async def get_epdk_subscription_types():
    """Get EPDK electricity subscription types"""
    return EPDK_SUBSCRIPTION_TYPES

@api_router.get("/settings/energy-prices")
async def get_energy_prices(current_user: dict = Depends(get_current_user)):
    """Get energy pricing settings (electricity rates + diesel)"""
    settings = await db.company_settings.find_one({"id": "company_settings"}, {"_id": 0})
    
    # Default values if not set
    electricity_rates = []
    if settings and settings.get("electricity_rates"):
        electricity_rates = settings["electricity_rates"]
    else:
        # Initialize with EPDK defaults
        electricity_rates = [
            {"type_code": t["type_code"], "type_name": t["type_name"], "price_per_kwh": t["default_price"]}
            for t in EPDK_SUBSCRIPTION_TYPES
        ]
    
    diesel_price = settings.get("diesel_price_per_liter", 45.0) if settings else 45.0
    diesel_consumption = settings.get("diesel_consumption_per_kwh", 0.35) if settings else 0.35
    
    return {
        "electricity_rates": electricity_rates,
        "diesel_price_per_liter": diesel_price,
        "diesel_consumption_per_kwh": diesel_consumption
    }

@api_router.put("/settings/energy-prices")
async def update_energy_prices(
    data: dict,
    current_user: dict = Depends(require_permission("settings_manage"))
):
    """Update energy pricing settings"""
    update_data = {}
    
    if "electricity_rates" in data:
        update_data["electricity_rates"] = data["electricity_rates"]
    
    if "diesel_price_per_liter" in data:
        update_data["diesel_price_per_liter"] = float(data["diesel_price_per_liter"])
    
    if "diesel_consumption_per_kwh" in data:
        update_data["diesel_consumption_per_kwh"] = float(data["diesel_consumption_per_kwh"])
    
    if update_data:
        await db.company_settings.update_one(
            {"id": "company_settings"},
            {"$set": update_data},
            upsert=True
        )
    
    return await get_energy_prices(current_user)

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
    exp_dict["created_by"] = current_user["id"]
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
    if "_id" in exp_dict:
        del exp_dict["_id"]
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
        try:
            exp_date_raw = exp.get("expense_date")
            if isinstance(exp_date_raw, str):
                exp_date = datetime.fromisoformat(exp_date_raw.replace("Z", "+00:00"))
            elif isinstance(exp_date_raw, datetime):
                exp_date = exp_date_raw if exp_date_raw.tzinfo else exp_date_raw.replace(tzinfo=timezone.utc)
            else:
                continue
            
            # Ensure timezone aware
            if exp_date.tzinfo is None:
                exp_date = exp_date.replace(tzinfo=timezone.utc)
                
            amount_tl = exp.get("amount_tl", exp.get("amount", 0))
            
            if exp_date >= year_start:
                yearly_total += amount_tl
            
            if exp_date >= month_start:
                monthly_total += amount_tl
                cat_name = exp.get("category_name", "Diğer")
                by_category[cat_name] = by_category.get(cat_name, 0) + amount_tl
        except Exception:
            continue
    
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
        try:
            sale_date_raw = sale.get("sale_date")
            if isinstance(sale_date_raw, str):
                sale_date = datetime.fromisoformat(sale_date_raw.replace("Z", "+00:00"))
            elif isinstance(sale_date_raw, datetime):
                sale_date = sale_date_raw if sale_date_raw.tzinfo else sale_date_raw.replace(tzinfo=timezone.utc)
            else:
                continue
            if sale_date.tzinfo is None:
                sale_date = sale_date.replace(tzinfo=timezone.utc)
            if sale_date >= month_start:
                monthly_sales_tl += sale.get("sale_amount_tl", 0)
                monthly_profit_tl += sale.get("profit_tl", 0)
        except Exception:
            continue
    
    # Get expenses
    expenses = await db.expenses.find({"is_active": True}, {"_id": 0}).to_list(10000)
    monthly_expenses_tl = 0
    
    for exp in expenses:
        try:
            exp_date_raw = exp.get("expense_date")
            if isinstance(exp_date_raw, str):
                exp_date = datetime.fromisoformat(exp_date_raw.replace("Z", "+00:00"))
            elif isinstance(exp_date_raw, datetime):
                exp_date = exp_date_raw if exp_date_raw.tzinfo else exp_date_raw.replace(tzinfo=timezone.utc)
            else:
                continue
            if exp_date.tzinfo is None:
                exp_date = exp_date.replace(tzinfo=timezone.utc)
            if exp_date >= month_start:
                monthly_expenses_tl += exp.get("amount_tl", exp.get("amount", 0))
        except Exception:
            continue
    
    # Calculate net profit
    net_profit = monthly_sales_tl - monthly_expenses_tl
    
    return {
        "month": now.strftime("%B %Y"),
        "total_income": monthly_sales_tl,
        "total_expenses": monthly_expenses_tl,
        "gross_profit": monthly_profit_tl,
        "net_profit": net_profit
    }

# ==================== PACKAGE CATEGORIES API ====================

@api_router.get("/package-categories")
async def get_package_categories(current_user: dict = Depends(require_permission("products_view"))):
    categories = await db.package_categories.find({"is_active": True}, {"_id": 0}).sort("name", 1).to_list(1000)
    return categories

@api_router.post("/package-categories")
async def create_package_category(category: PackageCategoryCreate, current_user: dict = Depends(require_permission("products_manage"))):
    existing = await db.package_categories.find_one({"name": category.name, "is_active": True}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Bu isimde kategori zaten var")
    
    cat_dict = category.model_dump()
    cat_dict["id"] = str(uuid.uuid4())
    cat_dict["is_active"] = True
    cat_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.package_categories.insert_one(cat_dict.copy())
    if "_id" in cat_dict:
        del cat_dict["_id"]
    return cat_dict

@api_router.put("/package-categories/{category_id}")
async def update_package_category(category_id: str, category: PackageCategoryCreate, current_user: dict = Depends(require_permission("products_manage"))):
    existing = await db.package_categories.find_one({"id": category_id, "is_active": True}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    update_data = category.model_dump()
    await db.package_categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated = await db.package_categories.find_one({"id": category_id}, {"_id": 0})
    return updated

@api_router.delete("/package-categories/{category_id}")
async def delete_package_category(category_id: str, current_user: dict = Depends(require_permission("products_manage"))):
    # Check if category has packages
    pkg_count = await db.packages.count_documents({"category_id": category_id, "is_active": True})
    if pkg_count > 0:
        raise HTTPException(status_code=400, detail=f"Bu kategoride {pkg_count} paket var. Önce paketleri silin veya taşıyın.")
    
    result = await db.package_categories.update_one({"id": category_id}, {"$set": {"is_active": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    return {"message": "Kategori silindi"}

# ==================== PACKAGES API ====================

@api_router.get("/packages")
async def get_packages(category_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(require_permission("products_view"))):
    query = {"is_active": True}
    if category_id:
        query["category_id"] = category_id
    if status:
        query["status"] = status
    
    packages = await db.packages.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Check if user can see cost/profit info
    can_see_profit = "all" in current_user.get("permissions", []) or "products_prices_view" in current_user.get("permissions", [])
    
    if not can_see_profit:
        for pkg in packages:
            pkg.pop("total_cost_usd", None)
            pkg.pop("total_cost_tl", None)
            pkg.pop("profit_usd", None)
            pkg.pop("profit_tl", None)
            pkg.pop("profit_margin", None)
            for item in pkg.get("items", []):
                item.pop("unit_cost", None)
                item.pop("total_cost", None)
    
    return packages

@api_router.get("/packages/{package_id}")
async def get_package(package_id: str, current_user: dict = Depends(require_permission("products_view"))):
    package = await db.packages.find_one({"id": package_id, "is_active": True}, {"_id": 0})
    if not package:
        raise HTTPException(status_code=404, detail="Paket bulunamadı")
    
    # Check if user can see cost/profit info
    can_see_profit = "all" in current_user.get("permissions", []) or "products_prices_view" in current_user.get("permissions", [])
    
    if not can_see_profit:
        package.pop("total_cost_usd", None)
        package.pop("total_cost_tl", None)
        package.pop("profit_usd", None)
        package.pop("profit_tl", None)
        package.pop("profit_margin", None)
        for item in package.get("items", []):
            item.pop("unit_cost", None)
            item.pop("total_cost", None)
    
    return package

@api_router.post("/packages")
async def create_package(package: PackageCreate, current_user: dict = Depends(require_permission("products_manage"))):
    # Verify category exists
    category = await db.package_categories.find_one({"id": package.category_id, "is_active": True}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Paket kategorisi bulunamadı")
    
    # Get exchange rate
    exchange_settings = await db.exchange_rate_settings.find_one({"id": "exchange_rate_settings"}, {"_id": 0})
    usd_rate = exchange_settings.get("usd_to_try", 34.0) if exchange_settings else 34.0
    
    # Calculate totals
    total_cost_usd = 0
    total_price_usd = 0
    items_processed = []
    min_available = float('inf')
    
    for item in package.items:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Ürün bulunamadı: {item['product_id']}")
        
        quantity = item.get("quantity", 1)
        product_currency = product.get("currency", "USD")
        
        # Get cost and price from product
        unit_cost = product.get("purchase_price", 0)
        unit_price = item.get("unit_price") or product.get("sale_price", 0)
        
        # Convert to USD
        if product_currency == "TRY":
            unit_cost_usd = unit_cost / usd_rate
            unit_price_usd = unit_price / usd_rate
        else:
            unit_cost_usd = unit_cost
            unit_price_usd = unit_price
        
        total_cost = unit_cost_usd * quantity
        total_price = unit_price_usd * quantity
        
        total_cost_usd += total_cost
        total_price_usd += total_price
        
        # Calculate available stock for this package
        stock = product.get("stock_quantity", 0)
        available_for_this = stock // quantity if quantity > 0 else 0
        min_available = min(min_available, available_for_this)
        
        items_processed.append({
            "product_id": product["id"],
            "product_name": product["name"],
            "quantity": quantity,
            "unit_cost": round(unit_cost_usd, 2),
            "unit_price": round(unit_price_usd, 2),
            "currency": "USD",
            "total_cost": round(total_cost, 2),
            "total_price": round(total_price, 2),
            "stock_quantity": stock
        })
    
    # Calculate profit
    profit_usd = total_price_usd - total_cost_usd
    profit_margin = (profit_usd / total_cost_usd * 100) if total_cost_usd > 0 else 0
    
    package_dict = {
        "id": str(uuid.uuid4()),
        "name": package.name,
        "category_id": package.category_id,
        "category_name": category["name"],
        "description": package.description,
        "level": package.level,
        "system_power_kwp": package.system_power_kwp,
        "battery_capacity_kwh": package.battery_capacity_kwh,
        "daily_production_kwh": package.daily_production_kwh,
        "yearly_production_kwh": package.yearly_production_kwh,
        "suitable_for": package.suitable_for,
        "items": items_processed,
        "total_cost_usd": round(total_cost_usd, 2),
        "total_cost_tl": round(total_cost_usd * usd_rate, 2),
        "total_price_usd": round(total_price_usd, 2),
        "total_price_tl": round(total_price_usd * usd_rate, 2),
        "profit_usd": round(profit_usd, 2),
        "profit_tl": round(profit_usd * usd_rate, 2),
        "profit_margin": round(profit_margin, 2),
        "exchange_rate": usd_rate,
        "status": package.status,
        "available_stock": int(min_available) if min_available != float('inf') else 0,
        "created_by": current_user["id"],
        "created_by_name": current_user.get("name", ""),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.packages.insert_one(package_dict.copy())
    if "_id" in package_dict:
        del package_dict["_id"]
    
    return package_dict

@api_router.put("/packages/{package_id}")
async def update_package(package_id: str, package: PackageCreate, current_user: dict = Depends(require_permission("products_manage"))):
    existing = await db.packages.find_one({"id": package_id, "is_active": True}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Paket bulunamadı")
    
    # Verify category exists
    category = await db.package_categories.find_one({"id": package.category_id, "is_active": True}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Paket kategorisi bulunamadı")
    
    # Get exchange rate
    exchange_settings = await db.exchange_rate_settings.find_one({"id": "exchange_rate_settings"}, {"_id": 0})
    usd_rate = exchange_settings.get("usd_to_try", 34.0) if exchange_settings else 34.0
    
    # Calculate totals
    total_cost_usd = 0
    total_price_usd = 0
    items_processed = []
    min_available = float('inf')
    
    for item in package.items:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Ürün bulunamadı: {item['product_id']}")
        
        quantity = item.get("quantity", 1)
        product_currency = product.get("currency", "USD")
        
        unit_cost = product.get("purchase_price", 0)
        unit_price = item.get("unit_price") or product.get("sale_price", 0)
        
        if product_currency == "TRY":
            unit_cost_usd = unit_cost / usd_rate
            unit_price_usd = unit_price / usd_rate
        else:
            unit_cost_usd = unit_cost
            unit_price_usd = unit_price
        
        total_cost = unit_cost_usd * quantity
        total_price = unit_price_usd * quantity
        
        total_cost_usd += total_cost
        total_price_usd += total_price
        
        stock = product.get("stock_quantity", 0)
        available_for_this = stock // quantity if quantity > 0 else 0
        min_available = min(min_available, available_for_this)
        
        items_processed.append({
            "product_id": product["id"],
            "product_name": product["name"],
            "quantity": quantity,
            "unit_cost": round(unit_cost_usd, 2),
            "unit_price": round(unit_price_usd, 2),
            "currency": "USD",
            "total_cost": round(total_cost, 2),
            "total_price": round(total_price, 2),
            "stock_quantity": stock
        })
    
    profit_usd = total_price_usd - total_cost_usd
    profit_margin = (profit_usd / total_cost_usd * 100) if total_cost_usd > 0 else 0
    
    update_data = {
        "name": package.name,
        "category_id": package.category_id,
        "category_name": category["name"],
        "description": package.description,
        "level": package.level,
        "system_power_kwp": package.system_power_kwp,
        "battery_capacity_kwh": package.battery_capacity_kwh,
        "daily_production_kwh": package.daily_production_kwh,
        "yearly_production_kwh": package.yearly_production_kwh,
        "suitable_for": package.suitable_for,
        "items": items_processed,
        "total_cost_usd": round(total_cost_usd, 2),
        "total_cost_tl": round(total_cost_usd * usd_rate, 2),
        "total_price_usd": round(total_price_usd, 2),
        "total_price_tl": round(total_price_usd * usd_rate, 2),
        "profit_usd": round(profit_usd, 2),
        "profit_tl": round(profit_usd * usd_rate, 2),
        "profit_margin": round(profit_margin, 2),
        "exchange_rate": usd_rate,
        "status": package.status,
        "available_stock": int(min_available) if min_available != float('inf') else 0,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.packages.update_one({"id": package_id}, {"$set": update_data})
    
    updated = await db.packages.find_one({"id": package_id}, {"_id": 0})
    return updated

@api_router.put("/packages/{package_id}/status")
async def update_package_status(package_id: str, status: str, current_user: dict = Depends(require_permission("products_manage"))):
    if status not in ["active", "inactive", "campaign"]:
        raise HTTPException(status_code=400, detail="Geçersiz durum")
    
    result = await db.packages.update_one(
        {"id": package_id, "is_active": True},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Paket bulunamadı")
    
    updated = await db.packages.find_one({"id": package_id}, {"_id": 0})
    return updated

@api_router.delete("/packages/{package_id}")
async def delete_package(package_id: str, current_user: dict = Depends(require_permission("products_manage"))):
    result = await db.packages.update_one({"id": package_id}, {"$set": {"is_active": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Paket bulunamadı")
    return {"message": "Paket silindi"}

# ==================== HR / EMPLOYEES API ====================

@api_router.get("/employees")
async def get_employees(current_user: dict = Depends(require_permission("hr_view"))):
    employees = await db.employees.find({"is_active": True}, {"_id": 0}).sort("name", 1).to_list(1000)
    return employees

@api_router.get("/employees/{employee_id}")
async def get_employee(employee_id: str, current_user: dict = Depends(require_permission("hr_view"))):
    employee = await db.employees.find_one({"id": employee_id, "is_active": True}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    return employee

@api_router.post("/employees")
async def create_employee(employee: EmployeeCreate, current_user: dict = Depends(require_permission("hr_manage"))):
    # Check if employee_no already exists
    existing = await db.employees.find_one({"employee_no": employee.employee_no, "is_active": True})
    if existing:
        raise HTTPException(status_code=400, detail="Bu personel numarası zaten kullanımda")
    
    employee_dict = employee.model_dump()
    employee_dict["id"] = str(uuid.uuid4())
    employee_dict["is_active"] = True
    employee_dict["created_by"] = current_user["id"]
    employee_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    # Calculate daily wage from monthly salary if monthly type
    if employee.employment_type == "monthly" and employee.monthly_salary > 0:
        employee_dict["daily_wage"] = round(employee.monthly_salary / 30, 2)
    
    await db.employees.insert_one(employee_dict.copy())
    if "_id" in employee_dict:
        del employee_dict["_id"]
    return employee_dict

@api_router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, employee: EmployeeCreate, current_user: dict = Depends(require_permission("hr_manage"))):
    existing = await db.employees.find_one({"id": employee_id, "is_active": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    
    # Check if employee_no already exists for another employee
    duplicate = await db.employees.find_one({"employee_no": employee.employee_no, "is_active": True, "id": {"$ne": employee_id}})
    if duplicate:
        raise HTTPException(status_code=400, detail="Bu personel numarası zaten kullanımda")
    
    update_data = employee.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Calculate daily wage from monthly salary if monthly type
    if employee.employment_type == "monthly" and employee.monthly_salary > 0:
        update_data["daily_wage"] = round(employee.monthly_salary / 30, 2)
    
    await db.employees.update_one({"id": employee_id}, {"$set": update_data})
    updated = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    return updated

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: dict = Depends(require_permission("hr_manage"))):
    result = await db.employees.update_one({"id": employee_id}, {"$set": {"is_active": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    return {"message": "Personel silindi"}

# ==================== ATTENDANCE API ====================

@api_router.get("/attendance")
async def get_attendance(
    employee_id: Optional[str] = None,
    month: Optional[str] = None,  # YYYY-MM
    current_user: dict = Depends(require_permission("hr_view"))
):
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    attendance = await db.attendance.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    return attendance

@api_router.post("/attendance")
async def create_or_update_attendance(attendance: AttendanceCreate, current_user: dict = Depends(require_permission("hr_manage"))):
    # Check if attendance for this date already exists
    existing = await db.attendance.find_one({
        "employee_id": attendance.employee_id,
        "date": attendance.date
    })
    
    if existing:
        # Update existing
        await db.attendance.update_one(
            {"id": existing["id"]},
            {"$set": {"status": attendance.status, "notes": attendance.notes}}
        )
        updated = await db.attendance.find_one({"id": existing["id"]}, {"_id": 0})
        return updated
    else:
        # Create new
        attendance_dict = attendance.model_dump()
        attendance_dict["id"] = str(uuid.uuid4())
        attendance_dict["created_by"] = current_user["id"]
        attendance_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.attendance.insert_one(attendance_dict.copy())
        if "_id" in attendance_dict:
            del attendance_dict["_id"]
        return attendance_dict

@api_router.post("/attendance/bulk")
async def bulk_update_attendance(
    attendances: List[AttendanceCreate],
    current_user: dict = Depends(require_permission("hr_manage"))
):
    results = []
    for att in attendances:
        existing = await db.attendance.find_one({
            "employee_id": att.employee_id,
            "date": att.date
        })
        
        if existing:
            await db.attendance.update_one(
                {"id": existing["id"]},
                {"$set": {"status": att.status, "notes": att.notes}}
            )
            updated = await db.attendance.find_one({"id": existing["id"]}, {"_id": 0})
            results.append(updated)
        else:
            att_dict = att.model_dump()
            att_dict["id"] = str(uuid.uuid4())
            att_dict["created_by"] = current_user["id"]
            att_dict["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.attendance.insert_one(att_dict.copy())
            if "_id" in att_dict:
                del att_dict["_id"]
            results.append(att_dict)
    
    return results

# ==================== ADVANCES API ====================

@api_router.get("/advances")
async def get_advances(
    employee_id: Optional[str] = None,
    is_deducted: Optional[bool] = None,
    current_user: dict = Depends(require_permission("payroll_view"))
):
    query = {"is_active": True}
    if employee_id:
        query["employee_id"] = employee_id
    if is_deducted is not None:
        query["is_deducted"] = is_deducted
    
    advances = await db.advances.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return advances

@api_router.post("/advances")
async def create_advance(advance: AdvanceCreate, current_user: dict = Depends(require_permission("payroll_manage"))):
    advance_dict = advance.model_dump()
    advance_dict["id"] = str(uuid.uuid4())
    advance_dict["is_active"] = True
    advance_dict["created_by"] = current_user["id"]
    advance_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.advances.insert_one(advance_dict.copy())
    if "_id" in advance_dict:
        del advance_dict["_id"]
    return advance_dict

@api_router.put("/advances/{advance_id}")
async def update_advance(advance_id: str, advance: AdvanceCreate, current_user: dict = Depends(require_permission("payroll_manage"))):
    existing = await db.advances.find_one({"id": advance_id, "is_active": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Avans bulunamadı")
    
    update_data = advance.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.advances.update_one({"id": advance_id}, {"$set": update_data})
    updated = await db.advances.find_one({"id": advance_id}, {"_id": 0})
    return updated

@api_router.delete("/advances/{advance_id}")
async def delete_advance(advance_id: str, current_user: dict = Depends(require_permission("payroll_manage"))):
    result = await db.advances.update_one({"id": advance_id}, {"$set": {"is_active": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Avans bulunamadı")
    return {"message": "Avans silindi"}

# ==================== BONUSES API ====================

@api_router.get("/bonuses")
async def get_bonuses(
    employee_id: Optional[str] = None,
    month: Optional[str] = None,
    current_user: dict = Depends(require_permission("payroll_view"))
):
    query = {"is_active": True}
    if employee_id:
        query["employee_id"] = employee_id
    if month:
        query["month"] = month
    
    bonuses = await db.bonuses.find(query, {"_id": 0}).sort("month", -1).to_list(1000)
    return bonuses

@api_router.post("/bonuses")
async def create_bonus(bonus: BonusCreate, current_user: dict = Depends(require_permission("payroll_manage"))):
    bonus_dict = bonus.model_dump()
    bonus_dict["id"] = str(uuid.uuid4())
    bonus_dict["is_active"] = True
    bonus_dict["created_by"] = current_user["id"]
    bonus_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.bonuses.insert_one(bonus_dict.copy())
    if "_id" in bonus_dict:
        del bonus_dict["_id"]
    return bonus_dict

@api_router.delete("/bonuses/{bonus_id}")
async def delete_bonus(bonus_id: str, current_user: dict = Depends(require_permission("payroll_manage"))):
    result = await db.bonuses.update_one({"id": bonus_id}, {"$set": {"is_active": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prim bulunamadı")
    return {"message": "Prim silindi"}

# ==================== EMPLOYEE EXPENSES API ====================

@api_router.get("/employee-expenses")
async def get_employee_expenses(
    employee_id: Optional[str] = None,
    month: Optional[str] = None,
    current_user: dict = Depends(require_permission("payroll_view"))
):
    query = {"is_active": True}
    if employee_id:
        query["employee_id"] = employee_id
    if month:
        query["month"] = month
    
    expenses = await db.employee_expenses.find(query, {"_id": 0}).sort("month", -1).to_list(1000)
    return expenses

@api_router.post("/employee-expenses")
async def create_employee_expense(expense: EmployeeExpenseCreate, current_user: dict = Depends(require_permission("payroll_manage"))):
    expense_dict = expense.model_dump()
    expense_dict["id"] = str(uuid.uuid4())
    expense_dict["is_active"] = True
    expense_dict["created_by"] = current_user["id"]
    expense_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.employee_expenses.insert_one(expense_dict.copy())
    if "_id" in expense_dict:
        del expense_dict["_id"]
    return expense_dict

@api_router.delete("/employee-expenses/{expense_id}")
async def delete_employee_expense(expense_id: str, current_user: dict = Depends(require_permission("payroll_manage"))):
    result = await db.employee_expenses.update_one({"id": expense_id}, {"$set": {"is_active": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Gider bulunamadı")
    return {"message": "Gider silindi"}

# ==================== SALARY/PAYROLL API ====================

@api_router.get("/salaries")
async def get_salaries(
    employee_id: Optional[str] = None,
    month: Optional[str] = None,
    current_user: dict = Depends(require_permission("payroll_view"))
):
    query = {"is_active": True}
    if employee_id:
        query["employee_id"] = employee_id
    if month:
        query["month"] = month
    
    salaries = await db.salaries.find(query, {"_id": 0}).sort("month", -1).to_list(1000)
    return salaries

@api_router.get("/salaries/calculate/{employee_id}/{month}")
async def calculate_salary(
    employee_id: str,
    month: str,  # YYYY-MM
    current_user: dict = Depends(require_permission("payroll_view"))
):
    """Belirli bir personel için aylık bordro hesapla"""
    
    # Get employee
    employee = await db.employees.find_one({"id": employee_id, "is_active": True}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Personel bulunamadı")
    
    # Get attendance for the month
    attendance_records = await db.attendance.find({
        "employee_id": employee_id,
        "date": {"$regex": f"^{month}"}
    }, {"_id": 0}).to_list(100)
    
    # Calculate days
    present_days = 0
    absent_days = 0
    half_days = 0
    leave_days = 0
    sick_days = 0
    
    for record in attendance_records:
        status = record.get("status", "present")
        if status == "present":
            present_days += 1
        elif status == "absent":
            absent_days += 1
        elif status == "half_day":
            half_days += 1
            present_days += 0.5
        elif status == "leave":
            leave_days += 1
        elif status == "sick":
            sick_days += 1
    
    # Calculate salary
    gross_salary = employee.get("monthly_salary", 0)
    daily_wage = employee.get("daily_wage", 0)
    
    if employee.get("employment_type") == "monthly":
        daily_wage = gross_salary / 30 if gross_salary > 0 else 0
    
    # Absence deduction (absent days + half of half_days)
    absence_deduction = (absent_days + (half_days * 0.5)) * daily_wage
    
    # Get advances for this month (not yet deducted)
    advances = await db.advances.find({
        "employee_id": employee_id,
        "is_deducted": False,
        "is_active": True
    }, {"_id": 0}).to_list(100)
    advance_deduction = sum(a.get("amount", 0) for a in advances)
    
    # Get bonuses for this month
    bonuses = await db.bonuses.find({
        "employee_id": employee_id,
        "month": month,
        "is_active": True
    }, {"_id": 0}).to_list(100)
    total_bonus = sum(b.get("amount", 0) for b in bonuses)
    
    # Calculate net salary
    net_salary = gross_salary - absence_deduction - advance_deduction + total_bonus
    
    return {
        "employee_id": employee_id,
        "employee_name": employee.get("name", ""),
        "employee_no": employee.get("employee_no", ""),
        "position": employee.get("position", ""),
        "employment_type": employee.get("employment_type", "monthly"),
        "month": month,
        "gross_salary": round(gross_salary, 2),
        "daily_wage": round(daily_wage, 2),
        "working_days": 30,
        "present_days": present_days,
        "absent_days": absent_days,
        "half_days": half_days,
        "leave_days": leave_days,
        "sick_days": sick_days,
        "absence_deduction": round(absence_deduction, 2),
        "advance_deduction": round(advance_deduction, 2),
        "advances": advances,
        "total_bonus": round(total_bonus, 2),
        "bonuses": bonuses,
        "other_deductions": 0,
        "net_salary": round(net_salary, 2)
    }

@api_router.post("/salaries")
async def create_or_update_salary(salary: SalaryCreate, current_user: dict = Depends(require_permission("payroll_manage"))):
    # Check if salary for this employee/month already exists
    existing = await db.salaries.find_one({
        "employee_id": salary.employee_id,
        "month": salary.month,
        "is_active": True
    })
    
    if existing:
        if existing.get("is_locked"):
            raise HTTPException(status_code=400, detail="Bu bordro kilitli ve değiştirilemez")
        
        update_data = salary.model_dump()
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.salaries.update_one({"id": existing["id"]}, {"$set": update_data})
        updated = await db.salaries.find_one({"id": existing["id"]}, {"_id": 0})
        return updated
    else:
        salary_dict = salary.model_dump()
        salary_dict["id"] = str(uuid.uuid4())
        salary_dict["is_active"] = True
        salary_dict["created_by"] = current_user["id"]
        salary_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.salaries.insert_one(salary_dict.copy())
        if "_id" in salary_dict:
            del salary_dict["_id"]
        
        # Mark advances as deducted
        if salary.advance_deduction > 0:
            await db.advances.update_many(
                {"employee_id": salary.employee_id, "is_deducted": False, "is_active": True},
                {"$set": {"is_deducted": True, "deducted_month": salary.month}}
            )
        
        return salary_dict

@api_router.put("/salaries/{salary_id}/pay")
async def mark_salary_paid(salary_id: str, current_user: dict = Depends(require_permission("payroll_manage"))):
    existing = await db.salaries.find_one({"id": salary_id, "is_active": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Bordro bulunamadı")
    
    await db.salaries.update_one(
        {"id": salary_id},
        {"$set": {"is_paid": True, "paid_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    updated = await db.salaries.find_one({"id": salary_id}, {"_id": 0})
    return updated

@api_router.put("/salaries/{salary_id}/lock")
async def lock_salary(salary_id: str, current_user: dict = Depends(require_permission("payroll_manage"))):
    existing = await db.salaries.find_one({"id": salary_id, "is_active": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Bordro bulunamadı")
    
    await db.salaries.update_one({"id": salary_id}, {"$set": {"is_locked": True}})
    updated = await db.salaries.find_one({"id": salary_id}, {"_id": 0})
    return updated

# ==================== HR STATS API ====================

@api_router.get("/hr/stats")
async def get_hr_stats(
    month: Optional[str] = None,
    current_user: dict = Depends(require_permission("hr_view"))
):
    """HR özet istatistikleri"""
    now = datetime.now(timezone.utc)
    current_month = month or now.strftime("%Y-%m")
    
    # Total active employees
    total_employees = await db.employees.count_documents({"is_active": True})
    
    # Get all employees
    employees = await db.employees.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    # Total monthly salary
    total_monthly_salary = sum(e.get("monthly_salary", 0) for e in employees)
    
    # Total advances (not deducted)
    advances = await db.advances.find({"is_active": True, "is_deducted": False}, {"_id": 0}).to_list(1000)
    total_pending_advances = sum(a.get("amount", 0) for a in advances)
    
    # Total bonuses for current month
    bonuses = await db.bonuses.find({"is_active": True, "month": current_month}, {"_id": 0}).to_list(1000)
    total_bonuses = sum(b.get("amount", 0) for b in bonuses)
    
    # Total employee expenses for current month
    expenses = await db.employee_expenses.find({"is_active": True, "month": current_month}, {"_id": 0}).to_list(1000)
    total_expenses = sum(e.get("amount", 0) for e in expenses)
    
    # Per employee average cost
    avg_cost_per_employee = (total_monthly_salary + total_expenses) / total_employees if total_employees > 0 else 0
    
    # Salaries for current month
    salaries = await db.salaries.find({"is_active": True, "month": current_month}, {"_id": 0}).to_list(1000)
    total_net_salaries = sum(s.get("net_salary", 0) for s in salaries)
    paid_salaries = sum(1 for s in salaries if s.get("is_paid"))
    unpaid_salaries = len(salaries) - paid_salaries
    
    return {
        "month": current_month,
        "total_employees": total_employees,
        "total_monthly_salary": round(total_monthly_salary, 2),
        "total_pending_advances": round(total_pending_advances, 2),
        "total_bonuses": round(total_bonuses, 2),
        "total_expenses": round(total_expenses, 2),
        "avg_cost_per_employee": round(avg_cost_per_employee, 2),
        "total_net_salaries": round(total_net_salaries, 2),
        "paid_salaries_count": paid_salaries,
        "unpaid_salaries_count": unpaid_salaries
    }

# ==================== REPORTS API ====================

@api_router.get("/reports/comprehensive")
async def get_comprehensive_reports(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = "monthly",  # daily, weekly, monthly, yearly
    current_user: dict = Depends(require_permission("finance_view"))
):
    """Kapsamlı raporlar - tüm metrikleri döndürür"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Parse date filters
    filter_start = None
    filter_end = None
    if start_date:
        try:
            filter_start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except:
            filter_start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    if end_date:
        try:
            filter_end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except:
            filter_end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            filter_end = filter_end.replace(hour=23, minute=59, second=59)
    
    # Period calculations
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    year_start = today_start.replace(month=1, day=1)
    
    # Get exchange rates
    exchange_settings = await db.exchange_rate_settings.find_one({"id": "exchange_rate_settings"}, {"_id": 0})
    usd_rate = exchange_settings.get("usd_to_try", 34.0) if exchange_settings else 34.0
    eur_rate = exchange_settings.get("eur_to_try", 37.0) if exchange_settings else 37.0
    
    # ==================== SALES DATA ====================
    all_sales = await db.sales.find({"is_active": True}, {"_id": 0}).to_list(10000)
    
    def parse_sale_date(sale):
        date_str = sale.get("sale_date")
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except:
            return None
    
    # Filter sales by date range if provided
    filtered_sales = all_sales
    if filter_start or filter_end:
        filtered_sales = []
        for sale in all_sales:
            sale_date = parse_sale_date(sale)
            if sale_date:
                if filter_start and sale_date < filter_start:
                    continue
                if filter_end and sale_date > filter_end:
                    continue
                filtered_sales.append(sale)
    
    # Calculate revenue by periods
    daily_revenue = sum(s.get("sale_amount_tl", 0) for s in all_sales if parse_sale_date(s) and parse_sale_date(s) >= today_start)
    weekly_revenue = sum(s.get("sale_amount_tl", 0) for s in all_sales if parse_sale_date(s) and parse_sale_date(s) >= week_start)
    monthly_revenue = sum(s.get("sale_amount_tl", 0) for s in all_sales if parse_sale_date(s) and parse_sale_date(s) >= month_start)
    yearly_revenue = sum(s.get("sale_amount_tl", 0) for s in all_sales if parse_sale_date(s) and parse_sale_date(s) >= year_start)
    
    # Total filtered revenue
    filtered_revenue = sum(s.get("sale_amount_tl", 0) for s in filtered_sales)
    filtered_cost = sum(s.get("purchase_amount_tl", 0) for s in filtered_sales)
    filtered_profit = filtered_revenue - filtered_cost
    
    # Sales details for export (with user info)
    sales_details = []
    users_cache = {}
    
    for sale in filtered_sales:
        user_id = sale.get("created_by")
        user_name = sale.get("created_by_name", "Bilinmiyor")
        
        if user_id and user_id not in users_cache:
            user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "name": True})
            users_cache[user_id] = user_doc.get("name", "Bilinmiyor") if user_doc else "Bilinmiyor"
        
        if user_id:
            user_name = users_cache.get(user_id, user_name)
        
        sales_details.append({
            "id": sale.get("id"),
            "date": sale.get("sale_date"),
            "customer_name": sale.get("customer_name", ""),
            "description": sale.get("description", ""),
            "sale_amount_tl": sale.get("sale_amount_tl", 0),
            "purchase_amount_tl": sale.get("purchase_amount_tl", 0),
            "profit_tl": sale.get("sale_amount_tl", 0) - sale.get("purchase_amount_tl", 0),
            "paid_amount_tl": sale.get("paid_amount_tl", 0),
            "remaining_amount_tl": sale.get("remaining_amount_tl", 0),
            "payment_status": sale.get("payment_status", ""),
            "created_by": user_name
        })
    
    # Sales by user (top performers)
    sales_by_user = {}
    for sale in all_sales:
        user_name = sale.get("created_by_name", "Bilinmiyor")
        if user_name not in sales_by_user:
            sales_by_user[user_name] = {"total_revenue": 0, "sale_count": 0}
        sales_by_user[user_name]["total_revenue"] += sale.get("sale_amount_tl", 0)
        sales_by_user[user_name]["sale_count"] += 1
    
    top_performers = sorted(
        [{"name": k, **v} for k, v in sales_by_user.items()],
        key=lambda x: x["total_revenue"],
        reverse=True
    )[:10]
    
    # ==================== STOCK VALUE ====================
    products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(10000)
    
    stock_cost_usd = 0
    stock_cost_tl = 0
    stock_sale_usd = 0
    stock_sale_tl = 0
    
    for p in products:
        currency = p.get("currency", "USD").upper()
        purchase_price = p.get("purchase_price", 0)
        sale_price = p.get("sale_price", 0)
        quantity = p.get("stock_quantity", 0)
        
        if currency == "USD":
            stock_cost_usd += purchase_price * quantity
            stock_sale_usd += sale_price * quantity
        elif currency == "EUR":
            stock_cost_usd += (purchase_price * eur_rate / usd_rate) * quantity
            stock_sale_usd += (sale_price * eur_rate / usd_rate) * quantity
        else:
            stock_cost_tl += purchase_price * quantity
            stock_sale_tl += sale_price * quantity
    
    stock_cost_total_tl = stock_cost_tl + (stock_cost_usd * usd_rate)
    stock_sale_total_tl = stock_sale_tl + (stock_sale_usd * usd_rate)
    stock_potential_profit_tl = stock_sale_total_tl - stock_cost_total_tl
    
    # ==================== EXPENSES ====================
    all_expenses = await db.expenses.find({"is_active": True}, {"_id": 0}).to_list(10000)
    
    def parse_expense_date(exp):
        date_str = exp.get("expense_date")
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except:
            return None
    
    daily_expenses = sum(e.get("amount_tl", e.get("amount", 0)) for e in all_expenses if parse_expense_date(e) and parse_expense_date(e) >= today_start)
    weekly_expenses = sum(e.get("amount_tl", e.get("amount", 0)) for e in all_expenses if parse_expense_date(e) and parse_expense_date(e) >= week_start)
    monthly_expenses = sum(e.get("amount_tl", e.get("amount", 0)) for e in all_expenses if parse_expense_date(e) and parse_expense_date(e) >= month_start)
    yearly_expenses = sum(e.get("amount_tl", e.get("amount", 0)) for e in all_expenses if parse_expense_date(e) and parse_expense_date(e) >= year_start)
    
    # Filtered expenses
    filtered_expenses_list = all_expenses
    if filter_start or filter_end:
        filtered_expenses_list = []
        for exp in all_expenses:
            exp_date = parse_expense_date(exp)
            if exp_date:
                if filter_start and exp_date < filter_start:
                    continue
                if filter_end and exp_date > filter_end:
                    continue
                filtered_expenses_list.append(exp)
    
    filtered_expenses_total = sum(e.get("amount_tl", e.get("amount", 0)) for e in filtered_expenses_list)
    
    # ==================== PROFIT MARGIN ====================
    total_revenue_all = sum(s.get("sale_amount_tl", 0) for s in all_sales)
    total_cost_all = sum(s.get("purchase_amount_tl", 0) for s in all_sales)
    total_profit_all = total_revenue_all - total_cost_all
    profit_margin = (total_profit_all / total_revenue_all * 100) if total_revenue_all > 0 else 0
    
    # ==================== PAYMENTS & COLLECTIONS ====================
    total_paid = sum(s.get("paid_amount_tl", 0) for s in all_sales)
    total_remaining = sum(s.get("remaining_amount_tl", 0) for s in all_sales)
    
    # Upcoming collections (remaining payments)
    upcoming_collections = []
    for sale in all_sales:
        remaining = sale.get("remaining_amount_tl", 0)
        if remaining > 0:
            upcoming_collections.append({
                "id": sale.get("id"),
                "customer_name": sale.get("customer_name", ""),
                "amount_tl": remaining,
                "sale_date": sale.get("sale_date"),
                "description": sale.get("description", "")
            })
    
    # Checks analysis
    upcoming_checks = []
    overdue_checks = []
    total_upcoming_checks = 0
    total_overdue_checks = 0
    
    for sale in all_sales:
        checks = sale.get("checks")
        if checks and isinstance(checks, list):
            for check in checks:
                if not check.get("is_collected"):
                    check_data = {
                        "sale_id": sale.get("id"),
                        "customer_name": sale.get("customer_name", ""),
                        "check_number": check.get("check_number", ""),
                        "bank_name": check.get("bank_name", ""),
                        "amount_tl": check.get("amount_tl", 0),
                        "due_date": check.get("due_date")
                    }
                    
                    due_date_str = check.get("due_date")
                    if due_date_str:
                        try:
                            due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
                            if due_date < now:
                                overdue_checks.append(check_data)
                                total_overdue_checks += check.get("amount_tl", 0)
                            else:
                                upcoming_checks.append(check_data)
                                total_upcoming_checks += check.get("amount_tl", 0)
                        except:
                            upcoming_checks.append(check_data)
                            total_upcoming_checks += check.get("amount_tl", 0)
    
    # Sort checks by due date
    upcoming_checks.sort(key=lambda x: x.get("due_date", ""))
    overdue_checks.sort(key=lambda x: x.get("due_date", ""), reverse=True)
    
    # ==================== QUOTES ====================
    all_quotes = await db.quotes.find({"is_active": True}, {"_id": 0}).to_list(10000)
    
    def parse_quote_date(quote):
        date_str = quote.get("created_at")
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except:
            return None
    
    daily_quotes = len([q for q in all_quotes if parse_quote_date(q) and parse_quote_date(q) >= today_start])
    weekly_quotes = len([q for q in all_quotes if parse_quote_date(q) and parse_quote_date(q) >= week_start])
    monthly_quotes = len([q for q in all_quotes if parse_quote_date(q) and parse_quote_date(q) >= month_start])
    yearly_quotes = len([q for q in all_quotes if parse_quote_date(q) and parse_quote_date(q) >= year_start])
    total_quotes = len(all_quotes)
    
    # ==================== CUSTOMERS ====================
    total_customers = await db.customers.count_documents({"is_active": True})
    
    # ==================== TOTAL SALES COUNT ====================
    total_sales_count = len(all_sales)
    
    return {
        # Revenue by period
        "revenue": {
            "daily": round(daily_revenue, 2),
            "weekly": round(weekly_revenue, 2),
            "monthly": round(monthly_revenue, 2),
            "yearly": round(yearly_revenue, 2),
            "filtered": round(filtered_revenue, 2),
            "filtered_cost": round(filtered_cost, 2),
            "filtered_profit": round(filtered_profit, 2)
        },
        
        # Stock values
        "stock": {
            "cost_usd": round(stock_cost_usd, 2),
            "cost_tl": round(stock_cost_total_tl, 2),
            "sale_value_usd": round(stock_sale_usd, 2),
            "sale_value_tl": round(stock_sale_total_tl, 2),
            "potential_profit_tl": round(stock_potential_profit_tl, 2)
        },
        
        # Expenses by period
        "expenses": {
            "daily": round(daily_expenses, 2),
            "weekly": round(weekly_expenses, 2),
            "monthly": round(monthly_expenses, 2),
            "yearly": round(yearly_expenses, 2),
            "filtered": round(filtered_expenses_total, 2)
        },
        
        # Profit margin
        "profit_margin": round(profit_margin, 2),
        "total_profit": round(total_profit_all, 2),
        
        # Collections & Payments
        "collections": {
            "total_paid": round(total_paid, 2),
            "total_remaining": round(total_remaining, 2),
            "upcoming_list": upcoming_collections[:20],
            "upcoming_checks": upcoming_checks[:20],
            "upcoming_checks_total": round(total_upcoming_checks, 2),
            "overdue_checks": overdue_checks[:20],
            "overdue_checks_total": round(total_overdue_checks, 2)
        },
        
        # Quotes by period
        "quotes": {
            "daily": daily_quotes,
            "weekly": weekly_quotes,
            "monthly": monthly_quotes,
            "yearly": yearly_quotes,
            "total": total_quotes
        },
        
        # Counts
        "total_customers": total_customers,
        "total_sales": total_sales_count,
        
        # Top performers
        "top_performers": top_performers,
        
        # Sales details for export
        "sales_details": sales_details,
        
        # Exchange rates
        "exchange_rates": {
            "usd": usd_rate,
            "eur": eur_rate
        }
    }

@api_router.get("/reports/export-sales")
async def export_sales_excel(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(require_permission("finance_view"))
):
    """Satış raporlarını Excel olarak dışa aktar"""
    
    # Get all sales
    all_sales = await db.sales.find({"is_active": True}, {"_id": 0}).sort("sale_date", -1).to_list(10000)
    
    # Filter by date if provided
    filtered_sales = all_sales
    if start_date or end_date:
        filtered_sales = []
        filter_start = None
        filter_end = None
        
        if start_date:
            try:
                filter_start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            except:
                filter_start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        if end_date:
            try:
                filter_end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            except:
                filter_end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                filter_end = filter_end.replace(hour=23, minute=59, second=59)
        
        for sale in all_sales:
            date_str = sale.get("sale_date")
            if date_str:
                try:
                    sale_date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    if filter_start and sale_date < filter_start:
                        continue
                    if filter_end and sale_date > filter_end:
                        continue
                    filtered_sales.append(sale)
                except:
                    continue
    
    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Satış Raporu"
    
    # Header style
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Headers
    headers = ["Tarih", "Müşteri", "Açıklama", "Satış Tutarı (TL)", "Maliyet (TL)", "Kar (TL)", "Tahsil Edilen (TL)", "Kalan (TL)", "Durum", "Satışı Yapan"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center')
    
    # Data rows
    for row_idx, sale in enumerate(filtered_sales, 2):
        # Format date
        date_str = sale.get("sale_date", "")
        if date_str:
            try:
                dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                date_str = dt.strftime("%d.%m.%Y")
            except:
                pass
        
        row_data = [
            date_str,
            sale.get("customer_name", ""),
            sale.get("description", ""),
            sale.get("sale_amount_tl", 0),
            sale.get("purchase_amount_tl", 0),
            sale.get("sale_amount_tl", 0) - sale.get("purchase_amount_tl", 0),
            sale.get("paid_amount_tl", 0),
            sale.get("remaining_amount_tl", 0),
            sale.get("payment_status", ""),
            sale.get("created_by_name", "")
        ]
        
        for col, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col, value=value)
            cell.border = thin_border
            if col >= 4 and col <= 8:
                cell.number_format = '#,##0.00'
    
    # Set column widths
    column_widths = [12, 25, 30, 15, 15, 15, 15, 15, 15, 20]
    for col, width in enumerate(column_widths, 1):
        ws.column_dimensions[chr(64 + col)].width = width
    
    # Summary section
    summary_row = len(filtered_sales) + 3
    ws.cell(row=summary_row, column=1, value="TOPLAM").font = Font(bold=True)
    ws.cell(row=summary_row, column=4, value=sum(s.get("sale_amount_tl", 0) for s in filtered_sales)).font = Font(bold=True)
    ws.cell(row=summary_row, column=5, value=sum(s.get("purchase_amount_tl", 0) for s in filtered_sales)).font = Font(bold=True)
    ws.cell(row=summary_row, column=6, value=sum(s.get("sale_amount_tl", 0) - s.get("purchase_amount_tl", 0) for s in filtered_sales)).font = Font(bold=True)
    ws.cell(row=summary_row, column=7, value=sum(s.get("paid_amount_tl", 0) for s in filtered_sales)).font = Font(bold=True)
    ws.cell(row=summary_row, column=8, value=sum(s.get("remaining_amount_tl", 0) for s in filtered_sales)).font = Font(bold=True)
    
    # Save to BytesIO
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    # Generate filename
    filename = f"satis_raporu_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

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

# Mount static files with /api prefix for proper routing through Kubernetes ingress
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="api_uploads")

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
