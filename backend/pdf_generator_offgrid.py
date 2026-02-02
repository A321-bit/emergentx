"""
AKTÜRK ENERJİ - OFF-GRID Premium PDF Quote Generator
Profesyonel, kurumsal ve satış & yatırım odaklı Güneş Enerjisi Yatırım Teklifi

SAYFA AKIŞI:
1. KAPAK - Müşteriye özel dinamik tasarım
2. PROJE KİMLİĞİ & YATIRIM GEREKÇESİ
3. SİSTEM BİLEŞENLERİ - Ürün kartları
4. ENERJİ ÜRETİMİ & FİNANSAL KAZANÇ
5. YATIRIM BEDELİ & ÜRÜN LİSTESİ
6. ÖDEME, GARANTİ VE TESLİMAT
7. BANKA & FİNANSMAN SEÇENEKLERİ
8. TEKNİK EKLER KAPAĞI
9. KAPANIŞ KAPAK
+ DATASHEETLER
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PyPDF2 import PdfReader, PdfWriter
from io import BytesIO
from pathlib import Path
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

# Register Turkish-compatible fonts
try:
    pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
    FONT_NORMAL = 'DejaVuSans'
    FONT_BOLD = 'DejaVuSans-Bold'
except:
    FONT_NORMAL = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'

# A4 Page Settings
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_TOP = 12 * mm
MARGIN_BOTTOM = 12 * mm
MARGIN_LEFT = 15 * mm
MARGIN_RIGHT = 15 * mm
CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM

# ===== AKTÜRK ENERJİ KURUMSAL RENK PALETİ =====
AKTURK_BLUE = colors.HexColor('#247dc0')        # Ana mavi (ENERJİ)
AKTURK_BLUE_DARK = colors.HexColor('#1a5a8a')   # Koyu mavi
AKTURK_BLUE_LIGHT = colors.HexColor('#7ba5d1')  # Açık mavi
AKTURK_GRAY = colors.HexColor('#404041')        # Koyu gri (AKTÜRK)
AKTURK_GRAY_LIGHT = colors.HexColor('#858585')  # Açık gri

# Fonksiyonel renkler
SUCCESS_GREEN = colors.HexColor('#059669')      # Tasarruf/başarı
WARNING_ORANGE = colors.HexColor('#ea580c')     # Uyarı/vurgu
BG_LIGHT = colors.HexColor('#f0f5fa')           # Açık arka plan
BORDER_COLOR = colors.HexColor('#dae4f0')       # Border


def format_currency(value, currency='TRY'):
    """Format number as Turkish currency"""
    if currency == 'TRY':
        return f"₺{value:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    return f"${value:,.2f}"


class OffGridPDFGenerator:
    """OFF-GRID Premium PDF Generator for Aktürk Enerji"""
    
    def __init__(self, quote_data: dict, company_settings: dict, uploads_dir: str = None):
        self.quote = quote_data
        self.settings = company_settings
        self.uploads_dir = uploads_dir or "/app/backend/uploads"
        
        # Extract key data
        self.customer_name = quote_data.get('customer_name', 'Değerli Müşterimiz')
        self.customer_city = quote_data.get('customer_city', '')
        self.customer_district = quote_data.get('customer_district', '')
        self.quote_number = quote_data.get('quote_number', '-')
        self.quote_date = quote_data.get('created_at', datetime.now().isoformat())
        self.items = quote_data.get('items', [])
        
        # Calculate system specs
        self._calculate_system_specs()
    
    def _calculate_system_specs(self):
        """Calculate panel, inverter, battery capacities"""
        self.panel_kw = 0
        self.inverter_kw = 0
        self.battery_kwh = 0
        self.panel_items = []
        self.inverter_items = []
        self.battery_items = []
        self.other_items = []
        
        for item in self.items:
            product_name = item.get('product_name', '').lower()
            power_watt = item.get('power_watt', 0) or 0
            quantity = item.get('quantity', 1) or 1
            
            if any(term in product_name for term in ['panel', 'güneş', 'mono', 'pv', 'solar']):
                self.panel_kw += (power_watt * quantity) / 1000
                self.panel_items.append(item)
            elif any(term in product_name for term in ['inverter', 'invertör', 'evirici']):
                self.inverter_kw += power_watt / 1000
                self.inverter_items.append(item)
            elif any(term in product_name for term in ['batarya', 'akü', 'battery', 'depolama', 'ess', 'lifepo4']):
                self.battery_kwh += power_watt / 1000
                self.battery_items.append(item)
            else:
                self.other_items.append(item)
        
        # Production estimates (Off-grid typically 4.5 hours daily)
        self.daily_production = self.panel_kw * 4.5
        self.monthly_production = self.daily_production * 30
        self.yearly_production = self.daily_production * 365
        
        # Financial calculations (diesel savings for off-grid)
        diesel_price = self.settings.get('diesel_price_per_liter', 45.0) or 45.0
        diesel_per_kwh = self.settings.get('diesel_consumption_per_kwh', 0.35) or 0.35
        self.generator_cost_per_kwh = diesel_per_kwh * diesel_price
        self.yearly_savings = self.yearly_production * self.generator_cost_per_kwh
        
        # Amortization
        total_price = self.quote.get('total_tl', 0) or self.quote.get('subtotal_tl', 0) or 0
        if self.yearly_savings > 0 and total_price > 0:
            amort = total_price / self.yearly_savings
            self.amort_years = int(amort)
            self.amort_months = int((amort - self.amort_years) * 12)
        else:
            self.amort_years = 0
            self.amort_months = 0
        
        # Environmental impact
        co2_per_kwh = diesel_per_kwh * 2.7  # Diesel CO2 emission
        self.yearly_co2_saved = self.yearly_production * co2_per_kwh
        self.trees_equivalent = self.yearly_co2_saved / 22
    
    def generate(self) -> BytesIO:
        """Generate complete PDF"""
        pages = []
        
        # Page 1: Cover
        pages.append(self._create_cover_page())
        
        # Page 2: Project Identity
        pages.append(self._create_project_identity_page())
        
        # Page 3: System Components
        pages.append(self._create_system_components_page())
        
        # Page 4: Energy Production & Financial
        pages.append(self._create_financial_analysis_page())
        
        # Page 5: Price Table
        pages.append(self._create_price_table_page())
        
        # Page 6: Payment, Warranty, Delivery
        pages.append(self._create_warranty_page())
        
        # Page 7: Bank & Financing
        pages.append(self._create_bank_info_page())
        
        # Page 8: Technical Appendix Cover
        pages.append(self._create_appendix_cover_page())
        
        # Page 9: Closing Cover
        pages.append(self._create_closing_page())
        
        # Merge all pages
        return self._merge_pages(pages)
    
    def _draw_header(self, c, page_num, show_logo=True):
        """Draw consistent header with logo"""
        # Top line
        c.setStrokeColor(AKTURK_BLUE)
        c.setLineWidth(3)
        c.line(0, PAGE_HEIGHT - 8, PAGE_WIDTH, PAGE_HEIGHT - 8)
        
        if show_logo:
            # Company name as text (logo placeholder)
            c.setFillColor(AKTURK_GRAY)
            c.setFont(FONT_BOLD, 14)
            c.drawString(MARGIN_LEFT, PAGE_HEIGHT - 25, "AKTÜRK")
            c.setFillColor(AKTURK_BLUE)
            c.drawString(MARGIN_LEFT + 58, PAGE_HEIGHT - 25, "ENERJİ")
    
    def _draw_footer(self, c, page_num, total_pages=9):
        """Draw consistent footer"""
        c.setStrokeColor(BORDER_COLOR)
        c.setLineWidth(0.5)
        c.line(MARGIN_LEFT, MARGIN_BOTTOM - 5, PAGE_WIDTH - MARGIN_RIGHT, MARGIN_BOTTOM - 5)
        
        c.setFillColor(AKTURK_GRAY_LIGHT)
        c.setFont(FONT_NORMAL, 7)
        c.drawString(MARGIN_LEFT, MARGIN_BOTTOM - 15, f"Teklif No: {self.quote_number}")
        c.drawCentredString(PAGE_WIDTH / 2, MARGIN_BOTTOM - 15, "www.akturkenerji.com")
        c.drawRightString(PAGE_WIDTH - MARGIN_RIGHT, MARGIN_BOTTOM - 15, f"Sayfa {page_num}/{total_pages}")
    
    # ==================== PAGE 1: COVER ====================
    def _create_cover_page(self) -> BytesIO:
        """Dynamic cover page - customer-specific"""
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Full page gradient background
        gradient_steps = 30
        for i in range(gradient_steps):
            ratio = i / gradient_steps
            # From dark blue to lighter blue
            r = int(26 + (36 - 26) * ratio)
            g = int(90 + (125 - 90) * ratio)
            b = int(138 + (192 - 138) * ratio)
            c.setFillColor(colors.HexColor(f'#{r:02x}{g:02x}{b:02x}'))
            step_height = PAGE_HEIGHT / gradient_steps
            c.rect(0, PAGE_HEIGHT - (i + 1) * step_height, PAGE_WIDTH, step_height + 1, fill=True, stroke=False)
        
        # White content area (lower 70%)
        white_area_height = PAGE_HEIGHT * 0.68
        c.setFillColor(colors.white)
        c.rect(0, 0, PAGE_WIDTH, white_area_height, fill=True, stroke=False)
        
        # Curved transition (decorative)
        c.setFillColor(colors.white)
        c.ellipse(-50, white_area_height - 30, PAGE_WIDTH + 50, white_area_height + 30, fill=True, stroke=False)
        
        # TOP SECTION (Blue area)
        # Company Logo/Name
        c.setFillColor(colors.white)
        c.setFont(FONT_BOLD, 24)
        c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 50, "AKTÜRK ENERJİ")
        
        c.setFont(FONT_NORMAL, 10)
        c.setFillColor(colors.HexColor('#b0c7e1'))
        c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 68, "Güneş Enerjisi Sistemleri")
        
        # Quote info (top right)
        c.setFillColor(colors.white)
        c.setFont(FONT_NORMAL, 9)
        c.drawRightString(PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 30, f"Teklif No: {self.quote_number}")
        
        # Format date
        try:
            date_obj = datetime.fromisoformat(self.quote_date.replace('Z', '+00:00'))
            formatted_date = date_obj.strftime('%d.%m.%Y')
        except:
            formatted_date = datetime.now().strftime('%d.%m.%Y')
        c.drawRightString(PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 43, f"Tarih: {formatted_date}")
        
        # MIDDLE SECTION - Solar icon area
        icon_y = white_area_height + 40
        
        # Draw sun icon (simple circle with rays)
        sun_x = PAGE_WIDTH / 2
        sun_y = icon_y + 30
        c.setFillColor(colors.HexColor('#fbbf24'))  # Yellow
        c.circle(sun_x, sun_y, 25, fill=True, stroke=False)
        
        # Sun rays
        c.setStrokeColor(colors.HexColor('#fbbf24'))
        c.setLineWidth(3)
        import math
        for angle in range(0, 360, 45):
            rad = math.radians(angle)
            x1 = sun_x + 30 * math.cos(rad)
            y1 = sun_y + 30 * math.sin(rad)
            x2 = sun_x + 42 * math.cos(rad)
            y2 = sun_y + 42 * math.sin(rad)
            c.line(x1, y1, x2, y2)
        
        # WHITE SECTION - Main content
        y = white_area_height - 60
        
        # Main title
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 22)
        c.drawCentredString(PAGE_WIDTH / 2, y, f"{self.customer_name}")
        
        y -= 30
        c.setFont(FONT_NORMAL, 14)
        c.setFillColor(AKTURK_BLUE)
        c.drawCentredString(PAGE_WIDTH / 2, y, "için Özel Hazırlanmış")
        
        y -= 35
        c.setFont(FONT_BOLD, 20)
        c.setFillColor(AKTURK_GRAY)
        c.drawCentredString(PAGE_WIDTH / 2, y, "GÜNEŞ ENERJİSİ YATIRIM TEKLİFİ")
        
        y -= 25
        c.setFont(FONT_NORMAL, 11)
        c.setFillColor(AKTURK_GRAY_LIGHT)
        c.drawCentredString(PAGE_WIDTH / 2, y, "Off-Grid Bağımsız Enerji Sistemi")
        
        # Decorative line
        y -= 25
        c.setStrokeColor(AKTURK_BLUE)
        c.setLineWidth(2)
        c.line(PAGE_WIDTH/2 - 80, y, PAGE_WIDTH/2 + 80, y)
        
        # Tagline
        y -= 35
        c.setFillColor(AKTURK_GRAY_LIGHT)
        c.setFont(FONT_NORMAL, 11)
        c.drawCentredString(PAGE_WIDTH / 2, y, "Sürdürülebilir, Kârlı ve Uzun Vadeli Enerji Çözümü")
        
        # System specs boxes
        y -= 60
        box_width = (CONTENT_WIDTH - 30) / 3
        box_height = 55
        
        specs = [
            ('KURULU GÜÇ', f'{self.panel_kw:.1f} kWp', AKTURK_BLUE),
            ('İNVERTER', f'{self.inverter_kw:.1f} kW', AKTURK_GRAY),
            ('DEPOLAMA', f'{self.battery_kwh:.1f} kWh', SUCCESS_GREEN),
        ]
        
        for i, (label, value, color) in enumerate(specs):
            x = MARGIN_LEFT + (i * (box_width + 15))
            
            # Box background
            c.setFillColor(BG_LIGHT)
            c.roundRect(x, y - box_height, box_width, box_height, 8, fill=True, stroke=False)
            
            # Top accent bar
            c.setFillColor(color)
            c.roundRect(x, y - 5, box_width, 5, 3, fill=True, stroke=False)
            
            # Value
            c.setFillColor(color)
            c.setFont(FONT_BOLD, 18)
            c.drawCentredString(x + box_width/2, y - 28, value)
            
            # Label
            c.setFillColor(AKTURK_GRAY_LIGHT)
            c.setFont(FONT_NORMAL, 8)
            c.drawCentredString(x + box_width/2, y - 45, label)
        
        # Bottom info
        y = 60
        c.setFillColor(AKTURK_GRAY_LIGHT)
        c.setFont(FONT_NORMAL, 8)
        c.drawCentredString(PAGE_WIDTH / 2, y, "Bu teklif dosyası müşteriye özel hazırlanmıştır. İzinsiz paylaşılmamalıdır.")
        
        c.save()
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 2: PROJECT IDENTITY ====================
    def _create_project_identity_page(self) -> BytesIO:
        """Project identity and investment rationale"""
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        self._draw_header(c, 2)
        
        y = PAGE_HEIGHT - 60
        
        # Page title
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 16)
        c.drawCentredString(PAGE_WIDTH / 2, y, "PROJE KİMLİĞİ & YATIRIM GEREKÇESİ")
        
        y -= 10
        c.setStrokeColor(AKTURK_BLUE)
        c.setLineWidth(2)
        c.line(PAGE_WIDTH/2 - 100, y, PAGE_WIDTH/2 + 100, y)
        
        y -= 35
        
        # Two column layout
        left_width = CONTENT_WIDTH * 0.48
        right_width = CONTENT_WIDTH * 0.48
        gap = CONTENT_WIDTH * 0.04
        
        # LEFT COLUMN - Project Info
        left_x = MARGIN_LEFT
        
        # Section title with icon
        c.setFillColor(AKTURK_BLUE)
        c.setFont(FONT_BOLD, 12)
        c.drawString(left_x, y, "PROJE BİLGİLERİ")
        
        y -= 20
        
        # Project info box
        box_height = 180
        c.setFillColor(BG_LIGHT)
        c.roundRect(left_x, y - box_height, left_width, box_height, 10, fill=True, stroke=False)
        
        # Left border accent
        c.setFillColor(AKTURK_BLUE)
        c.roundRect(left_x, y - box_height, 4, box_height, 2, fill=True, stroke=False)
        
        # Info items
        info_items = [
            ('👤', 'Müşteri Adı', self.customer_name),
            ('📍', 'Proje Lokasyonu', f"{self.customer_city} / {self.customer_district}" if self.customer_city else "Türkiye"),
            ('⚡', 'Sistem Türü', 'Off-Grid (Şebekeden Bağımsız)'),
            ('☀', 'Kurulu Güç', f'{self.panel_kw:.1f} kWp'),
            ('🎯', 'Kullanım Amacı', 'Bağımsız Enerji Üretimi'),
        ]
        
        info_y = y - 25
        for icon, label, value in info_items:
            c.setFillColor(AKTURK_GRAY_LIGHT)
            c.setFont(FONT_NORMAL, 9)
            c.drawString(left_x + 15, info_y, label)
            
            c.setFillColor(AKTURK_GRAY)
            c.setFont(FONT_BOLD, 10)
            c.drawString(left_x + 15, info_y - 14, value)
            
            info_y -= 35
        
        # RIGHT COLUMN - Why This Investment
        right_x = left_x + left_width + gap
        right_y = y + 20
        
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 12)
        c.drawString(right_x, right_y, "NEDEN BU YATIRIM?")
        
        right_y -= 20
        
        # Investment rationale box
        c.setFillColor(colors.HexColor('#ecfdf5'))  # Light green
        c.roundRect(right_x, right_y - box_height, right_width, box_height, 10, fill=True, stroke=False)
        
        # Right border accent
        c.setFillColor(SUCCESS_GREEN)
        c.roundRect(right_x + right_width - 4, right_y - box_height, 4, box_height, 2, fill=True, stroke=False)
        
        # Rationale text
        rationale_items = [
            "Artan enerji maliyetlerine karşı kalıcı çözüm",
            "Jeneratör yakıt giderlerinden %100 tasarruf",
            "Şebeke bağlantısı olmayan lokasyonlarda\nbağımsız enerji üretimi",
            "Uzun vadeli yatırım getirisi",
            "Çevre dostu ve sürdürülebilir enerji",
        ]
        
        rat_y = right_y - 25
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_NORMAL, 9)
        for item in rationale_items:
            lines = item.split('\n')
            c.drawString(right_x + 15, rat_y, f"✓ {lines[0]}")
            rat_y -= 14
            if len(lines) > 1:
                c.drawString(right_x + 25, rat_y, lines[1])
                rat_y -= 18
            else:
                rat_y -= 6
        
        # BOTTOM SECTION - 4 Benefit Cards
        y -= box_height + 40
        
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 12)
        c.drawCentredString(PAGE_WIDTH / 2, y, "YATIRIMIN AVANTAJLARI")
        
        y -= 30
        
        card_width = (CONTENT_WIDTH - 30) / 4
        card_height = 80
        
        benefits = [
            ('💰', 'Düşen\nEnerji Maliyetleri', '#fef3c7', '#f59e0b'),
            ('📈', 'Uzun Vadeli\nGetiri', '#dcfce7', '#059669'),
            ('🔌', 'Enerji\nBağımsızlığı', '#dbeafe', '#247dc0'),
            ('🌍', 'Çevresel\nKatkı', '#e0e7ff', '#6366f1'),
        ]
        
        for i, (icon, text, bg_color, accent_color) in enumerate(benefits):
            x = MARGIN_LEFT + (i * (card_width + 10))
            
            # Card background
            c.setFillColor(colors.HexColor(bg_color))
            c.roundRect(x, y - card_height, card_width, card_height, 8, fill=True, stroke=False)
            
            # Icon (as text)
            c.setFont(FONT_NORMAL, 20)
            c.drawCentredString(x + card_width/2, y - 25, icon)
            
            # Text (multiline)
            c.setFillColor(colors.HexColor(accent_color))
            c.setFont(FONT_BOLD, 8)
            lines = text.split('\n')
            for j, line in enumerate(lines):
                c.drawCentredString(x + card_width/2, y - 50 - (j * 12), line)
        
        self._draw_footer(c, 2)
        
        c.save()
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 3: SYSTEM COMPONENTS ====================
    def _create_system_components_page(self) -> BytesIO:
        """System components with product cards"""
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        self._draw_header(c, 3)
        
        y = PAGE_HEIGHT - 60
        
        # Page title
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 16)
        c.drawCentredString(PAGE_WIDTH / 2, y, "SİSTEM BİLEŞENLERİ")
        
        y -= 8
        c.setFillColor(AKTURK_GRAY_LIGHT)
        c.setFont(FONT_NORMAL, 10)
        c.drawCentredString(PAGE_WIDTH / 2, y, "Projenize Özel Seçilen Premium Ekipmanlar")
        
        y -= 35
        
        # Three component sections
        card_height = 150
        
        components = [
            {
                'title': 'GÜNEŞ PANELLERİ',
                'subtitle': f'{self.panel_kw:.1f} kWp Toplam Güç',
                'items': self.panel_items,
                'color': '#f59e0b',
                'benefits': [
                    'Yüksek verimlilik (%21+)',
                    '25 yıl performans garantisi',
                    'Türkiye iklim koşullarına uygun',
                ]
            },
            {
                'title': 'İNVERTER SİSTEMİ',
                'subtitle': f'{self.inverter_kw:.1f} kW Kapasite',
                'items': self.inverter_items,
                'color': '#247dc0',
                'benefits': [
                    'Off-Grid için optimize edilmiş',
                    'MPPT şarj kontrolü dahili',
                    '10 yıl garanti',
                ]
            },
            {
                'title': 'ENERJİ DEPOLAMA',
                'subtitle': f'{self.battery_kwh:.1f} kWh Kapasite',
                'items': self.battery_items,
                'color': '#059669',
                'benefits': [
                    'LiFePO4 uzun ömürlü teknoloji',
                    '6000+ şarj döngüsü',
                    'Gece kullanımı için ideal',
                ]
            }
        ]
        
        for comp in components:
            if not comp['items']:
                continue
                
            # Card background
            c.setFillColor(BG_LIGHT)
            c.roundRect(MARGIN_LEFT, y - card_height, CONTENT_WIDTH, card_height, 10, fill=True, stroke=False)
            
            # Left color bar
            c.setFillColor(colors.HexColor(comp['color']))
            c.roundRect(MARGIN_LEFT, y - card_height, 6, card_height, 3, fill=True, stroke=False)
            
            # Title section
            c.setFillColor(colors.HexColor(comp['color']))
            c.setFont(FONT_BOLD, 13)
            c.drawString(MARGIN_LEFT + 20, y - 22, comp['title'])
            
            c.setFillColor(AKTURK_GRAY_LIGHT)
            c.setFont(FONT_NORMAL, 9)
            c.drawString(MARGIN_LEFT + 20, y - 36, comp['subtitle'])
            
            # Product name
            if comp['items']:
                item = comp['items'][0]
                product_name = item.get('product_name', 'Ürün')
                quantity = item.get('quantity', 1)
                
                c.setFillColor(AKTURK_GRAY)
                c.setFont(FONT_BOLD, 10)
                c.drawString(MARGIN_LEFT + 20, y - 60, f"{product_name}")
                
                c.setFillColor(AKTURK_GRAY_LIGHT)
                c.setFont(FONT_NORMAL, 9)
                c.drawString(MARGIN_LEFT + 20, y - 75, f"Adet: {quantity}")
            
            # Benefits (right side)
            benefit_x = PAGE_WIDTH / 2 + 20
            benefit_y = y - 50
            
            c.setFillColor(AKTURK_GRAY)
            c.setFont(FONT_BOLD, 9)
            c.drawString(benefit_x, y - 22, "ÖNE ÇIKAN ÖZELLİKLER")
            
            c.setFont(FONT_NORMAL, 9)
            for benefit in comp['benefits']:
                c.setFillColor(SUCCESS_GREEN)
                c.drawString(benefit_x, benefit_y, "✓")
                c.setFillColor(AKTURK_GRAY)
                c.drawString(benefit_x + 15, benefit_y, benefit)
                benefit_y -= 18
            
            y -= card_height + 15
        
        # Additional equipment note if exists
        if self.other_items:
            c.setFillColor(AKTURK_GRAY_LIGHT)
            c.setFont(FONT_NORMAL, 9)
            c.drawCentredString(PAGE_WIDTH / 2, y, f"+ {len(self.other_items)} adet ek ekipman (kablo, konnektör, montaj malzemeleri)")
        
        self._draw_footer(c, 3)
        
        c.save()
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 4: FINANCIAL ANALYSIS ====================
    def _create_financial_analysis_page(self) -> BytesIO:
        """Energy production and financial gains"""
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        self._draw_header(c, 4)
        
        y = PAGE_HEIGHT - 60
        
        # Page title
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 16)
        c.drawCentredString(PAGE_WIDTH / 2, y, "ENERJİ ÜRETİMİ & FİNANSAL KAZANÇ")
        
        y -= 8
        c.setFillColor(AKTURK_GRAY_LIGHT)
        c.setFont(FONT_NORMAL, 10)
        c.drawCentredString(PAGE_WIDTH / 2, y, "Yatırımınızın Somut Getirileri")
        
        y -= 40
        
        # TOP KPI CARDS (3 cards)
        kpi_width = (CONTENT_WIDTH - 20) / 3
        kpi_height = 80
        
        kpis = [
            {
                'label': 'YILLIK ENERJİ ÜRETİMİ',
                'value': f'{self.yearly_production:,.0f}'.replace(',', '.'),
                'unit': 'kWh',
                'color': '#247dc0',
                'bg': '#dbeafe'
            },
            {
                'label': 'TAHMİNİ YILLIK TASARRUF',
                'value': f'₺{self.yearly_savings:,.0f}'.replace(',', '.'),
                'unit': '',
                'color': '#059669',
                'bg': '#dcfce7'
            },
            {
                'label': 'YATIRIM GERİ DÖNÜŞÜ',
                'value': f'{self.amort_years} Yıl {self.amort_months} Ay',
                'unit': '',
                'color': '#f59e0b',
                'bg': '#fef3c7'
            }
        ]
        
        for i, kpi in enumerate(kpis):
            x = MARGIN_LEFT + (i * (kpi_width + 10))
            
            # Card background
            c.setFillColor(colors.HexColor(kpi['bg']))
            c.roundRect(x, y - kpi_height, kpi_width, kpi_height, 10, fill=True, stroke=False)
            
            # Top accent
            c.setFillColor(colors.HexColor(kpi['color']))
            c.roundRect(x, y - 5, kpi_width, 5, 3, fill=True, stroke=False)
            
            # Label
            c.setFillColor(AKTURK_GRAY_LIGHT)
            c.setFont(FONT_NORMAL, 7)
            c.drawCentredString(x + kpi_width/2, y - 22, kpi['label'])
            
            # Value
            c.setFillColor(colors.HexColor(kpi['color']))
            c.setFont(FONT_BOLD, 18)
            c.drawCentredString(x + kpi_width/2, y - 48, kpi['value'])
            
            # Unit
            if kpi['unit']:
                c.setFont(FONT_NORMAL, 10)
                c.drawCentredString(x + kpi_width/2, y - 65, kpi['unit'])
        
        y -= kpi_height + 30
        
        # PRODUCTION CHART SECTION
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 11)
        c.drawString(MARGIN_LEFT, y, "AYLIK ENERJİ ÜRETİM TAHMİNİ")
        
        y -= 15
        
        # Simple bar chart
        chart_height = 120
        bar_width = (CONTENT_WIDTH - 60) / 12
        
        # Monthly production estimates (Turkey average pattern)
        monthly_factors = [0.6, 0.7, 0.9, 1.0, 1.1, 1.2, 1.2, 1.1, 1.0, 0.85, 0.7, 0.55]
        months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
        max_monthly = max(monthly_factors) * self.monthly_production
        
        # Chart background
        c.setFillColor(BG_LIGHT)
        c.roundRect(MARGIN_LEFT, y - chart_height - 30, CONTENT_WIDTH, chart_height + 30, 8, fill=True, stroke=False)
        
        for i, (month, factor) in enumerate(zip(months, monthly_factors)):
            bar_x = MARGIN_LEFT + 20 + (i * (bar_width + 5))
            bar_height_px = (factor * self.monthly_production / max_monthly) * (chart_height - 20)
            
            # Bar
            c.setFillColor(AKTURK_BLUE if factor >= 0.9 else AKTURK_BLUE_LIGHT)
            c.roundRect(bar_x, y - chart_height + 10, bar_width, bar_height_px, 3, fill=True, stroke=False)
            
            # Month label
            c.setFillColor(AKTURK_GRAY_LIGHT)
            c.setFont(FONT_NORMAL, 6)
            c.drawCentredString(bar_x + bar_width/2, y - chart_height - 5, month)
            
            # Value on top of bar
            monthly_val = factor * self.monthly_production
            c.setFillColor(AKTURK_GRAY)
            c.setFont(FONT_NORMAL, 5)
            c.drawCentredString(bar_x + bar_width/2, y - chart_height + bar_height_px + 15, f'{monthly_val:.0f}')
        
        y -= chart_height + 50
        
        # MULTI-YEAR PROJECTION
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 11)
        c.drawString(MARGIN_LEFT, y, "UZUN VADELİ TASARRUF PROJEKSİYONU")
        
        y -= 20
        
        # Projection table
        proj_height = 35
        c.setFillColor(BG_LIGHT)
        c.roundRect(MARGIN_LEFT, y - proj_height, CONTENT_WIDTH, proj_height, 6, fill=True, stroke=False)
        
        projections = [
            ('5 Yıl', self.yearly_savings * 5),
            ('10 Yıl', self.yearly_savings * 10),
            ('15 Yıl', self.yearly_savings * 15),
            ('25 Yıl', self.yearly_savings * 25),
        ]
        
        proj_width = CONTENT_WIDTH / 4
        for i, (period, value) in enumerate(projections):
            px = MARGIN_LEFT + (i * proj_width)
            
            c.setFillColor(AKTURK_GRAY_LIGHT)
            c.setFont(FONT_NORMAL, 8)
            c.drawCentredString(px + proj_width/2, y - 12, period)
            
            c.setFillColor(SUCCESS_GREEN)
            c.setFont(FONT_BOLD, 11)
            c.drawCentredString(px + proj_width/2, y - 26, f'₺{value:,.0f}'.replace(',', '.'))
        
        y -= proj_height + 30
        
        # ENVIRONMENTAL IMPACT
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 11)
        c.drawString(MARGIN_LEFT, y, "ÇEVRESEL KATKI")
        
        y -= 25
        
        env_width = (CONTENT_WIDTH - 20) / 2
        env_height = 60
        
        env_data = [
            {
                'icon': '🌱',
                'value': f'{self.yearly_co2_saved:,.0f}'.replace(',', '.'),
                'unit': 'kg CO₂/yıl',
                'label': 'Karbon Emisyon Azaltımı',
                'color': '#059669'
            },
            {
                'icon': '🌳',
                'value': f'{self.trees_equivalent:.0f}',
                'unit': 'ağaç',
                'label': 'Yıllık Ağaç Eşdeğeri',
                'color': '#16a34a'
            }
        ]
        
        for i, env in enumerate(env_data):
            ex = MARGIN_LEFT + (i * (env_width + 20))
            
            c.setFillColor(colors.HexColor('#dcfce7'))
            c.roundRect(ex, y - env_height, env_width, env_height, 8, fill=True, stroke=False)
            
            c.setFont(FONT_NORMAL, 18)
            c.drawString(ex + 15, y - 35, env['icon'])
            
            c.setFillColor(colors.HexColor(env['color']))
            c.setFont(FONT_BOLD, 16)
            c.drawString(ex + 50, y - 25, env['value'])
            
            c.setFont(FONT_NORMAL, 9)
            c.drawString(ex + 50 + c.stringWidth(env['value'], FONT_BOLD, 16) + 5, y - 25, env['unit'])
            
            c.setFillColor(AKTURK_GRAY_LIGHT)
            c.setFont(FONT_NORMAL, 8)
            c.drawString(ex + 50, y - 42, env['label'])
        
        # Note
        y -= env_height + 15
        c.setFillColor(AKTURK_GRAY_LIGHT)
        c.setFont(FONT_NORMAL, 7)
        location = self.customer_city if self.customer_city else "Türkiye"
        c.drawCentredString(PAGE_WIDTH / 2, y, f"* Bu analiz {location} bölgesi güneşlenme koşullarına göre hazırlanmıştır.")
        
        self._draw_footer(c, 4)
        
        c.save()
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 5: PRICE TABLE ====================
    def _create_price_table_page(self) -> BytesIO:
        """Investment cost and product list"""
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        self._draw_header(c, 5)
        
        y = PAGE_HEIGHT - 60
        
        # Page title
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 16)
        c.drawCentredString(PAGE_WIDTH / 2, y, "YATIRIM BEDELİ")
        
        y -= 8
        c.setFillColor(AKTURK_GRAY_LIGHT)
        c.setFont(FONT_NORMAL, 10)
        c.drawCentredString(PAGE_WIDTH / 2, y, "Projenize Özel Fiyatlandırma")
        
        y -= 35
        
        # Table header
        col_widths = [0.08 * CONTENT_WIDTH, 0.45 * CONTENT_WIDTH, 0.12 * CONTENT_WIDTH, 0.17 * CONTENT_WIDTH, 0.18 * CONTENT_WIDTH]
        headers = ['Adet', 'Ürün / Hizmet', 'Birim', 'Birim Fiyat', 'Toplam']
        
        # Header background
        header_height = 25
        c.setFillColor(AKTURK_BLUE)
        c.roundRect(MARGIN_LEFT, y - header_height, CONTENT_WIDTH, header_height, 5, fill=True, stroke=False)
        
        # Header text
        c.setFillColor(colors.white)
        c.setFont(FONT_BOLD, 9)
        header_x = MARGIN_LEFT + 5
        for i, (header, width) in enumerate(zip(headers, col_widths)):
            c.drawString(header_x, y - 16, header)
            header_x += width
        
        y -= header_height + 5
        
        # Table rows
        row_height = 22
        currency = self.quote.get('currency', 'TRY')
        
        for idx, item in enumerate(self.items):
            # Alternating row background
            if idx % 2 == 0:
                c.setFillColor(BG_LIGHT)
                c.rect(MARGIN_LEFT, y - row_height, CONTENT_WIDTH, row_height, fill=True, stroke=False)
            
            # Row data
            quantity = item.get('quantity', 1)
            product_name = item.get('product_name', 'Ürün')
            unit = item.get('unit', 'Adet')
            
            if currency == 'USD':
                unit_price = item.get('unit_price_usd', 0) or item.get('unit_price', 0)
                line_total = item.get('total_price_usd', 0) or (quantity * unit_price)
                price_fmt = lambda v: f"${v:,.2f}"
            else:
                unit_price = item.get('unit_price_tl', 0) or item.get('unit_price', 0)
                line_total = item.get('total_price_tl', 0) or (quantity * unit_price)
                price_fmt = lambda v: f"₺{v:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
            
            c.setFillColor(AKTURK_GRAY)
            c.setFont(FONT_NORMAL, 8)
            
            row_x = MARGIN_LEFT + 5
            row_data = [
                str(quantity),
                product_name[:45] + ('...' if len(product_name) > 45 else ''),
                unit,
                price_fmt(unit_price),
                price_fmt(line_total)
            ]
            
            for i, (data, width) in enumerate(zip(row_data, col_widths)):
                if i == 4:  # Right align total
                    c.setFont(FONT_BOLD, 8)
                c.drawString(row_x, y - 14, data)
                row_x += width
            
            y -= row_height
        
        y -= 15
        
        # TOTALS SECTION
        totals_height = 100
        c.setFillColor(BG_LIGHT)
        c.roundRect(MARGIN_LEFT, y - totals_height, CONTENT_WIDTH, totals_height, 8, fill=True, stroke=False)
        
        # Get quote totals
        subtotal = self.quote.get('subtotal_tl', 0) or self.quote.get('subtotal_usd', 0) or 0
        discount = self.quote.get('discount_amount_tl', 0) or 0
        vat_rate = self.quote.get('vat_rate', 20) or 20
        vat_amount = self.quote.get('vat_amount_tl', 0) or 0
        total = self.quote.get('total_tl', 0) or self.quote.get('total_usd', 0) or 0
        
        totals_x = PAGE_WIDTH - MARGIN_RIGHT - 180
        totals_y = y - 20
        
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_NORMAL, 9)
        c.drawString(totals_x, totals_y, "Ara Toplam:")
        c.setFont(FONT_BOLD, 9)
        c.drawRightString(PAGE_WIDTH - MARGIN_RIGHT - 10, totals_y, format_currency(subtotal))
        
        if discount > 0:
            totals_y -= 18
            c.setFont(FONT_NORMAL, 9)
            c.drawString(totals_x, totals_y, "İskonto:")
            c.setFillColor(SUCCESS_GREEN)
            c.setFont(FONT_BOLD, 9)
            c.drawRightString(PAGE_WIDTH - MARGIN_RIGHT - 10, totals_y, f"-{format_currency(discount)}")
        
        totals_y -= 18
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_NORMAL, 9)
        c.drawString(totals_x, totals_y, f"KDV (%{vat_rate:.0f}):")
        c.setFont(FONT_BOLD, 9)
        c.drawRightString(PAGE_WIDTH - MARGIN_RIGHT - 10, totals_y, format_currency(vat_amount))
        
        totals_y -= 25
        c.setFillColor(AKTURK_BLUE)
        c.setFont(FONT_BOLD, 12)
        c.drawString(totals_x, totals_y, "GENEL TOPLAM:")
        c.setFont(FONT_BOLD, 14)
        c.drawRightString(PAGE_WIDTH - MARGIN_RIGHT - 10, totals_y, format_currency(total))
        
        self._draw_footer(c, 5)
        
        c.save()
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 6: WARRANTY ====================
    def _create_warranty_page(self) -> BytesIO:
        """Payment, warranty and delivery"""
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        self._draw_header(c, 6)
        
        y = PAGE_HEIGHT - 60
        
        # Page title
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 16)
        c.drawCentredString(PAGE_WIDTH / 2, y, "ÖDEME, GARANTİ VE TESLİMAT")
        
        y -= 40
        
        # Three cards layout
        card_width = (CONTENT_WIDTH - 20) / 3
        card_height = 200
        
        cards = [
            {
                'title': 'ÖDEME SEÇENEKLERİ',
                'color': '#247dc0',
                'items': [
                    ('💵', 'Peşin Ödeme'),
                    ('🏦', 'Havale / EFT'),
                    ('💳', 'Kredi Kartı'),
                    ('📅', 'Vadeli Ödeme'),
                ]
            },
            {
                'title': 'GARANTİ KOŞULLARI',
                'color': '#059669',
                'items': [
                    ('☀', 'Panel: 25 Yıl Performans'),
                    ('⚡', 'İnverter: 10 Yıl'),
                    ('🔋', 'Batarya: 10 Yıl'),
                    ('🔧', 'İşçilik: 2 Yıl'),
                ]
            },
            {
                'title': 'TESLİMAT SÜRECİ',
                'color': '#f59e0b',
                'items': [
                    ('📋', 'Proje Onayı: 1-2 Gün'),
                    ('📦', 'Tedarik: 7-14 Gün'),
                    ('🔨', 'Kurulum: 2-5 Gün'),
                    ('✅', 'Devreye Alma: 1 Gün'),
                ]
            }
        ]
        
        for i, card in enumerate(cards):
            x = MARGIN_LEFT + (i * (card_width + 10))
            
            # Card background
            c.setFillColor(BG_LIGHT)
            c.roundRect(x, y - card_height, card_width, card_height, 10, fill=True, stroke=False)
            
            # Top color bar
            c.setFillColor(colors.HexColor(card['color']))
            c.roundRect(x, y - 8, card_width, 8, 5, fill=True, stroke=False)
            c.rect(x, y - 12, card_width, 8, fill=True, stroke=False)
            
            # Title
            c.setFillColor(colors.HexColor(card['color']))
            c.setFont(FONT_BOLD, 9)
            c.drawCentredString(x + card_width/2, y - 30, card['title'])
            
            # Items
            item_y = y - 55
            for icon, text in card['items']:
                c.setFont(FONT_NORMAL, 12)
                c.drawString(x + 15, item_y, icon)
                
                c.setFillColor(AKTURK_GRAY)
                c.setFont(FONT_NORMAL, 8)
                c.drawString(x + 35, item_y, text)
                
                item_y -= 30
        
        y -= card_height + 30
        
        # Important note
        c.setFillColor(colors.HexColor('#fef3c7'))
        c.roundRect(MARGIN_LEFT, y - 50, CONTENT_WIDTH, 50, 8, fill=True, stroke=False)
        
        c.setFillColor(WARNING_ORANGE)
        c.setFont(FONT_BOLD, 10)
        c.drawString(MARGIN_LEFT + 15, y - 20, "ÖNEMLİ BİLGİ")
        
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_NORMAL, 8)
        c.drawString(MARGIN_LEFT + 15, y - 38, "Garanti kapsamı, ekipmanların yetkili servis tarafından kurulması ve düzenli bakımlarının yapılması koşuluna bağlıdır.")
        
        self._draw_footer(c, 6)
        
        c.save()
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 7: BANK INFO ====================
    def _create_bank_info_page(self) -> BytesIO:
        """Bank accounts and financing options"""
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        self._draw_header(c, 7)
        
        y = PAGE_HEIGHT - 60
        
        # Page title
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 16)
        c.drawCentredString(PAGE_WIDTH / 2, y, "BANKA & FİNANSMAN BİLGİLERİ")
        
        y -= 40
        
        # Bank accounts section
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 12)
        c.drawString(MARGIN_LEFT, y, "BANKA HESAP BİLGİLERİ")
        
        y -= 20
        
        bank_accounts = self.settings.get('bank_accounts', [])
        
        if bank_accounts:
            for account in bank_accounts[:3]:  # Max 3 accounts
                # Account card
                card_height = 70
                c.setFillColor(BG_LIGHT)
                c.roundRect(MARGIN_LEFT, y - card_height, CONTENT_WIDTH, card_height, 8, fill=True, stroke=False)
                
                c.setFillColor(AKTURK_BLUE)
                c.roundRect(MARGIN_LEFT, y - card_height, 4, card_height, 2, fill=True, stroke=False)
                
                # Bank name
                c.setFillColor(AKTURK_BLUE)
                c.setFont(FONT_BOLD, 11)
                c.drawString(MARGIN_LEFT + 15, y - 18, account.get('bank_name', 'Banka'))
                
                # Account details
                c.setFillColor(AKTURK_GRAY)
                c.setFont(FONT_NORMAL, 9)
                c.drawString(MARGIN_LEFT + 15, y - 35, f"Hesap Sahibi: {account.get('account_holder', '-')}")
                c.drawString(MARGIN_LEFT + 15, y - 50, f"IBAN: {account.get('iban', '-')}")
                
                if account.get('branch'):
                    c.drawString(MARGIN_LEFT + 300, y - 35, f"Şube: {account.get('branch', '-')}")
                
                y -= card_height + 10
        else:
            # Default bank info from legacy fields
            card_height = 70
            c.setFillColor(BG_LIGHT)
            c.roundRect(MARGIN_LEFT, y - card_height, CONTENT_WIDTH, card_height, 8, fill=True, stroke=False)
            
            c.setFillColor(AKTURK_GRAY)
            c.setFont(FONT_NORMAL, 9)
            c.drawCentredString(PAGE_WIDTH / 2, y - 35, "Banka hesap bilgileri için lütfen bizimle iletişime geçin.")
            
            y -= card_height + 10
        
        y -= 20
        
        # Financing options section
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 12)
        c.drawString(MARGIN_LEFT, y, "KREDİ KARTI TAKSİT SEÇENEKLERİ")
        
        y -= 25
        
        installment_options = self.settings.get('installment_options', [])
        
        if installment_options:
            # Table header
            c.setFillColor(AKTURK_BLUE)
            c.roundRect(MARGIN_LEFT, y - 25, CONTENT_WIDTH, 25, 5, fill=True, stroke=False)
            
            c.setFillColor(colors.white)
            c.setFont(FONT_BOLD, 9)
            c.drawString(MARGIN_LEFT + 15, y - 16, "Banka")
            c.drawString(MARGIN_LEFT + 200, y - 16, "Taksit Sayısı")
            c.drawString(MARGIN_LEFT + 350, y - 16, "Komisyon")
            
            y -= 30
            
            for opt in installment_options:
                c.setFillColor(AKTURK_GRAY)
                c.setFont(FONT_NORMAL, 9)
                c.drawString(MARGIN_LEFT + 15, y - 12, opt.get('bank_name', '-'))
                c.drawString(MARGIN_LEFT + 200, y - 12, f"{opt.get('installments', '-')} Taksit")
                c.drawString(MARGIN_LEFT + 350, y - 12, f"%{opt.get('rate', 0)}")
                y -= 22
        else:
            c.setFillColor(BG_LIGHT)
            c.roundRect(MARGIN_LEFT, y - 50, CONTENT_WIDTH, 50, 8, fill=True, stroke=False)
            
            c.setFillColor(AKTURK_GRAY)
            c.setFont(FONT_NORMAL, 9)
            c.drawCentredString(PAGE_WIDTH / 2, y - 25, "Kredi kartı taksit seçenekleri için lütfen bizimle iletişime geçin.")
            
            y -= 60
        
        y -= 30
        
        # Contact info
        c.setFillColor(colors.HexColor('#e0f2fe'))
        c.roundRect(MARGIN_LEFT, y - 60, CONTENT_WIDTH, 60, 8, fill=True, stroke=False)
        
        c.setFillColor(AKTURK_BLUE)
        c.setFont(FONT_BOLD, 10)
        c.drawCentredString(PAGE_WIDTH / 2, y - 20, "Finansman Seçenekleri Hakkında Bilgi İçin")
        
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_NORMAL, 9)
        phone = self.settings.get('phone', '')
        email = self.settings.get('email', '')
        c.drawCentredString(PAGE_WIDTH / 2, y - 40, f"📞 {phone}  |  ✉ {email}")
        
        self._draw_footer(c, 7)
        
        c.save()
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 8: APPENDIX COVER ====================
    def _create_appendix_cover_page(self) -> BytesIO:
        """Technical appendix cover"""
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Full blue background
        c.setFillColor(AKTURK_BLUE)
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=True, stroke=False)
        
        # White content box
        box_width = PAGE_WIDTH * 0.7
        box_height = 150
        box_x = (PAGE_WIDTH - box_width) / 2
        box_y = (PAGE_HEIGHT - box_height) / 2
        
        c.setFillColor(colors.white)
        c.roundRect(box_x, box_y, box_width, box_height, 15, fill=True, stroke=False)
        
        # Title
        c.setFillColor(AKTURK_GRAY)
        c.setFont(FONT_BOLD, 24)
        c.drawCentredString(PAGE_WIDTH / 2, box_y + box_height - 50, "TEKNİK EKLER")
        
        # Subtitle
        c.setFillColor(AKTURK_GRAY_LIGHT)
        c.setFont(FONT_NORMAL, 11)
        c.drawCentredString(PAGE_WIDTH / 2, box_y + box_height - 80, "Seçilen Ekipmanlara Ait")
        c.drawCentredString(PAGE_WIDTH / 2, box_y + box_height - 95, "Teknik Dokümanlar")
        
        # Page indicator
        c.setFillColor(colors.white)
        c.setFont(FONT_NORMAL, 9)
        c.drawCentredString(PAGE_WIDTH / 2, 40, f"Sayfa 8")
        
        c.save()
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 9: CLOSING ====================
    def _create_closing_page(self) -> BytesIO:
        """Closing cover page"""
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Gradient background (reverse of cover)
        gradient_steps = 30
        for i in range(gradient_steps):
            ratio = i / gradient_steps
            r = int(36 - (36 - 26) * ratio)
            g = int(125 - (125 - 90) * ratio)
            b = int(192 - (192 - 138) * ratio)
            c.setFillColor(colors.HexColor(f'#{r:02x}{g:02x}{b:02x}'))
            step_height = PAGE_HEIGHT / gradient_steps
            c.rect(0, (i * step_height), PAGE_WIDTH, step_height + 1, fill=True, stroke=False)
        
        y = PAGE_HEIGHT / 2 + 100
        
        # Thank you message
        c.setFillColor(colors.white)
        c.setFont(FONT_BOLD, 28)
        c.drawCentredString(PAGE_WIDTH / 2, y, "Teşekkür Ederiz")
        
        y -= 40
        c.setFont(FONT_NORMAL, 12)
        c.drawCentredString(PAGE_WIDTH / 2, y, "Güneş enerjisi yatırımınızda bize güvendiğiniz için")
        
        y -= 60
        
        # Company info box
        box_width = 300
        box_height = 120
        box_x = (PAGE_WIDTH - box_width) / 2
        
        c.setFillColor(colors.HexColor('#ffffff20'))  # Semi-transparent white
        c.roundRect(box_x, y - box_height, box_width, box_height, 10, fill=True, stroke=False)
        
        c.setFillColor(colors.white)
        c.setFont(FONT_BOLD, 16)
        c.drawCentredString(PAGE_WIDTH / 2, y - 25, "AKTÜRK ENERJİ")
        
        c.setFont(FONT_NORMAL, 10)
        company_phone = self.settings.get('phone', '')
        company_email = self.settings.get('email', '')
        company_address = self.settings.get('address', '')
        
        c.drawCentredString(PAGE_WIDTH / 2, y - 50, f"📞 {company_phone}")
        c.drawCentredString(PAGE_WIDTH / 2, y - 68, f"✉ {company_email}")
        if company_address:
            # Truncate address if too long
            addr = company_address[:50] + ('...' if len(company_address) > 50 else '')
            c.drawCentredString(PAGE_WIDTH / 2, y - 86, f"📍 {addr}")
        
        # Bottom tagline
        c.setFont(FONT_NORMAL, 9)
        c.drawCentredString(PAGE_WIDTH / 2, 50, "Sürdürülebilir Enerji, Aydınlık Gelecek")
        
        c.save()
        buffer.seek(0)
        return buffer
    
    def _merge_pages(self, pages: list) -> BytesIO:
        """Merge all PDF pages into one"""
        writer = PdfWriter()
        
        for page_buffer in pages:
            reader = PdfReader(page_buffer)
            for page in reader.pages:
                writer.add_page(page)
        
        # Add datasheets if available
        self._add_datasheets(writer)
        
        output = BytesIO()
        writer.write(output)
        output.seek(0)
        return output
    
    def _add_datasheets(self, writer: PdfWriter):
        """Add product datasheets to PDF"""
        for item in self.items:
            datasheet = item.get('datasheet')
            if datasheet:
                datasheet_path = Path(self.uploads_dir) / datasheet
                if datasheet_path.exists():
                    try:
                        reader = PdfReader(str(datasheet_path))
                        for page in reader.pages:
                            writer.add_page(page)
                        logger.info(f"Added datasheet: {datasheet}")
                    except Exception as e:
                        logger.error(f"Error adding datasheet {datasheet}: {e}")


def generate_offgrid_quote_pdf(quote_data: dict, company_settings: dict, uploads_dir: str = None) -> BytesIO:
    """Main function to generate OFF-GRID quote PDF"""
    generator = OffGridPDFGenerator(quote_data, company_settings, uploads_dir)
    return generator.generate()
