"""
Solar Energy Sales System - PREMIUM PDF Quote Generator
World-class professional quote document with stunning visual design
Turkish character support with DejaVu Sans font

DESIGN PHILOSOPHY:
- Page 1: COVER - Full visual impact, category-based template
- Page 2: VALUE PROPOSITION - Why choose us (NO PRICES)
- Page 3: SYSTEM ANALYSIS - Benefits & production (calculations preserved)
- Page 4: PRODUCTS SHOWCASE - 2-column card grid (NO PRICES)
- Page 5: PRICE QUOTE - Full pricing table (unchanged logic)
- Page 6: TERMS - Short conditions
- Page 7+: ATTACHMENTS - Datasheets & contract
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak, KeepTogether
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PyPDF2 import PdfReader, PdfWriter
from io import BytesIO
from pathlib import Path
from datetime import datetime
import os
import logging
import textwrap

logger = logging.getLogger(__name__)

# Register Turkish-compatible fonts
try:
    pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
    FONT_NORMAL = 'DejaVuSans'
    FONT_BOLD = 'DejaVuSans-Bold'
except:
    logger.warning("DejaVu fonts not found, falling back to Helvetica")
    FONT_NORMAL = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'

# A4 Page Settings
PAGE_WIDTH, PAGE_HEIGHT = A4  # 210mm x 297mm
MARGIN_TOP = 15 * mm
MARGIN_BOTTOM = 15 * mm
MARGIN_LEFT = 15 * mm
MARGIN_RIGHT = 15 * mm

# Content area dimensions
CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM

# PDF Template Background Image
PDF_TEMPLATE_BG = Path(__file__).parent / 'uploads' / 'pdf_template_background.jpeg'

# Adjusted margins for template (to avoid logo/contact areas)
TEMPLATE_CONTENT_TOP = PAGE_HEIGHT - 60 * mm  # Start below top sun icon
TEMPLATE_CONTENT_BOTTOM = 55 * mm  # End above bottom logo area

# AKTÜRK ENERJİ Kurumsal Renk Paleti
PRIMARY_COLOR = colors.HexColor('#247dc0')      # Aktürk Mavi (ENERJİ)
PRIMARY_DARK = colors.HexColor('#1a5a8a')       # Koyu Mavi
PRIMARY_LIGHT = colors.HexColor('#7ba5d1')      # Açık Mavi
SECONDARY_COLOR = colors.HexColor('#404041')    # Aktürk Gri (AKTÜRK)
ACCENT_COLOR = colors.HexColor('#10b981')       # Yeşil (başarı/tasarruf için)
TEXT_COLOR = colors.HexColor('#404041')         # Koyu Gri (metin)
TEXT_LIGHT = colors.HexColor('#858585')         # Açık Gri
HEADER_BG = colors.HexColor('#f0f5fa')          # Çok açık mavi arka plan
BORDER_COLOR = colors.HexColor('#dae4f0')       # Mavi-gri border
SUCCESS_COLOR = colors.HexColor('#059669')      # Yeşil (tasarruf)
WARNING_COLOR = colors.HexColor('#ea580c')      # Turuncu (uyarı)

# Column widths for product table
COL_MIKTAR = 0.10 * CONTENT_WIDTH
COL_BIRIM = 0.10 * CONTENT_WIDTH
COL_URUN = 0.40 * CONTENT_WIDTH
COL_BIRIM_FIYAT = 0.20 * CONTENT_WIDTH
COL_TOPLAM_FIYAT = 0.20 * CONTENT_WIDTH


def draw_template_background(canvas_obj):
    """Draw the template background image on the page"""
    if PDF_TEMPLATE_BG.exists():
        try:
            canvas_obj.drawImage(
                str(PDF_TEMPLATE_BG), 
                0, 0, 
                width=PAGE_WIDTH, 
                height=PAGE_HEIGHT, 
                preserveAspectRatio=False,
                mask='auto'
            )
            return True
        except Exception as e:
            logger.warning(f"Could not draw template background: {e}")
    return False


def format_currency(value, currency='TRY'):
    """Format number as Turkish currency"""
    if currency == 'TRY':
        return f"₺{value:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    return f"${value:,.2f}"


def truncate_text(text, max_chars=80):
    """Truncate text with ellipsis"""
    if len(text) <= max_chars:
        return text
    return text[:max_chars-3] + "..."


def create_styles():
    """Create premium paragraph styles"""
    styles = getSampleStyleSheet()
    
    # Override BodyText with our custom styling
    if 'BodyText' in styles.byName:
        styles['BodyText'].fontSize = 11
        styles['BodyText'].fontName = FONT_NORMAL
        styles['BodyText'].textColor = TEXT_COLOR
        styles['BodyText'].leading = 16
        styles['BodyText'].alignment = TA_JUSTIFY
        styles['BodyText'].spaceAfter = 8
    
    # Hero title for cover
    styles.add(ParagraphStyle(
        name='HeroTitle',
        fontSize=42,
        fontName=FONT_BOLD,
        textColor=colors.white,
        alignment=TA_CENTER,
        leading=50,
    ))
    
    styles.add(ParagraphStyle(
        name='HeroSubtitle',
        fontSize=18,
        fontName=FONT_NORMAL,
        textColor=colors.HexColor('#fbbf24'),
        alignment=TA_CENTER,
        leading=24,
    ))
    
    styles.add(ParagraphStyle(
        name='PageTitle',
        fontSize=24,
        fontName=FONT_BOLD,
        textColor=SECONDARY_COLOR,
        alignment=TA_CENTER,
        spaceAfter=20,
        spaceBefore=10,
    ))
    
    styles.add(ParagraphStyle(
        name='SectionTitle',
        fontSize=14,
        fontName=FONT_BOLD,
        textColor=SECONDARY_COLOR,
        spaceBefore=15,
        spaceAfter=8,
    ))
    
    styles.add(ParagraphStyle(
        name='PremiumBodyText',
        fontSize=11,
        fontName=FONT_NORMAL,
        textColor=TEXT_COLOR,
        leading=16,
        alignment=TA_JUSTIFY,
        spaceAfter=8,
    ))
    
    styles.add(ParagraphStyle(
        name='BodyTextSmall',
        fontSize=9,
        fontName=FONT_NORMAL,
        textColor=TEXT_COLOR,
        leading=13,
        alignment=TA_JUSTIFY,
    ))
    
    styles.add(ParagraphStyle(
        name='ValueHighlight',
        fontSize=12,
        fontName=FONT_BOLD,
        textColor=PRIMARY_DARK,
        leading=16,
        spaceBefore=5,
        spaceAfter=5,
    ))
    
    styles.add(ParagraphStyle(
        name='IconText',
        fontSize=10,
        fontName=FONT_NORMAL,
        textColor=TEXT_COLOR,
        leading=14,
    ))
    
    styles.add(ParagraphStyle(
        name='CardTitle',
        fontSize=11,
        fontName=FONT_BOLD,
        textColor=TEXT_COLOR,
        leading=14,
    ))
    
    styles.add(ParagraphStyle(
        name='CardDescription',
        fontSize=8,
        fontName=FONT_NORMAL,
        textColor=TEXT_LIGHT,
        leading=11,
    ))
    
    styles.add(ParagraphStyle(
        name='CardFeature',
        fontSize=7,
        fontName=FONT_NORMAL,
        textColor=ACCENT_COLOR,
        leading=10,
    ))
    
    styles.add(ParagraphStyle(
        name='BigNumber',
        fontSize=28,
        fontName=FONT_BOLD,
        textColor=PRIMARY_DARK,
        alignment=TA_CENTER,
    ))
    
    styles.add(ParagraphStyle(
        name='BigNumberLabel',
        fontSize=9,
        fontName=FONT_NORMAL,
        textColor=TEXT_LIGHT,
        alignment=TA_CENTER,
    ))
    
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontSize=9,
        fontName=FONT_BOLD,
        textColor=colors.white,
        leading=12,
        alignment=TA_CENTER,
    ))
    
    styles.add(ParagraphStyle(
        name='TableCell',
        fontSize=9,
        fontName=FONT_NORMAL,
        textColor=TEXT_COLOR,
        leading=12,
        wordWrap='CJK',
    ))
    
    styles.add(ParagraphStyle(
        name='TableCellCenter',
        fontSize=9,
        fontName=FONT_NORMAL,
        textColor=TEXT_COLOR,
        leading=12,
        alignment=TA_CENTER,
    ))
    
    styles.add(ParagraphStyle(
        name='TableCellRight',
        fontSize=9,
        fontName=FONT_NORMAL,
        textColor=TEXT_COLOR,
        leading=12,
        alignment=TA_RIGHT,
    ))
    
    styles.add(ParagraphStyle(
        name='GrandTotal',
        fontSize=14,
        fontName=FONT_BOLD,
        textColor=PRIMARY_COLOR,
        alignment=TA_RIGHT,
    ))
    
    styles.add(ParagraphStyle(
        name='FooterText',
        fontSize=8,
        fontName=FONT_NORMAL,
        textColor=TEXT_LIGHT,
        alignment=TA_CENTER,
    ))
    
    styles.add(ParagraphStyle(
        name='CompanyName',
        fontSize=11,
        fontName=FONT_BOLD,
        textColor=TEXT_COLOR,
        leading=14,
    ))
    
    styles.add(ParagraphStyle(
        name='CompanyInfo',
        fontSize=8,
        fontName=FONT_NORMAL,
        textColor=TEXT_COLOR,
        leading=11,
    ))
    
    styles.add(ParagraphStyle(
        name='CustomerName',
        fontSize=14,
        fontName=FONT_BOLD,
        textColor=TEXT_COLOR,
        leading=18,
    ))
    
    styles.add(ParagraphStyle(
        name='CustomerInfo',
        fontSize=10,
        fontName=FONT_NORMAL,
        textColor=TEXT_COLOR,
        leading=13,
    ))
    
    styles.add(ParagraphStyle(
        name='TermsText',
        fontSize=9,
        fontName=FONT_NORMAL,
        textColor=TEXT_COLOR,
        leading=13,
        spaceBefore=3,
        spaceAfter=3,
    ))
    
    styles.add(ParagraphStyle(
        name='ContractTitle',
        fontSize=14,
        fontName=FONT_BOLD,
        textColor=TEXT_COLOR,
        alignment=TA_CENTER,
        spaceBefore=10,
        spaceAfter=15,
    ))
    
    styles.add(ParagraphStyle(
        name='ContractText',
        fontSize=10,
        fontName=FONT_NORMAL,
        textColor=TEXT_COLOR,
        leading=14,
        spaceBefore=3,
        spaceAfter=3,
    ))
    
    styles.add(ParagraphStyle(
        name='QuoteTitle',
        fontSize=16,
        fontName=FONT_BOLD,
        textColor=PRIMARY_COLOR,
        alignment=TA_CENTER,
        spaceAfter=10,
    ))
    
    styles.add(ParagraphStyle(
        name='Notes',
        fontSize=9,
        fontName=FONT_NORMAL,
        textColor=TEXT_COLOR,
        leading=12,
    ))
    
    return styles


class PremiumQuotePDFGenerator:
    """Generate world-class professional PDF quotes"""
    
    def __init__(self, upload_dir: str):
        self.upload_dir = Path(upload_dir)
        self.styles = create_styles()
    
    def generate(self, quote_data: dict, company_settings: dict, quote_templates: list = None) -> BytesIO:
        """Generate complete premium PDF"""
        pdf_parts = []
        
        # Get category for template selection
        category_id = self._get_category_id(quote_data.get('customer_category_name', ''))
        template_cover = self._get_template_cover(category_id, quote_templates)
        
        # PAGE 1: Cover Page (Category-based or auto-generated)
        cover_pdf = self._create_cover_page(quote_data, company_settings, template_cover)
        if cover_pdf:
            pdf_parts.append(cover_pdf)
        
        # PAGE 2: Value Proposition Page (NO PRICES)
        value_pdf = self._create_value_page(quote_data, company_settings)
        pdf_parts.append(value_pdf)
        
        # PAGE 3: System Analysis & Benefits (calculations preserved)
        category_name = quote_data.get('customer_category_name', '').lower()
        show_analysis = any(cat in category_name for cat in ['off', 'on', 'grid', 'sulama', 'hibrit'])
        if show_analysis:
            analysis_pdf = self._create_analysis_page(quote_data, company_settings)
            if analysis_pdf:
                pdf_parts.append(analysis_pdf)
        
        # PAGE 4: Products Showcase (2-column cards, NO PRICES)
        products_pdf = self._create_products_showcase_page(quote_data, company_settings)
        if products_pdf:
            pdf_parts.append(products_pdf)
        
        # PAGE 5: Price Quote (Full pricing table - UNCHANGED LOGIC)
        price_pdf = self._create_price_page(quote_data, company_settings)
        pdf_parts.append(price_pdf)
        
        # PAGE 6: Terms (Short conditions)
        terms_pdf = self._create_terms_page(quote_data, company_settings)
        if terms_pdf:
            pdf_parts.append(terms_pdf)
        
        # PAGE 7+: Attachments (Contract + Datasheets)
        contract_pdf = self._create_contract_page(quote_data, company_settings)
        if contract_pdf:
            pdf_parts.append(contract_pdf)
        
        datasheet_pdfs = self._collect_datasheets(quote_data.get('items', []))
        pdf_parts.extend(datasheet_pdfs)
        
        return self._merge_pdfs(pdf_parts)
    
    def _get_category_id(self, category_name: str) -> str:
        """Map category name to template ID"""
        name_lower = category_name.lower()
        if 'on' in name_lower and 'grid' in name_lower:
            return 'on_grid'
        elif 'off' in name_lower and 'grid' in name_lower:
            return 'off_grid'
        elif 'hibrit' in name_lower or 'hybrid' in name_lower:
            return 'hybrid'
        elif 'sulama' in name_lower or 'irrigation' in name_lower:
            return 'solar_irrigation'
        return None
    
    def _get_template_cover(self, category_id: str, quote_templates: list) -> str:
        """Get cover image path from template"""
        if not category_id or not quote_templates:
            return None
        
        for template in quote_templates:
            if template.get('category_id') == category_id:
                return template.get('cover_image')
        return None
    
    # ==================== PAGE 1: COVER PAGE ====================
    def _create_cover_page(self, quote_data: dict, company_settings: dict, template_cover: str = None) -> BytesIO:
        """Create cover page using uploaded template images"""
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Priority: 1) Category-specific template, 2) General company cover
        cover_image_path = template_cover
        if not cover_image_path:
            cover_image_path = company_settings.get('quote_cover_image')
        
        # Use uploaded cover image
        if cover_image_path:
            img_path = self.upload_dir / cover_image_path.replace('/uploads/', '').replace('uploads/', '')
            if img_path.exists():
                try:
                    c.drawImage(str(img_path), 0, 0, width=PAGE_WIDTH, height=PAGE_HEIGHT, preserveAspectRatio=False)
                    c.save()
                    buffer.seek(0)
                    return buffer
                except Exception as e:
                    logger.warning(f"Could not load cover image: {e}")
        
        # Fallback: Simple cover if no image uploaded
        c.setFillColor(SECONDARY_COLOR)
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=True)
        
        c.setFillColor(colors.white)
        c.setFont(FONT_BOLD, 36)
        c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT / 2, "TEKLİF")
        
        quote_number = quote_data.get('quote_number', '')
        c.setFont(FONT_NORMAL, 14)
        c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT / 2 - 40, f"No: {quote_number}")
        
        c.save()
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 2: VALUE PROPOSITION ====================
    def _create_value_page(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """Create value proposition page - NO PRICES"""
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Draw template background
        draw_template_background(c)
        
        # Page title - positioned in the content area
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 22)
        c.drawCentredString(PAGE_WIDTH / 2, TEMPLATE_CONTENT_TOP - 10, "NEDEN BİZ?")
        
        y = TEMPLATE_CONTENT_TOP - 50
        
        # Introduction paragraph
        company_name = company_settings.get('company_name', 'Firmamız')
        category_name = quote_data.get('customer_category_name', 'güneş enerjisi')
        
        intro_text = f"""{company_name} olarak, {category_name} sistemleri konusunda uzmanlaşmış deneyimli ekibimizle size en uygun çözümü sunmak için bu teklifi hazırladık."""
        
        # Draw intro text
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 11)
        text_obj = c.beginText(MARGIN_LEFT + 10, y)
        text_obj.setLeading(16)
        for line in textwrap.wrap(intro_text.strip(), width=85):
            text_obj.textLine(line)
        c.drawText(text_obj)
        
        y -= 100
        
        # Value propositions with icons (4 boxes in 2x2 grid)
        values = [
            {
                'icon': '✓',
                'title': 'Kaliteli Ürün Seçimi',
                'desc': 'Sadece dünya standartlarında, sertifikalı ve uzun ömürlü ürünler kullanıyoruz.',
                'color': '#059669'
            },
            {
                'icon': '⚡',
                'title': 'Yüksek Verimlilik',
                'desc': 'Sistemlerimiz maksimum enerji üretimi için optimize edilmiştir.',
                'color': '#f59e0b'
            },
            {
                'icon': '🛡',
                'title': 'Güvenilir Kurulum',
                'desc': 'Uzman montaj ekibimiz her projeyi titizlikle tamamlar.',
                'color': '#3b82f6'
            },
            {
                'icon': '∞',
                'title': 'Uzun Vadeli Destek',
                'desc': 'Satış sonrası teknik destek ve garanti hizmetlerimizle yanınızdayız.',
                'color': '#8b5cf6'
            }
        ]
        
        box_width = (CONTENT_WIDTH - 20) / 2
        box_height = 100
        
        for i, val in enumerate(values):
            col = i % 2
            row = i // 2
            
            x = MARGIN_LEFT + (col * (box_width + 20))
            box_y = y - (row * (box_height + 15))
            
            # Box with colored left border
            c.setFillColor(colors.HexColor('#f8fafc'))
            c.roundRect(x, box_y - box_height, box_width, box_height, 8, fill=True)
            
            # Colored accent bar on left
            c.setFillColor(colors.HexColor(val['color']))
            c.rect(x, box_y - box_height, 5, box_height, fill=True)
            
            # Icon circle
            c.setFillColor(colors.HexColor(val['color']))
            c.circle(x + 30, box_y - 25, 15, fill=True)
            c.setFillColor(colors.white)
            c.setFont(FONT_BOLD, 14)
            c.drawCentredString(x + 30, box_y - 30, val['icon'])
            
            # Title
            c.setFillColor(TEXT_COLOR)
            c.setFont(FONT_BOLD, 12)
            c.drawString(x + 55, box_y - 28, val['title'])
            
            # Description
            c.setFont(FONT_NORMAL, 9)
            c.setFillColor(TEXT_LIGHT)
            desc_lines = textwrap.wrap(val['desc'], width=35)
            for j, line in enumerate(desc_lines[:3]):
                c.drawString(x + 55, box_y - 48 - (j * 12), line)
        
        y -= 250
        
        # Customer-focused message box
        c.setFillColor(colors.HexColor('#fffbeb'))
        c.setStrokeColor(PRIMARY_COLOR)
        c.setLineWidth(2)
        c.roundRect(MARGIN_LEFT, y - 80, CONTENT_WIDTH, 80, 10, fill=True, stroke=True)
        
        c.setFillColor(PRIMARY_DARK)
        c.setFont(FONT_BOLD, 12)
        c.drawCentredString(PAGE_WIDTH / 2, y - 25, "Size Özel Hazırlandı")
        
        c.setFont(FONT_NORMAL, 10)
        c.setFillColor(TEXT_COLOR)
        customer_name = quote_data.get('customer_name', 'Değerli Müşterimiz')
        msg = f"Sayın {customer_name}, ihtiyaçlarınıza özel olarak hazırlanan bu teklif,"
        msg2 = "sizin için en uygun sistem konfigürasyonunu içermektedir."
        c.drawCentredString(PAGE_WIDTH / 2, y - 45, msg)
        c.drawCentredString(PAGE_WIDTH / 2, y - 60, msg2)
        
        # Footer
        self._draw_page_footer(c, 2)
        
        c.save()
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 3: SYSTEM ANALYSIS (PREMIUM REDESIGN) ====================
    def _create_analysis_page(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """
        PREMIUM System Analysis Page - Sales-focused, visually stunning design
        Features: Component explanations, amortization, carbon impact, risk disclaimers
        """
        
        items = quote_data.get('items', [])
        
        # Calculate power values (UNCHANGED LOGIC)
        total_panel_watt = 0
        total_inverter_watt = 0
        total_battery_watt = 0
        
        for item in items:
            power = item.get('power_watt', 0) or 0
            quantity = item.get('quantity', 1)
            category = (item.get('category_name') or '').lower().replace('i̇', 'i').replace('ı', 'i')
            product_name = (item.get('product_name') or '').lower().replace('i̇', 'i').replace('ı', 'i')
            
            if any(x in category or x in product_name for x in ['batarya', 'akü', 'battery', 'depolama', 'lityum']):
                total_battery_watt += power * quantity
            elif any(x in category or x in product_name for x in ['inverter', 'invertor', 'evirici']):
                total_inverter_watt += power * quantity
            elif any(x in category or x in product_name for x in ['panel', 'güneş', 'solar', 'mono', 'poli']):
                total_panel_watt += power * quantity
        
        if total_panel_watt == 0 and total_inverter_watt == 0 and total_battery_watt == 0:
            return None
        
        panel_kw = total_panel_watt / 1000
        inverter_kw = total_inverter_watt / 1000
        battery_kwh = total_battery_watt / 1000
        
        # Production calculations (UNCHANGED)
        daily_sun_hours = 5
        daily_production = panel_kw * daily_sun_hours
        monthly_production = daily_production * 30
        yearly_production = daily_production * 365
        
        # System type detection (UNCHANGED)
        category_name = quote_data.get('customer_category_name', '').lower()
        is_off_grid = 'off' in category_name or ('grid' not in category_name and 'sulama' in category_name)
        
        # Energy prices (UNCHANGED)
        diesel_price = company_settings.get('diesel_price_per_liter', 45.0) or 45.0
        diesel_per_kwh = company_settings.get('diesel_consumption_per_kwh', 0.35) or 0.35
        
        electricity_rates = company_settings.get('electricity_rates', [])
        electricity_price = 3.0
        subscription_type = quote_data.get('electricity_subscription_type', 'mesken')
        subscription_type_name = "Mesken"
        
        if electricity_rates:
            selected_rate = next(
                (r for r in electricity_rates if r.get('type_code') == subscription_type), 
                None
            )
            if selected_rate:
                electricity_price = selected_rate.get('price_per_kwh', 3.0)
                subscription_type_name = selected_rate.get('type_name', 'Mesken')
            else:
                mesken_rate = next((r for r in electricity_rates if r.get('type_code') == 'mesken'), None)
                if mesken_rate:
                    electricity_price = mesken_rate.get('price_per_kwh', 3.0)
                    subscription_type_name = mesken_rate.get('type_name', 'Mesken')
        
        # Financial calculations (UNCHANGED)
        if is_off_grid:
            generator_cost_per_kwh = diesel_per_kwh * diesel_price
            yearly_savings = yearly_production * generator_cost_per_kwh
            savings_label = "Jeneratör Tasarrufu"
        else:
            yearly_savings = yearly_production * electricity_price
            savings_label = "Elektrik Tasarrufu"
        
        # Environmental (UNCHANGED)
        if is_off_grid:
            co2_per_kwh = diesel_per_kwh * 2.7
        else:
            co2_per_kwh = 0.5
        yearly_co2_saved = yearly_production * co2_per_kwh
        trees_equivalent = yearly_co2_saved / 22
        
        # Amortization calculation
        total_price = quote_data.get('total_tl', 0) or quote_data.get('subtotal_tl', 0) or 0
        if yearly_savings > 0 and total_price > 0:
            amortization_years = total_price / yearly_savings
            amort_years = int(amortization_years)
            amort_months = int((amortization_years - amort_years) * 12)
        else:
            amort_years = 0
            amort_months = 0
        
        # Car km equivalent (average car emits 120g CO2/km)
        car_km_equivalent = (yearly_co2_saved * 1000) / 120  # kg to g, then divide by 120g/km
        
        # CREATE PAGE
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Draw template background
        draw_template_background(c)
        
        # Page title
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 20)
        c.drawCentredString(PAGE_WIDTH / 2, TEMPLATE_CONTENT_TOP - 10, "YATIRIMINIZIN GERİ DÖNÜŞÜ")
        c.setFont(FONT_NORMAL, 10)
        c.setFillColor(TEXT_LIGHT)
        c.drawCentredString(PAGE_WIDTH / 2, TEMPLATE_CONTENT_TOP - 25, "Güneş enerjisiyle tasarrufunuz başlıyor")
        
        y = TEMPLATE_CONTENT_TOP - 55
        
        # ===== SECTION 1: SYSTEM COMPONENTS =====
        # Centered title
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_BOLD, 13)
        c.drawCentredString(PAGE_WIDTH / 2, y, "KURULACAK SİSTEM ÖZELLİKLERİ")
        y -= 30
        
        card_width = (CONTENT_WIDTH - 40) / 3  # More spacing between cards
        card_height = 75
        
        # Component definitions with technical descriptions on top
        components = []
        if panel_kw > 0:
            components.append({
                'top_label': 'Saatlik Üretim Gücü',
                'title': 'GÜNEŞ PANELİ',
                'value': f'{panel_kw:.1f} kW',
                'color': '#f59e0b',
                'gradient_end': '#fbbf24'
            })
        if inverter_kw > 0:
            components.append({
                'top_label': 'Anlık Maximum Tüketim',
                'title': 'İNVERTER',
                'value': f'{inverter_kw:.1f} kW',
                'color': '#3b82f6',
                'gradient_end': '#60a5fa'
            })
        if battery_kwh > 0:
            components.append({
                'top_label': 'Enerji Depolama Kapasitesi',
                'title': 'BATARYA',
                'value': f'{battery_kwh:.1f} kWh',
                'color': '#10b981',
                'gradient_end': '#34d399'
            })
        
        # Fill with monitoring if less than 3 components
        while len(components) < 3:
            components.append({
                'top_label': 'Sistem İzleme',
                'title': 'AKTİF İZLEME',
                'value': '7/24',
                'color': '#8b5cf6',
                'gradient_end': '#a78bfa'
            })
        
        for i, comp in enumerate(components[:3]):
            x = MARGIN_LEFT + (i * (card_width + 20))  # More gap between cards
            
            # Top label (above card)
            c.setFillColor(TEXT_LIGHT)
            c.setFont(FONT_NORMAL, 8)
            c.drawCentredString(x + card_width/2, y + 5, comp['top_label'])
            
            # Card background
            c.setFillColor(colors.HexColor(comp['color']))
            c.roundRect(x, y - card_height, card_width, card_height, 10, fill=True)
            
            # Lighter accent bar at top
            c.setFillColor(colors.HexColor(comp['gradient_end']))
            c.roundRect(x, y - 6, card_width, 6, 10, fill=True)
            c.rect(x, y - 10, card_width, 6, fill=True, stroke=False)
            
            # Value (big, white, centered)
            c.setFillColor(colors.white)
            c.setFont(FONT_BOLD, 24)
            c.drawCentredString(x + card_width/2, y - 40, comp['value'])
            
            # Title (bottom of card)
            c.setFont(FONT_BOLD, 9)
            c.drawCentredString(x + card_width/2, y - 60, comp['title'])
        
        y -= card_height + 35  # More space after section
        
        # ===== SECTION 2: PRODUCTION ESTIMATES =====
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_BOLD, 12)
        c.drawCentredString(PAGE_WIDTH / 2, y, "TAHMİNİ ENERJİ ÜRETİMİ")
        y -= 12
        
        # Subtle info text
        c.setFillColor(TEXT_LIGHT)
        c.setFont(FONT_NORMAL, 7)
        c.drawCentredString(PAGE_WIDTH / 2, y, "Türkiye ortalaması günlük 5 saat verimli güneşlenme süresine göre hesaplanmıştır")
        y -= 25
        
        # Production cards (horizontal layout with gradient bars)
        prod_card_width = (CONTENT_WIDTH - 40) / 3  # More spacing
        prod_card_height = 50
        
        productions = [
            {
                'label': 'GÜNLÜK',
                'value': f'{daily_production:.1f}',
                'unit': 'kWh',
                'color': '#fef3c7',
                'accent': '#f59e0b',
                'note': '±%15 hava koşuluna göre değişir'
            },
            {
                'label': 'AYLIK',
                'value': f'{monthly_production:.0f}',
                'unit': 'kWh',
                'color': '#fed7aa',
                'accent': '#ea580c',
                'note': 'Yaz↑ Kış↓ yıllık dengede kazanç'
            },
            {
                'label': 'YILLIK',
                'value': f'{yearly_production:,.0f}'.replace(',', '.'),
                'unit': 'kWh',
                'color': '#dcfce7',
                'accent': '#16a34a',
                'note': '25 yıl garanti, %80 verim 25. yılda'
            }
        ]
        
        for i, prod in enumerate(productions):
            x = MARGIN_LEFT + (i * (prod_card_width + 20))  # More gap
            
            # Card background
            c.setFillColor(colors.HexColor(prod['color']))
            c.roundRect(x, y - prod_card_height, prod_card_width, prod_card_height, 8, fill=True)
            
            # Accent bar at left
            c.setFillColor(colors.HexColor(prod['accent']))
            c.roundRect(x, y - prod_card_height, 4, prod_card_height, 2, fill=True)
            
            # Label at top
            c.setFillColor(TEXT_COLOR)
            c.setFont(FONT_BOLD, 8)
            c.drawString(x + 12, y - 12, prod['label'])
            
            # Value (big)
            c.setFillColor(colors.HexColor(prod['accent']))
            c.setFont(FONT_BOLD, 16)
            c.drawString(x + 12, y - 30, prod['value'])
            
            # Unit
            c.setFont(FONT_NORMAL, 9)
            c.drawString(x + 12 + c.stringWidth(prod['value'], FONT_BOLD, 16) + 3, y - 30, prod['unit'])
            
            # Risk note at bottom
            c.setFillColor(TEXT_LIGHT)
            c.setFont(FONT_NORMAL, 5)
            c.drawString(x + 8, y - prod_card_height + 5, prod['note'])
        
        y -= prod_card_height + 30  # More space after section
        
        # ===== SECTION 3: SAVINGS & AMORTIZATION =====
        # Title centered
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_BOLD, 12)
        c.drawCentredString(PAGE_WIDTH / 2, y, "YILLIK TASARRUF VE GERİ DÖNÜŞ")
        y -= 25
        
        # Two boxes side by side with more gap
        left_width = CONTENT_WIDTH * 0.48
        right_width = CONTENT_WIDTH * 0.48
        box_height = 65
        gap = CONTENT_WIDTH * 0.04
        
        # LEFT: Savings box
        c.setFillColor(colors.HexColor('#ecfdf5'))
        c.roundRect(MARGIN_LEFT, y - box_height, left_width, box_height, 10, fill=True)
        
        # Border
        c.setStrokeColor(SUCCESS_COLOR)
        c.setLineWidth(2)
        c.roundRect(MARGIN_LEFT, y - box_height, left_width, box_height, 10, fill=False, stroke=True)
        
        # Label at top
        c.setFillColor(colors.HexColor('#065f46'))
        c.setFont(FONT_NORMAL, 8)
        c.drawCentredString(MARGIN_LEFT + left_width/2, y - 12, f"Yıllık {savings_label}")
        
        # Savings value (big)
        c.setFillColor(SUCCESS_COLOR)
        c.setFont(FONT_BOLD, 28)
        savings_text = f"₺{yearly_savings:,.0f}".replace(',', '.')
        c.drawCentredString(MARGIN_LEFT + left_width/2, y - 42, savings_text)
        
        # RIGHT: Amortization box
        right_x = MARGIN_LEFT + left_width + gap
        
        c.setFillColor(colors.HexColor('#fef3c7'))
        c.roundRect(right_x, y - box_height, right_width, box_height, 10, fill=True)
        
        # Border
        c.setStrokeColor(PRIMARY_COLOR)
        c.setLineWidth(2)
        c.roundRect(right_x, y - box_height, right_width, box_height, 10, fill=False, stroke=True)
        
        # Label at top
        c.setFillColor(colors.HexColor('#92400e'))
        c.setFont(FONT_NORMAL, 8)
        c.drawCentredString(right_x + right_width/2, y - 12, "Yatırım Geri Dönüş Süresi")
        
        # Amortization value
        c.setFillColor(PRIMARY_DARK)
        c.setFont(FONT_BOLD, 24)
        if amort_years > 0:
            amort_text = f"{amort_years} Yıl {amort_months} Ay"
        else:
            amort_text = "Hesaplanıyor"
        c.drawCentredString(right_x + right_width/2, y - 40, amort_text)
        
        # Remaining profit note
        if amort_years > 0:
            remaining_years = 25 - amort_years
            c.setFont(FONT_NORMAL, 7)
            c.setFillColor(colors.HexColor('#b45309'))
            c.drawCentredString(right_x + right_width/2, y - box_height + 8, f"Kalan {remaining_years}+ yıl tamamen kâr!")
        
        y -= box_height + 25
        
        # Multi-year projections bar
        c.setFillColor(colors.HexColor('#f1f5f9'))
        c.roundRect(MARGIN_LEFT, y - 22, CONTENT_WIDTH, 22, 5, fill=True)
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 8)
        proj_y = y - 15
        
        # 5-year
        c.drawString(MARGIN_LEFT + 15, proj_y, "5 Yıl:")
        c.setFillColor(SUCCESS_COLOR)
        c.setFont(FONT_BOLD, 8)
        c.drawString(MARGIN_LEFT + 45, proj_y, f"₺{yearly_savings * 5:,.0f}".replace(',', '.'))
        
        # 10-year
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 8)
        c.drawString(MARGIN_LEFT + 140, proj_y, "10 Yıl:")
        c.setFillColor(SUCCESS_COLOR)
        c.setFont(FONT_BOLD, 8)
        c.drawString(MARGIN_LEFT + 175, proj_y, f"₺{yearly_savings * 10:,.0f}".replace(',', '.'))
        
        # 25-year
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 8)
        c.drawString(MARGIN_LEFT + 280, proj_y, "25 Yıl:")
        c.setFillColor(SUCCESS_COLOR)
        c.setFont(FONT_BOLD, 9)
        c.drawString(MARGIN_LEFT + 315, proj_y, f"₺{yearly_savings * 25:,.0f}".replace(',', '.'))
        
        y -= 35
        
        # ===== SECTION 4: ENVIRONMENTAL IMPACT =====
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_BOLD, 12)
        c.drawCentredString(PAGE_WIDTH / 2, y, "ÇEVRESEL KATKI")
        y -= 12
        
        c.setFillColor(TEXT_LIGHT)
        c.setFont(FONT_NORMAL, 7)
        c.drawCentredString(PAGE_WIDTH / 2, y, "Gelecek nesillere bırakacağınız en güzel miras: temiz bir dünya")
        y -= 22
        
        # Environmental cards (4 cards with more spacing)
        env_card_width = (CONTENT_WIDTH - 45) / 4
        env_card_height = 55
        
        env_impacts = [
            {
                'value': f'{yearly_co2_saved:.0f}',
                'unit': 'kg CO₂',
                'label': 'Yıllık Azaltım',
                'color': '#dcfce7',
                'accent': '#16a34a'
            },
            {
                'value': f'{trees_equivalent:.0f}',
                'unit': 'ağaç',
                'label': 'Ağaç Eşdeğeri',
                'color': '#d1fae5',
                'accent': '#059669'
            },
            {
                'value': f'{car_km_equivalent/1000:.0f}K',
                'unit': 'km',
                'label': 'Araç Dengeleme',
                'color': '#cffafe',
                'accent': '#0891b2'
            },
            {
                'value': f'{yearly_co2_saved * 25 / 1000:.0f}',
                'unit': 'ton',
                'label': '25 Yıl Toplam',
                'color': '#e0e7ff',
                'accent': '#4f46e5'
            }
        ]
        
        for i, env in enumerate(env_impacts):
            x = MARGIN_LEFT + (i * (env_card_width + 15))
            
            # Card background
            c.setFillColor(colors.HexColor(env['color']))
            c.roundRect(x, y - env_card_height, env_card_width, env_card_height, 6, fill=True)
            
            # Value at center
            c.setFillColor(colors.HexColor(env['accent']))
            c.setFont(FONT_BOLD, 14)
            c.drawCentredString(x + env_card_width/2, y - 18, env['value'])
            
            # Unit
            c.setFont(FONT_NORMAL, 7)
            c.drawCentredString(x + env_card_width/2, y - 30, env['unit'])
            
            # Label at bottom
            c.setFillColor(TEXT_COLOR)
            c.setFont(FONT_NORMAL, 6)
            c.drawCentredString(x + env_card_width/2, y - env_card_height + 8, env['label'])
        
        y -= env_card_height + 20
        
        # ===== BOTTOM BANNER =====
        banner_height = 30
        c.setFillColor(SECONDARY_COLOR)
        c.roundRect(MARGIN_LEFT, y - banner_height, CONTENT_WIDTH, banner_height, 6, fill=True)
        
        c.setFillColor(colors.white)
        c.setFont(FONT_BOLD, 10)
        c.drawCentredString(PAGE_WIDTH / 2, y - 12, "Elektrik Zamlarından Etkilenmeyin - Kendi Enerjinizi Üretin!")
        
        c.setFont(FONT_NORMAL, 7)
        c.setFillColor(colors.HexColor('#94a3b8'))
        c.drawCentredString(PAGE_WIDTH / 2, y - 24, "Panel garantisi 25 yıl  •  İnverter garantisi 10 yıl  •  Profesyonel montaj")
        
        # Footer
        self._draw_page_footer(c, 3)
        
        c.save()
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 4: PRODUCTS SHOWCASE ====================
    def _create_products_showcase_page(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """Create products showcase with single column layout - NO PRICES"""
        
        items = quote_data.get('items', [])
        if not items:
            return None
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=PAGE_HEIGHT - TEMPLATE_CONTENT_TOP + 10,  # Adjusted for template
            bottomMargin=TEMPLATE_CONTENT_BOTTOM + 10,
            leftMargin=MARGIN_LEFT + 5,
            rightMargin=MARGIN_RIGHT + 5
        )
        
        elements = []
        
        # Page title
        elements.append(Paragraph("KULLANILAN ÜRÜNLER", self.styles['PageTitle']))
        elements.append(Spacer(1, 15))
        
        # Single column product cards - full width
        card_width = CONTENT_WIDTH - 10
        card_height = 100  # Adjusted height
        
        for item in items:
            card = self._create_product_card(item, card_width, card_height)
            elements.append(card)
            elements.append(Spacer(1, 8))
        
        # Note at bottom
        elements.append(Spacer(1, 10))
        note_text = "<i>* Ürün görselleri temsilidir. Detaylı teknik bilgiler için datasheet'leri inceleyiniz.</i>"
        elements.append(Paragraph(note_text, ParagraphStyle(
            'NoteStyle', parent=self.styles['BodyTextSmall'], 
            textColor=TEXT_LIGHT, alignment=TA_CENTER, fontSize=8
        )))
        
        doc.build(elements, onFirstPage=self._add_products_header, onLaterPages=self._add_products_header)
        buffer.seek(0)
        return buffer
    
    def _add_products_header(self, canvas, doc):
        """Add template background to products page"""
        canvas.saveState()
        
        # Draw template background
        draw_template_background(canvas)
        
        # Page number (optional, template already has footer)
        canvas.setFillColor(TEXT_LIGHT)
        canvas.setFont(FONT_NORMAL, 8)
        canvas.drawRightString(PAGE_WIDTH - MARGIN_RIGHT, TEMPLATE_CONTENT_BOTTOM - 10, f"Sayfa {doc.page}")
        
        canvas.restoreState()
    
    def _create_product_card(self, item: dict, width: float, height: float) -> Table:
        """Create a single product card - full width row with image left, text right"""
        
        product_name = item.get('product_name', '-')
        short_description = item.get('short_description', '')  # PDF için kısa açıklama
        benefits = item.get('benefits', [])  # PDF için 3 fayda maddesi
        quantity = item.get('quantity', 1)
        unit = item.get('unit', 'Adet')
        image_url = item.get('image_url')  # First image
        power_watt = item.get('power_watt')
        category_name = item.get('category_name', '')
        
        # Truncate long names (2 lines max)
        if len(product_name) > 70:
            product_name = product_name[:67] + "..."
        
        # Truncate short description
        if short_description and len(short_description) > 100:
            short_description = short_description[:97] + "..."
        
        # Image settings - fit within card height (card is 115px, leave room for padding)
        img_width = 32 * mm   # ~90px
        img_height = 32 * mm  # ~90px - square format fits better
        text_width = width - img_width - 25  # Remaining space for text
        
        # Try to load image with proper aspect ratio (NO OVERFLOW)
        product_image = None
        if image_url:
            img_path = self.upload_dir / image_url.replace('/uploads/', '').replace('uploads/', '')
            if img_path.exists():
                try:
                    # Use preserveAspectRatio to prevent overflow
                    product_image = Image(
                        str(img_path), 
                        width=img_width, 
                        height=img_height,
                        kind='proportional'  # Maintain aspect ratio, fit within bounds
                    )
                    product_image.hAlign = 'CENTER'
                except Exception as e:
                    logger.warning(f"Could not load product image: {e}")
        
        # If no image, create placeholder
        if not product_image:
            placeholder_data = [
                [Paragraph("📦", ParagraphStyle('PlaceholderIcon', fontSize=24, alignment=TA_CENTER, textColor=TEXT_LIGHT))],
                [Paragraph("Görsel Yok", ParagraphStyle('PlaceholderText', fontSize=7, alignment=TA_CENTER, textColor=TEXT_LIGHT))]
            ]
            placeholder = Table(placeholder_data, colWidths=[img_width], rowHeights=[img_height * 0.7, img_height * 0.3])
            placeholder.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
                ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ]))
            product_image = placeholder
        
        # Wrap image in a fixed-size container to STRICTLY prevent overflow
        img_container = [[product_image]]
        img_table = Table(img_container, colWidths=[img_width], rowHeights=[img_height])
        img_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
        ]))
        
        # Build text content
        text_elements = []
        
        # Row 1: Product name (bold, max 2 lines)
        name_style = ParagraphStyle(
            'CardNameFull', parent=self.styles['CardTitle'],
            fontSize=11, leading=14, textColor=TEXT_COLOR
        )
        text_elements.append([Paragraph(f"<b>{product_name}</b>", name_style)])
        
        # Row 2: Short description (from product card input)
        if short_description:
            desc_style = ParagraphStyle(
                'CardShortDesc', parent=self.styles['CardDescription'],
                fontSize=9, leading=12, textColor=TEXT_LIGHT, fontName=FONT_NORMAL
            )
            text_elements.append([Paragraph(short_description, desc_style)])
        
        # Row 3: Quantity + Category
        qty_cat_text = f"<b>Miktar:</b> {quantity} {unit}"
        if category_name:
            cat_short = category_name if len(category_name) <= 25 else category_name[:22] + "..."
            qty_cat_text += f"  •  {cat_short}"
        qty_style = ParagraphStyle(
            'CardQtyFull', parent=self.styles['CardDescription'],
            fontSize=8, textColor=TEXT_COLOR
        )
        text_elements.append([Paragraph(qty_cat_text, qty_style)])
        
        # Row 4: 3 Benefit features with icons (from product card input or defaults)
        feature_items = []
        
        # Use custom benefits if available, otherwise use defaults
        if benefits and any(benefits):
            for i, benefit in enumerate(benefits[:3]):
                if benefit and benefit.strip():
                    icon_colors = ['#f59e0b', '#10b981', '#3b82f6']
                    icons = ['⚡', '✓', '🛡']
                    feature_items.append(f"<font color='{icon_colors[i]}'>{icons[i]}</font> {benefit}")
        else:
            # Default features
            if power_watt:
                if power_watt >= 1000:
                    power_display = f"{power_watt/1000:.1f} kW"
                else:
                    power_display = f"{power_watt:.0f}W"
                feature_items.append(f"<font color='#f59e0b'>⚡</font> Güç: {power_display}")
            feature_items.append(f"<font color='#10b981'>✓</font> A Sınıfı Ürün")
            feature_items.append(f"<font color='#3b82f6'>🛡</font> Üretici Garantili")
        
        if feature_items:
            feature_style = ParagraphStyle(
                'CardFeatureFull', parent=self.styles['CardFeature'],
                fontSize=8, leading=11, textColor=TEXT_COLOR
            )
            feature_text = "    ".join(feature_items[:3])
            text_elements.append([Paragraph(feature_text, feature_style)])
        
        # Create text column table
        text_table = Table(text_elements, colWidths=[text_width])
        text_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, 0), 0),
            ('TOPPADDING', (0, 1), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        
        # Combine image and text horizontally
        card_content = [[img_table, text_table]]
        inner_table = Table(card_content, colWidths=[img_width + 10, text_width])
        inner_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('LEFTPADDING', (0, 0), (0, 0), 0),
            ('RIGHTPADDING', (0, 0), (0, 0), 10),
            ('LEFTPADDING', (1, 0), (1, 0), 5),
        ]))
        
        # Wrap in card container with fixed height
        card_container = [[inner_table]]
        card = Table(card_container, colWidths=[width], rowHeights=[height])
        card.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), HEADER_BG),
            ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        return card
    
    def _add_price_page_background(self, canvas, doc):
        """Add template background to price page"""
        canvas.saveState()
        draw_template_background(canvas)
        canvas.restoreState()
    
    # ==================== PAGE 5: PRICE QUOTE ====================
    def _create_price_page(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """Create price quote page - UNCHANGED PRICING LOGIC"""
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=PAGE_HEIGHT - TEMPLATE_CONTENT_TOP + 5,
            bottomMargin=TEMPLATE_CONTENT_BOTTOM + 5,
            leftMargin=MARGIN_LEFT + 5,
            rightMargin=MARGIN_RIGHT + 5
        )
        
        elements = []
        
        # Header with company | customer
        header_table = self._create_header(quote_data, company_settings)
        elements.append(header_table)
        elements.append(Spacer(1, 10))
        
        # Quote info bar
        info_bar = self._create_info_bar(quote_data)
        elements.append(info_bar)
        elements.append(Spacer(1, 10))
        
        # Title
        category_name = quote_data.get('customer_category_name', '')
        title_text = f"{category_name} Fiyat Teklifi" if category_name else "Fiyat Teklifi"
        elements.append(Paragraph(f"<b>{title_text}</b>", self.styles['QuoteTitle']))
        elements.append(Spacer(1, 8))
        
        # Check for segment options (Off-Grid 3-segment)
        include_segment_options = quote_data.get('include_segment_options', False)
        segment_items = quote_data.get('segment_items')
        
        if include_segment_options and segment_items:
            segments = [
                ('ekonomik', 'EKONOMİK PAKET', colors.HexColor('#10b981')),
                ('standart', 'STANDART PAKET', colors.HexColor('#f59e0b')),
                ('premium', 'PREMİUM PAKET', colors.HexColor('#3b82f6'))
            ]
            
            for segment_key, segment_title, segment_color in segments:
                segment_data = segment_items.get(segment_key, {})
                items = segment_data.get('items', [])
                subtotal = segment_data.get('subtotal_tl', 0)
                
                if not items:
                    continue
                
                elements.append(Paragraph(f"<b>{segment_title}</b>", ParagraphStyle(
                    'SegmentTitle', parent=self.styles['QuoteTitle'],
                    fontSize=11, textColor=segment_color, spaceAfter=5
                )))
                
                products_table = self._create_products_table(items)
                elements.append(products_table)
                
                segment_total_data = [[
                    '', '', '',
                    Paragraph("<b>Paket Toplamı:</b>", self.styles['TableCellRight']),
                    Paragraph(f"<b>{format_currency(subtotal)}</b>", self.styles['TableCellRight'])
                ]]
                segment_total_table = Table(segment_total_data, colWidths=[COL_MIKTAR, COL_BIRIM, COL_URUN, COL_BIRIM_FIYAT, COL_TOPLAM_FIYAT])
                segment_total_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), segment_color),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('BOX', (0, 0), (-1, -1), 1, segment_color),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('ALIGN', (-2, 0), (-1, 0), 'RIGHT'),
                ]))
                elements.append(segment_total_table)
                elements.append(Spacer(1, 15))
        else:
            # Standard single products table
            products_table = self._create_products_table(quote_data.get('items', []))
            elements.append(products_table)
            
            # Shipping
            shipping = quote_data.get('shipping_cost', 0)
            if shipping > 0:
                elements.append(Spacer(1, 3))
                shipping_table = self._create_shipping_row(shipping)
                elements.append(shipping_table)
            
            elements.append(Spacer(1, 10))
            
            # Totals
            totals_table = self._create_totals_table(quote_data)
            elements.append(totals_table)
        
        # Bank accounts
        bank_accounts = company_settings.get('bank_accounts', [])
        if bank_accounts and len(bank_accounts) > 0:
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("<b>BANKA HESAP BİLGİLERİ</b>", self.styles['SectionTitle']))
            elements.append(Spacer(1, 5))
            bank_table = self._create_bank_accounts_table(bank_accounts)
            elements.append(bank_table)
        
        doc.build(elements, onFirstPage=self._add_price_page_background, onLaterPages=self._add_price_page_background)
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 6: TERMS ====================
    def _create_terms_page(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """Create short terms page"""
        
        quote_terms = company_settings.get('quote_terms', '')
        warranty_text = company_settings.get('warranty_text', '')
        
        if not quote_terms and not warranty_text:
            return None
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Draw template background
        draw_template_background(c)
        
        # Page title
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 20)
        c.drawCentredString(PAGE_WIDTH / 2, TEMPLATE_CONTENT_TOP - 10, "TEKLİF ŞARTLARI")
        
        y = TEMPLATE_CONTENT_TOP - 55
        
        # Quote validity
        validity_days = quote_data.get('validity_days', 15)
        quote_date = self._format_date(quote_data.get('created_at', ''))
        
        # Key terms in boxes
        terms_items = [
            ('📅', 'Teklif Geçerliliği', f'{validity_days} gün ({quote_date} tarihinden itibaren)'),
            ('🚚', 'Teslim Süresi', 'Sipariş onayından itibaren 7-14 iş günü'),
            ('🛡', 'Garanti Süresi', warranty_text if warranty_text else 'Üretici garantisi geçerlidir'),
            ('⚡', 'Performans', 'Sistemler uluslararası standartlara uygun kurulur'),
        ]
        
        for icon, title, desc in terms_items:
            # Box with semi-transparent background
            c.setFillColor(colors.HexColor('#f8fafc'))
            c.roundRect(MARGIN_LEFT + 10, y - 45, CONTENT_WIDTH - 20, 45, 6, fill=True)
            
            # Icon circle
            c.setFillColor(PRIMARY_COLOR)
            c.circle(MARGIN_LEFT + 35, y - 22, 12, fill=True)
            c.setFillColor(colors.white)
            c.setFont(FONT_BOLD, 10)
            c.drawCentredString(MARGIN_LEFT + 35, y - 26, icon)
            
            # Title
            c.setFillColor(TEXT_COLOR)
            c.setFont(FONT_BOLD, 10)
            c.drawString(MARGIN_LEFT + 55, y - 18, title)
            
            # Description
            c.setFont(FONT_NORMAL, 9)
            c.setFillColor(TEXT_LIGHT)
            # Truncate if too long
            if len(desc) > 70:
                desc = desc[:67] + "..."
            c.drawString(MARGIN_LEFT + 55, y - 32, desc)
            
            y -= 55
        
        # Additional terms text (if any)
        if quote_terms and y > TEMPLATE_CONTENT_BOTTOM + 100:
            y -= 15
            c.setFillColor(TEXT_COLOR)
            c.setFont(FONT_BOLD, 10)
            c.drawString(MARGIN_LEFT + 10, y, "Ek Koşullar:")
            
            y -= 18
            c.setFont(FONT_NORMAL, 9)
            
            for line in quote_terms.split('\n')[:8]:  # Max 8 lines
                if line.strip() and y > TEMPLATE_CONTENT_BOTTOM + 20:
                    # Truncate long lines
                    if len(line) > 85:
                        line = line[:82] + "..."
                    c.drawString(MARGIN_LEFT + 15, y, line)
                    y -= 13
        
        c.save()
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 7+: CONTRACT ====================
    def _create_contract_page(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """Create contract page"""
        
        contract_terms = company_settings.get('contract_terms', '')
        if not contract_terms or not contract_terms.strip():
            return None
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=PAGE_HEIGHT - TEMPLATE_CONTENT_TOP + 5,
            bottomMargin=TEMPLATE_CONTENT_BOTTOM + 5,
            leftMargin=MARGIN_LEFT + 5,
            rightMargin=MARGIN_RIGHT + 5
        )
        
        elements = []
        
        # Logo
        logo_path = company_settings.get('logo')
        if logo_path:
            full_logo_path = self.upload_dir / logo_path.replace('/uploads/', '').replace('uploads/', '')
            if full_logo_path.exists():
                try:
                    img = Image(str(full_logo_path), width=40, height=30)
                    img.hAlign = 'LEFT'
                    elements.append(img)
                    elements.append(Spacer(1, 10))
                except:
                    pass
        
        elements.append(Paragraph("SÖZLEŞME KOŞULLARI", self.styles['ContractTitle']))
        elements.append(Spacer(1, 10))
        
        for line in contract_terms.split('\n'):
            if line.strip():
                elements.append(Paragraph(line, self.styles['ContractText']))
            else:
                elements.append(Spacer(1, 6))
        
        # Quote reference
        elements.append(Spacer(1, 30))
        quote_number = quote_data.get('quote_number', '')
        quote_date = self._format_date(quote_data.get('created_at', ''))
        ref_text = f"<b>Teklif No:</b> {quote_number} &nbsp;&nbsp;&nbsp; <b>Tarih:</b> {quote_date}"
        elements.append(Paragraph(ref_text, self.styles['Notes']))
        
        doc.build(elements, onFirstPage=self._add_price_page_background, onLaterPages=self._add_price_page_background)
        buffer.seek(0)
        return buffer
    
    # ==================== HELPER METHODS ====================
    
    def _format_date(self, date_value) -> str:
        """Format date to Turkish format"""
        if not date_value:
            return datetime.now().strftime('%d.%m.%Y')
        
        try:
            if isinstance(date_value, str):
                dt = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            else:
                dt = date_value
            return dt.strftime('%d.%m.%Y')
        except:
            return str(date_value)[:10]
    
    def _draw_page_footer(self, canvas, page_num: int):
        """Draw page footer"""
        canvas.saveState()
        
        # Footer line
        canvas.setStrokeColor(BORDER_COLOR)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN_LEFT, MARGIN_BOTTOM, PAGE_WIDTH - MARGIN_RIGHT, MARGIN_BOTTOM)
        
        # Page number
        canvas.setFillColor(TEXT_LIGHT)
        canvas.setFont(FONT_NORMAL, 8)
        canvas.drawCentredString(PAGE_WIDTH / 2, MARGIN_BOTTOM - 15, f"Sayfa {page_num}")
        
        canvas.restoreState()
    
    def _create_header(self, quote_data: dict, company_settings: dict):
        """Create header with company | customer"""
        
        company_name = company_settings.get('company_name', 'Solar Enerji')
        company_phone = company_settings.get('phone', '')
        company_email = company_settings.get('email', '')
        company_address = company_settings.get('address', '')
        
        company_lines = [Paragraph(f"<b>{company_name}</b>", self.styles['CompanyName'])]
        if company_address:
            company_lines.append(Paragraph(company_address, self.styles['CompanyInfo']))
        contact_parts = []
        if company_phone:
            contact_parts.append(f"Tel: {company_phone}")
        if company_email:
            contact_parts.append(company_email)
        if contact_parts:
            company_lines.append(Paragraph(' • '.join(contact_parts), self.styles['CompanyInfo']))
        
        customer_name = quote_data.get('customer_name', '-')
        customer_phone = quote_data.get('customer_phone', '')
        customer_city = quote_data.get('customer_city', '')
        customer_district = quote_data.get('customer_district', '')
        
        customer_lines = [Paragraph(f"<b>{customer_name}</b>", self.styles['CustomerName'])]
        
        location_parts = []
        if customer_district:
            location_parts.append(customer_district)
        if customer_city:
            location_parts.append(customer_city)
        if location_parts:
            customer_lines.append(Paragraph(' / '.join(location_parts), self.styles['CustomerInfo']))
        
        if customer_phone:
            customer_lines.append(Paragraph(f"Tel: {customer_phone}", self.styles['CustomerInfo']))
        
        header_data = [[company_lines, '', customer_lines]]
        
        col_company = CONTENT_WIDTH * 0.45
        col_divider = CONTENT_WIDTH * 0.04
        col_customer = CONTENT_WIDTH * 0.51
        
        header_table = Table(header_data, colWidths=[col_company, col_divider, col_customer])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('LEFTPADDING', (0, 0), (0, 0), 0),
            ('RIGHTPADDING', (2, 0), (2, 0), 0),
            ('LINEAFTER', (0, 0), (0, 0), 1.5, PRIMARY_COLOR),
            ('LEFTPADDING', (2, 0), (2, 0), 10),
        ]))
        
        return header_table
    
    def _create_info_bar(self, quote_data: dict):
        """Create quote information bar"""
        
        quote_number = quote_data.get('quote_number', '-')
        quote_date = self._format_date(quote_data.get('created_at', ''))
        validity = quote_data.get('validity_days', 15)
        
        info_data = [[
            Paragraph(f"<b>Teklif No:</b> {quote_number}", self.styles['TableCell']),
            Paragraph(f"<b>Tarih:</b> {quote_date}", self.styles['TableCell']),
            Paragraph(f"<b>Geçerlilik:</b> {validity} Gün", self.styles['TableCell']),
        ]]
        
        info_table = Table(info_data, colWidths=[CONTENT_WIDTH/3] * 3)
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), HEADER_BG),
            ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        return info_table
    
    def _create_products_table(self, items: list):
        """Create products table - UNCHANGED LOGIC"""
        
        header = [
            Paragraph("<b>Miktar</b>", self.styles['TableHeader']),
            Paragraph("<b>Birim</b>", self.styles['TableHeader']),
            Paragraph("<b>Ürün Açıklaması</b>", self.styles['TableHeader']),
            Paragraph("<b>Birim Fiyat</b>", self.styles['TableHeader']),
            Paragraph("<b>Toplam Fiyat</b>", self.styles['TableHeader']),
        ]
        
        table_data = [header]
        
        for item in items:
            product_name = item.get('product_name', '-')
            quantity = item.get('quantity', 0)
            unit = item.get('unit', 'Adet')
            unit_price = item.get('unit_price_tl', 0)
            total_price = item.get('total_price_tl', 0)
            
            row = [
                Paragraph(str(quantity), self.styles['TableCellCenter']),
                Paragraph(unit, self.styles['TableCellCenter']),
                Paragraph(product_name, self.styles['TableCell']),
                Paragraph(format_currency(unit_price), self.styles['TableCellRight']),
                Paragraph(format_currency(total_price), self.styles['TableCellRight']),
            ]
            table_data.append(row)
        
        table = Table(table_data, colWidths=[COL_MIKTAR, COL_BIRIM, COL_URUN, COL_BIRIM_FIYAT, COL_TOPLAM_FIYAT])
        
        style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTNAME', (0, 1), (-1, -1), FONT_NORMAL),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HEADER_BG]),
            ('ALIGN', (0, 0), (1, -1), 'CENTER'),
            ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),
        ])
        
        table.setStyle(style)
        return table
    
    def _create_shipping_row(self, shipping_cost: float):
        """Create shipping row"""
        data = [[
            '',
            '',
            Paragraph("<b>Kurulum ve Nakliye Bedeli</b>", self.styles['TableCell']),
            '',
            Paragraph(f"<b>{format_currency(shipping_cost)}</b>", self.styles['TableCellRight']),
        ]]
        
        table = Table(data, colWidths=[COL_MIKTAR, COL_BIRIM, COL_URUN, COL_BIRIM_FIYAT, COL_TOPLAM_FIYAT])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
            ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('ALIGN', (-1, 0), (-1, 0), 'RIGHT'),
        ]))
        return table
    
    def _create_totals_table(self, quote_data: dict):
        """Create totals - UNCHANGED LOGIC"""
        
        subtotal = quote_data.get('subtotal_tl', 0)
        discount = quote_data.get('discount_amount_tl', 0)
        discount_rate = quote_data.get('discount_rate', 0)
        vat = quote_data.get('vat_amount_tl', 0)
        total = quote_data.get('total_tl', 0)
        vat_rate = quote_data.get('vat_rate', 20)
        
        rows = []
        rows.append(["Ara Toplam:", format_currency(subtotal)])
        
        if discount > 0:
            discount_label = f"İndirim (%{int(discount_rate)}):" if discount_rate > 0 else "İndirim:"
            rows.append([discount_label, f"-{format_currency(discount)}"])
        
        rows.append([f"KDV (%{int(vat_rate)}):", format_currency(vat)])
        rows.append(["GENEL TOPLAM:", format_currency(total)])
        
        inner_table = Table(rows, colWidths=[100, 120])
        inner_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -2), FONT_NORMAL),
            ('FONTNAME', (0, -1), (-1, -1), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, -2), 8),
            ('FONTSIZE', (0, -1), (-1, -1), 9),
            ('TEXTCOLOR', (0, -1), (-1, -1), PRIMARY_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LINEABOVE', (0, -1), (-1, -1), 1.5, PRIMARY_COLOR),
            ('TOPPADDING', (0, -1), (-1, -1), 6),
        ]))
        
        wrapper_data = [['', inner_table]]
        wrapper = Table(wrapper_data, colWidths=[CONTENT_WIDTH - 240, 240])
        wrapper.setStyle(TableStyle([
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        return wrapper
    
    def _create_bank_accounts_table(self, bank_accounts: list):
        """Create bank accounts table"""
        
        header = [
            Paragraph("<b>Banka</b>", self.styles['TableHeader']),
            Paragraph("<b>Şube</b>", self.styles['TableHeader']),
            Paragraph("<b>Hesap Sahibi</b>", self.styles['TableHeader']),
            Paragraph("<b>IBAN</b>", self.styles['TableHeader']),
        ]
        
        table_data = [header]
        
        for account in bank_accounts:
            row = [
                Paragraph(account.get('bank_name', '-'), self.styles['TableCell']),
                Paragraph(account.get('bank_branch', '-'), self.styles['TableCell']),
                Paragraph(account.get('account_holder', '-'), self.styles['TableCell']),
                Paragraph(account.get('iban', '-'), self.styles['TableCell']),
            ]
            table_data.append(row)
        
        col_widths = [0.20 * CONTENT_WIDTH, 0.15 * CONTENT_WIDTH, 0.25 * CONTENT_WIDTH, 0.40 * CONTENT_WIDTH]
        
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTNAME', (0, 1), (-1, -1), FONT_NORMAL),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HEADER_BG]),
        ]))
        
        return table
    
    def _collect_datasheets(self, items: list) -> list:
        """Collect datasheet PDFs"""
        
        datasheets = []
        
        for item in items:
            datasheet_url = item.get('datasheet_url')
            if not datasheet_url:
                continue
            
            filename = datasheet_url.replace('/uploads/', '').replace('uploads/', '')
            full_path = self.upload_dir / filename
            
            if full_path.exists() and str(full_path).lower().endswith('.pdf'):
                try:
                    with open(full_path, 'rb') as f:
                        datasheets.append(BytesIO(f.read()))
                    logger.info(f"Added datasheet: {filename}")
                except Exception as e:
                    logger.warning(f"Could not load datasheet {filename}: {e}")
        
        return datasheets
    
    def _merge_pdfs(self, pdf_buffers: list) -> BytesIO:
        """Merge multiple PDF buffers"""
        
        if not pdf_buffers:
            return BytesIO()
        
        writer = PdfWriter()
        
        for buffer in pdf_buffers:
            if buffer is None:
                continue
            
            try:
                buffer.seek(0)
                reader = PdfReader(buffer)
                for page in reader.pages:
                    writer.add_page(page)
            except Exception as e:
                logger.warning(f"Could not merge PDF: {e}")
        
        output = BytesIO()
        writer.write(output)
        output.seek(0)
        return output


def generate_quote_pdf(quote_data: dict, company_settings: dict, upload_dir: str, quote_templates: list = None) -> BytesIO:
    """Main function to generate a quote PDF"""
    generator = PremiumQuotePDFGenerator(upload_dir)
    return generator.generate(quote_data, company_settings, quote_templates)
