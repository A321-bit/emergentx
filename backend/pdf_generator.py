"""
Solar Energy Sales System - PREMIUM PDF Quote Generator
World-class professional quote document with stunning visual design
Turkish character support with DejaVu Sans font

NEW 9-PAGE STRUCTURE:
- Page 1: KAPAK (Cover) - Full visual impact
- Page 2: NEDEN BİZ (Why Us) - Company value proposition
- Page 3: PROJE VERİLERİ (Project Data) - Technical project specifications
- Page 4: SİSTEM ANALİZ (System Analysis) - Benefits & production calculations
- Page 5: ÜRÜN LİSTESİ + FİYATLAR (Products + Pricing) - Full pricing table
- Page 6: TEKLİF ŞARTLARI (Terms) - Short conditions
- Page 7: BANKA + TAKSİT (Bank Info) - Payment options
- Page 8: DATASHEET'LER (Datasheets) - Product datasheets
- Page 9: KAPANIŞ KAPAK (Closing Cover) - Final page
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

# PDF Template Background Image (New design with Aktürk Enerji branding)
PDF_TEMPLATE_BG = Path(__file__).parent / 'uploads' / 'pdf_background_template.png'

# Adjusted margins for template (to avoid logo/contact areas)
TEMPLATE_CONTENT_TOP = PAGE_HEIGHT - 30 * mm  # Daha yukarıdan başla (was 45mm)
TEMPLATE_CONTENT_BOTTOM = 45 * mm  # Alt logo alanı için (was 55mm)

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
        """
        Generate PDF based on category type:
        
        FULL FORMAT (On-Grid, Off-Grid, Hibrit, Sulama):
        1. Kapak (Cover) - Kategoriye göre şablon
        2. Neden Biz (Why Us)
        3. Proje Verileri (Project Data)
        4. Sistem Analiz (System Analysis)
        5. Ürün Listesi + Fiyatlar
        6. Teklif Şartları
        7. Banka + Taksit
        8. Datasheet'ler
        9. Kapanış Kapak
        
        SIMPLE FORMAT (Perakende, Toptan):
        1. Kapak (Varsayılan kapak)
        2. Neden Biz
        3. Ürün Listesi + Fiyatlar
        4. Teklif Şartları
        5. Ödeme Seçenekleri
        6. Datasheet'ler
        7. Kapanış Kapak
        """
        category_name = quote_data.get('customer_category_name', '')
        
        # Check if simple sale category (Perakende/Toptan)
        if self._is_simple_sale_category(category_name):
            return self._generate_simple_pdf(quote_data, company_settings, quote_templates)
        else:
            return self._generate_full_pdf(quote_data, company_settings, quote_templates)
    
    def _generate_full_pdf(self, quote_data: dict, company_settings: dict, quote_templates: list = None) -> BytesIO:
        """Generate full PDF for On-Grid, Off-Grid, Hibrit, Sulama categories"""
        pdf_parts = []
        
        # Get category for template selection
        category_id = self._get_category_id(quote_data.get('customer_category_name', ''))
        template_cover = self._get_template_cover(category_id, quote_templates)
        
        # PAGE 1: Kapak (Cover Page)
        cover_pdf = self._create_cover_page(quote_data, company_settings, template_cover)
        if cover_pdf:
            pdf_parts.append(cover_pdf)
        
        # PAGE 2: Neden Biz (Why Us / Value Proposition)
        value_pdf = self._create_value_page(quote_data, company_settings)
        pdf_parts.append(value_pdf)
        
        # PAGE 3: Proje Verileri (Project Data)
        project_pdf = self._create_project_data_page(quote_data, company_settings)
        if project_pdf:
            pdf_parts.append(project_pdf)
        
        # PAGE 4: Sistem Analiz (System Analysis & Benefits)
        category_name = quote_data.get('customer_category_name', '').lower()
        show_analysis = any(cat in category_name for cat in ['off', 'on', 'grid', 'sulama', 'hibrit'])
        if show_analysis:
            analysis_pdf = self._create_analysis_page(quote_data, company_settings)
            if analysis_pdf:
                pdf_parts.append(analysis_pdf)
        
        # PAGE 5: Ürün Listesi + Fiyatlar
        price_pdf = self._create_price_page(quote_data, company_settings, include_bank_info=False)
        pdf_parts.append(price_pdf)
        
        # PAGE 6: Teklif Şartları
        terms_pdf = self._create_terms_page(quote_data, company_settings)
        if terms_pdf:
            pdf_parts.append(terms_pdf)
        
        # PAGE 7: Banka + Taksit
        bank_pdf = self._create_bank_info_page(quote_data, company_settings)
        if bank_pdf:
            pdf_parts.append(bank_pdf)
        
        # REFERANSLAR - Ödeme seçeneklerinden sonra, datasheetlerden önce
        reference_pdfs = self._get_reference_pdf()
        for ref in reference_pdfs:
            pdf_parts.append(ref)
        
        # PAGE 8: Datasheet'ler
        datasheet_pdfs = self._collect_datasheets(quote_data.get('items', []))
        for ds in datasheet_pdfs:
            pdf_parts.append(ds)
        
        # PAGE 9: Kapanış Kapak
        closing_pdf = self._create_closing_page(quote_data, company_settings)
        if closing_pdf:
            pdf_parts.append(closing_pdf)
        
        logger.info(f"Full PDF parts: {len(pdf_parts)}")
        return self._merge_pdfs(pdf_parts)
    
    def _generate_simple_pdf(self, quote_data: dict, company_settings: dict, quote_templates: list = None) -> BytesIO:
        """Generate simplified PDF for Perakende/Toptan categories"""
        pdf_parts = []
        
        # PAGE 1: Kapak (Varsayılan kapak - Genel Ayarlar'dan)
        cover_pdf = self._create_cover_page(quote_data, company_settings, None)  # None = varsayılan kapak
        if cover_pdf:
            pdf_parts.append(cover_pdf)
        
        # PAGE 2: Neden Biz
        value_pdf = self._create_value_page(quote_data, company_settings)
        pdf_parts.append(value_pdf)
        
        # PAGE 3: Ürün Listesi + Fiyatlar
        price_pdf = self._create_price_page(quote_data, company_settings, include_bank_info=False)
        pdf_parts.append(price_pdf)
        
        # PAGE 4: Teklif Şartları
        terms_pdf = self._create_terms_page(quote_data, company_settings)
        if terms_pdf:
            pdf_parts.append(terms_pdf)
        
        # PAGE 5: Ödeme Seçenekleri
        bank_pdf = self._create_bank_info_page(quote_data, company_settings)
        if bank_pdf:
            pdf_parts.append(bank_pdf)
        
        # REFERANSLAR - Ödeme seçeneklerinden sonra, datasheetlerden önce
        reference_pdfs = self._get_reference_pdf()
        for ref in reference_pdfs:
            pdf_parts.append(ref)
        
        # PAGE 6+: Datasheet'ler
        datasheet_pdfs = self._collect_datasheets(quote_data.get('items', []))
        for ds in datasheet_pdfs:
            pdf_parts.append(ds)
        
        # Son Sayfa: Kapanış Kapak
        closing_pdf = self._create_closing_page(quote_data, company_settings)
        if closing_pdf:
            pdf_parts.append(closing_pdf)
        
        logger.info(f"Simple PDF parts: {len(pdf_parts)}")
        return self._merge_pdfs(pdf_parts)
    
    def _get_category_id(self, category_name: str) -> str:
        """Map category name to template ID"""
        name_lower = category_name.lower().replace('i̇', 'i').replace('ı', 'i')
        
        if 'on' in name_lower and 'grid' in name_lower:
            return 'on_grid'
        elif 'off' in name_lower and 'grid' in name_lower:
            return 'off_grid'
        elif 'hibrit' in name_lower or 'hybrid' in name_lower:
            return 'hybrid'
        elif 'sulama' in name_lower or 'irrigation' in name_lower:
            return 'solar_irrigation'
        elif 'perakende' in name_lower:
            return 'retail'  # Perakende Satış
        elif 'toptan' in name_lower:
            return 'wholesale'  # Toptan Satış
        elif 'e-ticaret' in name_lower or 'eticaret' in name_lower:
            return 'ecommerce'
        elif 'endustriyel' in name_lower or 'endüstriyel' in name_lower:
            return 'industrial'
        return None
    
    def _is_simple_sale_category(self, category_name: str) -> bool:
        """Check if category is Perakende or Toptan (simplified PDF format)"""
        name_lower = category_name.lower().replace('i̇', 'i').replace('ı', 'i')
        return 'perakende' in name_lower or 'toptan' in name_lower
    
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
            img_path = self.upload_dir / cover_image_path.replace('/api/uploads/', '').replace('/uploads/', '').replace('uploads/', '')
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
        """Create value proposition page - Uses custom image if uploaded, otherwise default design"""
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Check if custom "Why Us" image is uploaded
        why_us_image = company_settings.get('why_us_image')
        if why_us_image:
            img_path = self.upload_dir / why_us_image.replace('/api/uploads/', '').replace('/uploads/', '').replace('uploads/', '')
            if img_path.exists():
                try:
                    # Draw full page custom image
                    c.drawImage(str(img_path), 0, 0, width=PAGE_WIDTH, height=PAGE_HEIGHT, preserveAspectRatio=False)
                    c.save()
                    buffer.seek(0)
                    return buffer
                except Exception as e:
                    logger.warning(f"Could not load why_us image: {e}")
        
        # Default design if no custom image
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
    
    # ==================== PAGE 4: SİSTEM ANALİZ ====================
    def _create_analysis_page(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """
        Sistem Analiz Sayfası (Page 4)
        - Yıllık üretim hesaplamaları
        - Enerji tasarrufu analizi
        - Yatırım geri dönüş süresi
        - Çevresel katkı
        """
        
        items = quote_data.get('items', [])
        
        # Calculate power values
        total_panel_watt = 0
        total_inverter_watt = 0
        total_battery_watt = 0
        panel_count = 0
        
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
                panel_count += quantity
        
        if total_panel_watt == 0:
            return None
        
        panel_kwp = total_panel_watt / 1000
        battery_kwh = total_battery_watt / 1000
        
        # Calculate estimated annual production (Turkey average ~1400-1600 kWh/kWp)
        annual_production_kwh = panel_kwp * 1500  # Average for Turkey
        
        # Electricity price (approximate)
        electricity_price_per_kwh = 3.5  # TL/kWh average
        annual_savings_tl = annual_production_kwh * electricity_price_per_kwh
        
        # Investment return calculation
        total_price = quote_data.get('total_tl', 0)
        if total_price > 0 and annual_savings_tl > 0:
            payback_years = total_price / annual_savings_tl
        else:
            payback_years = 0
        
        # CO2 reduction (average 0.5 kg CO2 per kWh)
        co2_reduction_kg = annual_production_kwh * 0.5
        trees_equivalent = co2_reduction_kg / 22  # Average tree absorbs 22 kg CO2/year
        
        # CREATE PAGE
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Draw template background
        draw_template_background(c)
        
        y = TEMPLATE_CONTENT_TOP  # Start from top
        
        # ===== PAGE TITLE =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 18)
        c.drawString(MARGIN_LEFT + 10, y, "Sistem Analizi")  # Left aligned, smaller
        y -= 25
        
        # ===== SECTION 0: SİSTEM GÜCÜ (3 kutucuk) =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 12)
        c.drawString(MARGIN_LEFT + 10, y, "Sistem Gücü")
        y -= 18
        
        # 3 boxes for system power
        power_box_width = (CONTENT_WIDTH - 30) / 3
        power_box_height = 55
        
        # Panel Power
        c.setFillColor(colors.HexColor('#fef3c7'))
        c.roundRect(MARGIN_LEFT + 10, y - power_box_height, power_box_width, power_box_height, 6, fill=True)
        
        c.setFillColor(colors.HexColor('#d97706'))
        c.setFont(FONT_BOLD, 9)
        c.drawCentredString(MARGIN_LEFT + 10 + power_box_width / 2, y - 12, "Güneş Paneli Gücü")
        
        c.setFont(FONT_BOLD, 20)
        c.drawCentredString(MARGIN_LEFT + 10 + power_box_width / 2, y - 35, f"{panel_kwp:.1f} kWp")
        
        c.setFont(FONT_NORMAL, 7)
        c.setFillColor(TEXT_LIGHT)
        c.drawCentredString(MARGIN_LEFT + 10 + power_box_width / 2, y - 48, f"{panel_count} Adet Panel")
        
        # Inverter Power
        c.setFillColor(colors.HexColor('#dbeafe'))
        c.roundRect(MARGIN_LEFT + 10 + power_box_width + 10, y - power_box_height, power_box_width, power_box_height, 6, fill=True)
        
        c.setFillColor(colors.HexColor('#2563eb'))
        c.setFont(FONT_BOLD, 9)
        c.drawCentredString(MARGIN_LEFT + 10 + power_box_width + 10 + power_box_width / 2, y - 12, "İnverter Gücü")
        
        inverter_kw = total_inverter_watt / 1000
        c.setFont(FONT_BOLD, 20)
        c.drawCentredString(MARGIN_LEFT + 10 + power_box_width + 10 + power_box_width / 2, y - 35, f"{inverter_kw:.0f} kW")
        
        c.setFont(FONT_NORMAL, 7)
        c.setFillColor(TEXT_LIGHT)
        c.drawCentredString(MARGIN_LEFT + 10 + power_box_width + 10 + power_box_width / 2, y - 48, "Hibrit/On-Grid")
        
        # Battery Capacity
        c.setFillColor(colors.HexColor('#d1fae5'))
        c.roundRect(MARGIN_LEFT + 10 + (power_box_width + 10) * 2, y - power_box_height, power_box_width, power_box_height, 6, fill=True)
        
        c.setFillColor(colors.HexColor('#059669'))
        c.setFont(FONT_BOLD, 9)
        c.drawCentredString(MARGIN_LEFT + 10 + (power_box_width + 10) * 2 + power_box_width / 2, y - 12, "Batarya Kapasitesi")
        
        c.setFont(FONT_BOLD, 20)
        if battery_kwh > 0:
            c.drawCentredString(MARGIN_LEFT + 10 + (power_box_width + 10) * 2 + power_box_width / 2, y - 35, f"{battery_kwh:.1f} kWh")
            c.setFont(FONT_NORMAL, 7)
            c.setFillColor(TEXT_LIGHT)
            c.drawCentredString(MARGIN_LEFT + 10 + (power_box_width + 10) * 2 + power_box_width / 2, y - 48, "Lityum Batarya")
        else:
            c.drawCentredString(MARGIN_LEFT + 10 + (power_box_width + 10) * 2 + power_box_width / 2, y - 35, "—")
            c.setFont(FONT_NORMAL, 7)
            c.setFillColor(TEXT_LIGHT)
            c.drawCentredString(MARGIN_LEFT + 10 + (power_box_width + 10) * 2 + power_box_width / 2, y - 48, "Yok")
        
        y -= power_box_height + 20
        
        # ===== SECTION 1: YILLIK ÜRETİM TAHMİNİ =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 14)
        c.drawString(MARGIN_LEFT + 10, y, "Yıllık Üretim Tahmini")
        y -= 25
        
        # Big number display for annual production
        big_box_height = 80
        c.setFillColor(colors.HexColor('#f0f9ff'))
        c.roundRect(MARGIN_LEFT + 5, y - big_box_height, CONTENT_WIDTH / 2 - 15, big_box_height, 8, fill=True)
        
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 32)
        c.drawCentredString(MARGIN_LEFT + 5 + (CONTENT_WIDTH / 2 - 15) / 2, y - 40, f"{annual_production_kwh:,.0f}")
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 11)
        c.drawCentredString(MARGIN_LEFT + 5 + (CONTENT_WIDTH / 2 - 15) / 2, y - 60, "kWh / Yıl")
        
        # Right side - Monthly average
        c.setFillColor(colors.HexColor('#d1fae5'))
        c.roundRect(PAGE_WIDTH / 2 + 10, y - big_box_height, CONTENT_WIDTH / 2 - 15, big_box_height, 8, fill=True)
        
        monthly_avg = annual_production_kwh / 12
        c.setFillColor(colors.HexColor('#059669'))
        c.setFont(FONT_BOLD, 32)
        c.drawCentredString(PAGE_WIDTH / 2 + 10 + (CONTENT_WIDTH / 2 - 15) / 2, y - 40, f"{monthly_avg:,.0f}")
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 11)
        c.drawCentredString(PAGE_WIDTH / 2 + 10 + (CONTENT_WIDTH / 2 - 15) / 2, y - 60, "kWh / Ay Ortalama")
        
        y -= big_box_height + 25
        
        # ===== SECTION 2: TASARRUF ANALİZİ =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 14)
        c.drawString(MARGIN_LEFT + 10, y, "Tasarruf Analizi")
        y -= 25
        
        # 3 boxes for savings
        box_width = (CONTENT_WIDTH - 30) / 3
        box_height = 70
        
        # Annual savings
        c.setFillColor(colors.HexColor('#fef3c7'))
        c.roundRect(MARGIN_LEFT + 10, y - box_height, box_width, box_height, 6, fill=True)
        
        c.setFillColor(colors.HexColor('#d97706'))
        c.setFont(FONT_BOLD, 9)
        c.drawCentredString(MARGIN_LEFT + 10 + box_width / 2, y - 15, "Yıllık Tasarruf")
        
        c.setFont(FONT_BOLD, 18)
        c.drawCentredString(MARGIN_LEFT + 10 + box_width / 2, y - 40, f"₺{annual_savings_tl:,.0f}")
        
        c.setFont(FONT_NORMAL, 8)
        c.setFillColor(TEXT_LIGHT)
        c.drawCentredString(MARGIN_LEFT + 10 + box_width / 2, y - 55, "Tahmini")
        
        # 25 year savings
        c.setFillColor(colors.HexColor('#dbeafe'))
        c.roundRect(MARGIN_LEFT + 10 + box_width + 10, y - box_height, box_width, box_height, 6, fill=True)
        
        c.setFillColor(colors.HexColor('#2563eb'))
        c.setFont(FONT_BOLD, 9)
        c.drawCentredString(MARGIN_LEFT + 10 + box_width + 10 + box_width / 2, y - 15, "25 Yıllık Tasarruf")
        
        c.setFont(FONT_BOLD, 18)
        total_25_year = annual_savings_tl * 25
        if total_25_year >= 1000000:
            display_text = f"₺{total_25_year/1000000:.1f}M"
        else:
            display_text = f"₺{total_25_year:,.0f}"
        c.drawCentredString(MARGIN_LEFT + 10 + box_width + 10 + box_width / 2, y - 40, display_text)
        
        c.setFont(FONT_NORMAL, 8)
        c.setFillColor(TEXT_LIGHT)
        c.drawCentredString(MARGIN_LEFT + 10 + box_width + 10 + box_width / 2, y - 55, "Kümülatif")
        
        # Payback period
        c.setFillColor(colors.HexColor('#d1fae5'))
        c.roundRect(MARGIN_LEFT + 10 + (box_width + 10) * 2, y - box_height, box_width, box_height, 6, fill=True)
        
        c.setFillColor(colors.HexColor('#059669'))
        c.setFont(FONT_BOLD, 9)
        c.drawCentredString(MARGIN_LEFT + 10 + (box_width + 10) * 2 + box_width / 2, y - 15, "Geri Dönüş Süresi")
        
        c.setFont(FONT_BOLD, 18)
        if payback_years > 0:
            c.drawCentredString(MARGIN_LEFT + 10 + (box_width + 10) * 2 + box_width / 2, y - 40, f"{payback_years:.1f} Yıl")
        else:
            c.drawCentredString(MARGIN_LEFT + 10 + (box_width + 10) * 2 + box_width / 2, y - 40, "—")
        
        c.setFont(FONT_NORMAL, 8)
        c.setFillColor(TEXT_LIGHT)
        c.drawCentredString(MARGIN_LEFT + 10 + (box_width + 10) * 2 + box_width / 2, y - 55, "Tahmini")
        
        y -= box_height + 25
        
        # ===== SECTION 3: ÇEVRESEL KATKI =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 14)
        c.drawString(MARGIN_LEFT + 10, y, "Çevresel Katkı")
        y -= 20
        
        # Environmental impact box
        env_box_height = 60
        c.setFillColor(colors.HexColor('#ecfdf5'))
        c.roundRect(MARGIN_LEFT + 5, y - env_box_height, CONTENT_WIDTH - 10, env_box_height, 8, fill=True)
        
        # Left side - CO2 reduction
        c.setFillColor(colors.HexColor('#059669'))
        c.setFont(FONT_BOLD, 10)
        c.drawString(MARGIN_LEFT + 20, y - 20, "Yıllık CO₂ Azaltımı:")
        c.setFont(FONT_BOLD, 16)
        c.drawString(MARGIN_LEFT + 130, y - 20, f"{co2_reduction_kg:,.0f} kg")
        
        # Right side - Trees equivalent
        c.setFont(FONT_BOLD, 10)
        c.drawString(PAGE_WIDTH / 2 + 10, y - 20, "Ağaç Eşdeğeri:")
        c.setFont(FONT_BOLD, 16)
        c.drawString(PAGE_WIDTH / 2 + 110, y - 20, f"{trees_equivalent:.0f} ağaç/yıl")
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 8)
        c.drawString(MARGIN_LEFT + 20, y - 45, "Güneş enerjisi sisteminiz sayesinde karbon ayak izinizi azaltıyor ve doğaya katkı sağlıyorsunuz.")
        
        y -= env_box_height + 20
        
        # ===== SECTION 4: NOTLAR =====
        c.setFillColor(colors.HexColor('#f1f5f9'))
        c.roundRect(MARGIN_LEFT + 5, y - 55, CONTENT_WIDTH - 10, 55, 6, fill=True)
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_BOLD, 9)
        c.drawString(MARGIN_LEFT + 15, y - 15, "Hesaplama Notları")
        
        c.setFont(FONT_NORMAL, 7)
        c.setFillColor(TEXT_LIGHT)
        c.drawString(MARGIN_LEFT + 15, y - 28, "• Üretim hesaplamaları Türkiye ortalaması (1500 kWh/kWp/yıl) baz alınarak yapılmıştır.")
        c.drawString(MARGIN_LEFT + 15, y - 39, "• Gerçek üretim değerleri lokasyon, yönelim ve iklim koşullarına göre değişiklik gösterebilir.")
        c.drawString(MARGIN_LEFT + 15, y - 50, "• Elektrik fiyatları güncel tarifeler üzerinden hesaplanmıştır.")
        
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
    def _create_price_page(self, quote_data: dict, company_settings: dict, include_bank_info: bool = False) -> BytesIO:
        """Create price quote page - Bank info moved to separate page"""
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=PAGE_HEIGHT - TEMPLATE_CONTENT_TOP,
            bottomMargin=TEMPLATE_CONTENT_BOTTOM,
            leftMargin=MARGIN_LEFT + 5,
            rightMargin=MARGIN_RIGHT + 5
        )
        
        elements = []
        
        # Header with company | customer
        header_table = self._create_header(quote_data, company_settings)
        elements.append(header_table)
        elements.append(Spacer(1, 5))
        
        # Quote info bar
        info_bar = self._create_info_bar(quote_data)
        elements.append(info_bar)
        elements.append(Spacer(1, 5))
        
        # Title
        category_name = quote_data.get('customer_category_name', '')
        title_text = f"{category_name} Fiyat Teklifi" if category_name else "Fiyat Teklifi"
        elements.append(Paragraph(f"<b>{title_text}</b>", self.styles['QuoteTitle']))
        elements.append(Spacer(1, 5))
        
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
        
        # Bank accounts - NOW CONTROLLED BY include_bank_info PARAMETER
        # By default False - bank info is on separate page (Page 7)
        if include_bank_info:
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
        """
        Create Terms Page - Corporate text format without boxes
        - Ödeme Koşulları
        - Önemli Notlar
        - Garanti Süreleri
        - Garanti Dışı Unsurlar
        """
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Draw template background
        draw_template_background(c)
        
        y = TEMPLATE_CONTENT_TOP  # Start from top
        
        # Page title - CENTERED
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 18)
        c.drawCentredString(PAGE_WIDTH / 2, y, "Teklif Şartları")
        y -= 28
        
        # Text width limit (to prevent overflow)
        max_text_width = CONTENT_WIDTH - 40
        
        # ===== ÖDEME KOŞULLARI =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 12)
        c.drawString(MARGIN_LEFT + 15, y, "Ödeme Koşulları")
        y -= 16
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 10)
        
        odeme_items = [
            "Toplam bedelin %70'i, sözleşme imzasını takiben havale / peşin / kredi kartı ile tahsil edilir.",
            "Kalan %30, sistemin kurulumu tamamlanıp çalışır hale getirildikten sonra tamamlanır.",
            "Döviz bazlı tekliflerde TL ile ödeme yapılacaksa Ziraat Bankası Efektif Satış kuru baz alınır.",
            "Döviz bazlı tekliflerde döviz ile ödeme yapılacaksa USD kuru üzerinden gönderim sağlanabilir."
        ]
        
        for item in odeme_items:
            c.drawString(MARGIN_LEFT + 20, y, f"• {item}")
            y -= 14
        
        y -= 10
        
        # ===== ÖNEMLİ NOTLAR =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 12)
        c.drawString(MARGIN_LEFT + 15, y, "Önemli Notlar")
        y -= 16
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 10)
        
        notlar_items = [
            "Sistemin kurulacağı alanın projeye uygunluğu, Aktürk Enerji tarafından onaylanacaktır.",
            "Sunulan teklif ve dokümanlar gizlilik kapsamındadır, üçüncü kişilerle paylaşılmaması rica olunur.",
            "Dış müdahale veya hatalı kullanım sonucu arızalarda servis hizmetleri ücretli sağlanabilir.",
            "Bu teklif yazım hatalarında Aktürk Enerji Teknolojileri'nin düzeltme hakkı saklıdır.",
            "Doğabilecek uyuşmazlıklarda Ankara Mahkemeleri ve İcra Daireleri yetkilidir."
        ]
        
        for item in notlar_items:
            c.drawString(MARGIN_LEFT + 20, y, f"• {item}")
            y -= 14
        
        y -= 10
        
        # ===== GARANTİ SÜRELERİ =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 12)
        c.drawString(MARGIN_LEFT + 15, y, "Garanti Süreleri")
        y -= 16
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 10)
        
        # Ürünlerden garanti bilgilerini topla
        garanti_items = []
        items = quote_data.get('items', [])
        
        # Kategori bazlı garanti süreleri (varsayılanlar)
        kategori_garantileri = {
            'panel': 'Güneş Panelleri: {warranty} yıl elektrik üretim garantilidir.',
            'inverter': 'İnverter: {warranty} yıl üretici garantisi geçerlidir.',
            'batarya': 'Batarya: {warranty} yıl üretici garantisi geçerlidir.',
            'akü': 'Akü: {warranty} yıl üretici garantisi geçerlidir.',
            'default': '{name}: {warranty} yıl üretici garantisi geçerlidir.'
        }
        
        # Ürün bazlı garanti süreleri
        eklenen_kategoriler = set()
        for item in items:
            warranty_years = item.get('warranty_years')
            if warranty_years and warranty_years > 0:
                product_name = item.get('product_name', item.get('name', 'Ürün'))
                category_name = item.get('category_name', '').lower()
                
                # Kategori bazlı şablon seç
                template = kategori_garantileri.get('default')
                if 'panel' in category_name:
                    if 'panel' not in eklenen_kategoriler:
                        template = kategori_garantileri.get('panel')
                        eklenen_kategoriler.add('panel')
                    else:
                        continue  # Zaten panel garantisi eklendi
                elif 'inverter' in category_name:
                    if 'inverter' not in eklenen_kategoriler:
                        template = kategori_garantileri.get('inverter')
                        eklenen_kategoriler.add('inverter')
                    else:
                        continue
                elif 'batarya' in category_name or 'akü' in category_name:
                    if 'batarya' not in eklenen_kategoriler:
                        template = kategori_garantileri.get('batarya')
                        eklenen_kategoriler.add('batarya')
                    else:
                        continue
                
                garanti_text = template.format(warranty=warranty_years, name=product_name)
                if garanti_text not in garanti_items:
                    garanti_items.append(garanti_text)
        
        # Varsayılan garanti maddeleri (eğer ürünlerden çekilemezse)
        if not garanti_items:
            garanti_items = [
                "Güneş Panelleri: 25 yıl elektrik üretim garantilidir.",
                "İnverter: 5 yıl üretici garantisi geçerlidir.",
                "Batarya: 10 yıl üretici garantisi geçerlidir.",
            ]
        
        # İşçilik garantisi her zaman ekle
        garanti_items.append("İşçilik ve Kurulum: 2 yıl Aktürk Enerji Teknolojileri garanti kapsamındadır.")
        
        for item in garanti_items:
            c.drawString(MARGIN_LEFT + 20, y, f"• {item}")
            y -= 14
        
        y -= 6
        
        # ===== GARANTİ DIŞI UNSURLAR =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 12)
        c.drawString(MARGIN_LEFT + 15, y, "Garanti Dışı Unsurlar")
        y -= 16
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 10)
        
        garanti_disi_items = [
            "Bakım ve kullanım talimatlarına aykırı kullanım",
            "Yanlış kullanım ve ihmaller",
            "Mücbir sebepler, doğal felaketler",
            "Aktürk Enerji Teknolojileri kapsam alanı dışındaki kazalar",
            "Yetkisiz kişilerce açılmış veya tamir edilmeye çalışılmış ekipmanlar",
            "Yukarıda yer almayan koşullarda uluslararası standartlar geçerlidir."
        ]
        
        for item in garanti_disi_items:
            c.drawString(MARGIN_LEFT + 20, y, f"• {item}")
            y -= 14
        
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
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        return info_table
    
    def _create_products_table(self, items: list):
        """Create products table - with package details support"""
        
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
            item_type = item.get('item_type', 'product')
            
            # If it's a package, show package name with bold
            if item_type == 'package':
                product_name = f"<b>📦 {product_name}</b>"
            
            row = [
                Paragraph(str(quantity), self.styles['TableCellCenter']),
                Paragraph(unit, self.styles['TableCellCenter']),
                Paragraph(product_name, self.styles['TableCell']),
                Paragraph(format_currency(unit_price), self.styles['TableCellRight']),
                Paragraph(format_currency(total_price), self.styles['TableCellRight']),
            ]
            table_data.append(row)
            
            # If package, add sub-items as indented rows
            package_items = item.get('package_items', [])
            if item_type == 'package' and package_items:
                for sub_item in package_items:
                    sub_name = sub_item.get('product_name', '-')
                    sub_qty = sub_item.get('quantity', 1)
                    sub_unit = sub_item.get('unit', 'Adet')
                    
                    sub_row = [
                        Paragraph(str(sub_qty), self.styles['TableCellCenter']),
                        Paragraph(sub_unit, self.styles['TableCellCenter']),
                        Paragraph(f"    ↳ {sub_name}", self.styles['TableCell']),  # Indented
                        Paragraph("-", self.styles['TableCellRight']),  # No individual price
                        Paragraph("-", self.styles['TableCellRight']),
                    ]
                    table_data.append(sub_row)
        
        table = Table(table_data, colWidths=[COL_MIKTAR, COL_BIRIM, COL_URUN, COL_BIRIM_FIYAT, COL_TOPLAM_FIYAT])
        
        style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTNAME', (0, 1), (-1, -1), FONT_NORMAL),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
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
    
    def _get_reference_pdf(self) -> list:
        """Get reference PDF pages from static folder"""
        reference_path = Path(__file__).parent / "static" / "referans.pdf"
        reference_pages = []
        
        if reference_path.exists():
            try:
                with open(reference_path, 'rb') as f:
                    reference_pages.append(BytesIO(f.read()))
                logger.info("Reference PDF added successfully")
            except Exception as e:
                logger.warning(f"Could not load reference PDF: {e}")
        else:
            logger.warning(f"Reference PDF not found at: {reference_path}")
        
        return reference_pages
    
    def _collect_datasheets(self, items: list) -> list:
        """Collect datasheet PDFs"""
        
        datasheets = []
        logger.info(f"Collecting datasheets from {len(items)} items, upload_dir: {self.upload_dir}")
        
        for item in items:
            datasheet_url = item.get('datasheet_url')
            logger.info(f"Item: {item.get('product_name', 'N/A')[:30]}, datasheet_url: {datasheet_url}")
            
            if not datasheet_url:
                continue
            
            # Clean filename from various URL formats (handle full URLs and relative paths)
            filename = datasheet_url
            # Remove domain if present (e.g., https://domain.com/api/uploads/file.pdf)
            if 'http' in filename:
                # Extract path after domain
                import urllib.parse
                parsed = urllib.parse.urlparse(filename)
                filename = parsed.path
            
            # Remove various prefixes
            filename = filename.replace('/api/uploads/', '').replace('/uploads/', '').replace('uploads/', '')
            
            # Remove leading slash if present
            if filename.startswith('/'):
                filename = filename[1:]
            
            full_path = self.upload_dir / filename
            
            logger.info(f"Looking for datasheet: {filename} at {full_path}, exists: {full_path.exists()}")
            
            if full_path.exists() and str(full_path).lower().endswith('.pdf'):
                try:
                    with open(full_path, 'rb') as f:
                        datasheets.append(BytesIO(f.read()))
                    logger.info(f"Added datasheet: {filename}")
                except Exception as e:
                    logger.warning(f"Could not load datasheet {filename}: {e}")
            else:
                logger.warning(f"Datasheet not found or not PDF: {full_path}")
        
        logger.info(f"Total datasheets collected: {len(datasheets)}")
        return datasheets
    
    # ==================== PAGE 3: PROJE VERİLERİ (PROJECT DATA) ====================
    def _create_project_data_page(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """
        Create Project Data Page (Proje Verileri)
        - Project description
        - System summary box
        - Technical parameters
        - Installation & commissioning
        - Delivery & documentation
        """
        
        items = quote_data.get('items', [])
        
        # Calculate power values
        total_panel_watt = 0
        total_inverter_watt = 0
        total_battery_watt = 0
        panel_count = 0
        panel_single_watt = 0
        
        for item in items:
            power = item.get('power_watt', 0) or 0
            quantity = item.get('quantity', 1)
            category = (item.get('category_name') or '').lower().replace('i̇', 'i').replace('ı', 'i')
            product_name = (item.get('product_name') or '').lower().replace('i̇', 'i').replace('ı', 'i')
            
            # DEBUG LOG
            logger.info(f"PDF CALC - Item: {item.get('product_name', 'N/A')[:30]}, power={power}, qty={quantity}, cat={category[:20] if category else 'N/A'}")
            
            if any(x in category or x in product_name for x in ['batarya', 'akü', 'battery', 'depolama', 'lityum']):
                total_battery_watt += power * quantity
            elif any(x in category or x in product_name for x in ['inverter', 'invertor', 'evirici']):
                total_inverter_watt += power * quantity
            elif any(x in category or x in product_name for x in ['panel', 'güneş', 'solar', 'mono', 'poli']):
                total_panel_watt += power * quantity
                panel_count += quantity
                if power > 0:
                    panel_single_watt = power
        
        logger.info(f"PDF CALC RESULT - panel_count={panel_count}, total_panel_watt={total_panel_watt}, inverter={total_inverter_watt}, battery={total_battery_watt}")
        
        if total_panel_watt == 0 and total_inverter_watt == 0 and total_battery_watt == 0:
            return None
        
        panel_kwp = total_panel_watt / 1000
        inverter_kw = total_inverter_watt / 1000
        battery_kwh = total_battery_watt / 1000
        
        # Customer info
        customer_name = quote_data.get('customer_name', 'Değerli Müşterimiz')
        customer_city = quote_data.get('customer_city', 'Ankara')
        
        # System type
        category_name = quote_data.get('customer_category_name', '').lower()
        if 'off' in category_name:
            system_type = "Off-Grid (Şebekeden Bağımsız)"
        elif 'hybrid' in category_name or 'hibrit' in category_name:
            system_type = "Hibrit (Depolamalı)"
        else:
            system_type = "On-Grid (Öz Tüketim)"
        
        # CREATE PAGE
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Draw template background
        draw_template_background(c)
        
        y = TEMPLATE_CONTENT_TOP  # Start from top
        
        # ===== SECTION 1: PROJE VERİLERİ TITLE =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 16)
        c.drawString(MARGIN_LEFT + 10, y, "Proje Verileri")
        y -= 20
        
        # Project description paragraph
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 10)
        
        desc_line1 = f"{customer_name}'a ait {customer_city} ilinde bulunan proje için, mevcut çatı koşulları ve enerji"
        desc_line2 = "tüketimi dikkate alınarak hazırlanmış Güneş Enerjisi Sistemi (GES) ön maliyet ve ön fizibilite çalışmasıdır."
        desc_line3 = "Bu raporda yer alan tüm hesaplamalar ve teknik öngörüler, sistemin uzun vadeli performansını ve"
        desc_line4 = "yatırım geri dönüşünü esas alacak şekilde yapılmıştır."
        
        c.drawString(MARGIN_LEFT + 10, y, desc_line1)
        y -= 13
        c.drawString(MARGIN_LEFT + 10, y, desc_line2)
        y -= 16
        c.drawString(MARGIN_LEFT + 10, y, desc_line3)
        y -= 13
        c.drawString(MARGIN_LEFT + 10, y, desc_line4)
        y -= 20
        
        # ===== SECTION 2: SİSTEM GENEL ÖZETİ (BOXED) =====
        box_height = 90
        c.setFillColor(colors.HexColor('#f0f9ff'))  # Light blue background
        c.roundRect(MARGIN_LEFT + 5, y - box_height, CONTENT_WIDTH - 10, box_height, 8, fill=True)
        
        # Box title
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 12)
        c.drawString(MARGIN_LEFT + 15, y - 16, "Sistem Özeti")
        
        # System info - 2 columns with proper spacing
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 10)
        
        col1_x = MARGIN_LEFT + 20
        col1_value_x = col1_x + 90
        col2_x = PAGE_WIDTH / 2 + 10
        col2_value_x = col2_x + 105
        
        info_y = y - 35
        
        # Left column
        c.setFont(FONT_BOLD, 10)
        c.drawString(col1_x, info_y, "Kurulu Güç:")
        c.setFont(FONT_NORMAL, 10)
        c.drawString(col1_value_x, info_y, f"{panel_kwp:.1f} kWp")
        
        info_y -= 15
        c.setFont(FONT_BOLD, 10)
        c.drawString(col1_x, info_y, "Kurulum Alanı:")
        c.setFont(FONT_NORMAL, 10)
        c.drawString(col1_value_x, info_y, "Mesken Çatısı")
        
        info_y -= 15
        c.setFont(FONT_BOLD, 10)
        c.drawString(col1_x, info_y, "Sistem Tipi:")
        c.setFont(FONT_NORMAL, 10)
        c.drawString(col1_value_x, info_y, system_type)
        
        # Right column
        info_y = y - 35
        c.setFont(FONT_BOLD, 10)
        c.drawString(col2_x, info_y, "Panel Sayısı:")
        c.setFont(FONT_NORMAL, 10)
        c.drawString(col2_value_x, info_y, f"{panel_count} Adet")
        
        info_y -= 15
        c.setFont(FONT_BOLD, 10)
        c.drawString(col2_x, info_y, "İnverter Gücü:")
        c.setFont(FONT_NORMAL, 10)
        c.drawString(col2_value_x, info_y, f"{inverter_kw:.0f} kW")
        
        info_y -= 15
        c.setFont(FONT_BOLD, 10)
        c.drawString(col2_x, info_y, "Batarya:")
        c.setFont(FONT_NORMAL, 10)
        c.drawString(col2_value_x, info_y, f"{battery_kwh:.1f} kWh" if battery_kwh > 0 else "Yok")
        
        y -= box_height + 18
        
        # ===== SECTION 3: TEKNİK VE PERFORMANS PARAMETRELERİ (Text format) =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 12)
        c.drawString(MARGIN_LEFT + 10, y, "Teknik ve Performans Parametreleri")
        y -= 18
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 10)
        
        # Güneş Panelleri
        c.setFont(FONT_BOLD, 10)
        c.setFillColor(colors.HexColor('#d97706'))
        c.drawString(MARGIN_LEFT + 15, y, "Güneş Panelleri:")
        c.setFont(FONT_NORMAL, 10)
        c.setFillColor(TEXT_COLOR)
        y -= 13
        c.drawString(MARGIN_LEFT + 15, y, "• Monokristal hücreli, yeni nesil fotovoltaik paneller kullanılacaktır.")
        y -= 12
        c.drawString(MARGIN_LEFT + 15, y, "• Yıllık performans düşüşü: %0,83  |  15. yıl sonunda %92  |  35. yıl sonunda %80 performans")
        y -= 15
        
        # Üretim Hesaplama
        c.setFont(FONT_BOLD, 10)
        c.setFillColor(colors.HexColor('#2563eb'))
        c.drawString(MARGIN_LEFT + 15, y, "Üretim Hesaplama:")
        c.setFont(FONT_NORMAL, 10)
        c.setFillColor(TEXT_COLOR)
        y -= 13
        c.drawString(MARGIN_LEFT + 15, y, "• Hesaplamalar AB PVGIS sistemi üzerinden il bazlı ortalama güneşlenme verileri kullanılarak yapılmıştır.")
        y -= 12
        c.drawString(MARGIN_LEFT + 15, y, "• Aylık ve yıllık üretim çıktıları teklif içerisinde sunulmaktadır.")
        y -= 15
        
        # Depolama & İnverter
        c.setFont(FONT_BOLD, 10)
        c.setFillColor(colors.HexColor('#059669'))
        c.drawString(MARGIN_LEFT + 15, y, "Depolama & İnverter:")
        c.setFont(FONT_NORMAL, 10)
        c.setFillColor(TEXT_COLOR)
        y -= 13
        
        if battery_kwh > 0:
            c.drawString(MARGIN_LEFT + 15, y, f"• {inverter_kw:.0f} kW inverter kullanılacaktır. Prizmatik lityum batarya ile enerji depolama sağlanacaktır.")
            y -= 12
            c.drawString(MARGIN_LEFT + 15, y, f"• Batarya çevrim ömrü: 6000 cycle  |  Depolama kapasitesi: {battery_kwh:.2f} kWh")
        else:
            c.drawString(MARGIN_LEFT + 15, y, f"• {inverter_kw:.0f} kW inverter kullanılacaktır. On-Grid sistem için batarya bulunmamaktadır.")
            y -= 12
            c.drawString(MARGIN_LEFT + 15, y, "• Üretilen enerji doğrudan tüketime yönlendirilir.")
        
        y -= 18
        
        # ===== SECTION 4: KURULUM & DEVREYE ALMA =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 12)
        c.drawString(MARGIN_LEFT + 10, y, "Kurulum ve Devreye Alma")
        y -= 15
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 10)
        
        kurulum_items = [
            "• Malzeme tedariği, nakliye ve anahtar teslim kurulum Aktürk Enerji tarafından yapılacaktır.",
            "• Çatıya zarar vermeyecek uygun konstrüksiyon sistemi kullanılacaktır.",
            "• Solar kablolama, inverter ve batarya montajları uzman ekip tarafından yapılacaktır.",
            "• Sistem devreye alınacak, test ve kontroller tamamlanacaktır.",
            "• Mobil uygulama ve izleme sistemleri kurulup çalışır şekilde teslim edilecektir."
        ]
        
        for item in kurulum_items:
            c.drawString(MARGIN_LEFT + 15, y, item)
            y -= 12
        
        y -= 10
        
        # ===== SECTION 5: TESLİM & BELGELER (BOTTOM BOX) =====
        footer_box_height = 42
        c.setFillColor(colors.HexColor('#f1f5f9'))  # Gray background
        c.roundRect(MARGIN_LEFT + 5, y - footer_box_height, CONTENT_WIDTH - 10, footer_box_height, 6, fill=True)
        
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 10)
        c.drawString(MARGIN_LEFT + 15, y - 14, "Teslim ve Belgeler")
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 9)
        c.drawString(MARGIN_LEFT + 15, y - 26, "Tüm işlemler tamamlandıktan sonra sistem müşteri tarafından kontrol edilerek teslim alınır.")
        c.drawString(MARGIN_LEFT + 15, y - 38, "İş tesliminde; imzalı garanti belgeleri, ürün kullanım kılavuzları ve gerekli tüm dokümanlar teslim edilecektir.")
        
        c.save()
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 7: BANKA + TAKSİT ====================
    def _create_bank_info_page(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """
        Create Bank Info + Installment Options Page (Banka + Taksit)
        Separate page for payment information
        """
        
        bank_accounts = company_settings.get('bank_accounts', [])
        installment_options = company_settings.get('installment_options', [])
        payment_notes = company_settings.get('payment_notes', [])  # From settings
        
        # If no bank accounts, skip this page
        if not bank_accounts or len(bank_accounts) == 0:
            return None
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Draw template background
        draw_template_background(c)
        
        y = TEMPLATE_CONTENT_TOP  # Start from top
        
        # ===== PAGE TITLE =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 18)
        c.drawCentredString(PAGE_WIDTH / 2, y, "Ödeme Seçenekleri")
        y -= 28
        
        # ===== SECTION 1: BANKA HESAP BİLGİLERİ =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 12)
        c.drawString(MARGIN_LEFT + 10, y, "Banka Hesap Bilgileri")
        y -= 18
        
        # Account holder info (two lines for clarity)
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_BOLD, 9)
        c.drawString(MARGIN_LEFT + 10, y, "Hesap Sahibi / Ünvan:")
        y -= 14
        c.setFont(FONT_NORMAL, 9)
        c.drawString(MARGIN_LEFT + 10, y, "Akturk Yenilenebilir Enerji Teknolojileri Sanayi Ticaret Limited Şirketi")
        y -= 18
        
        # Bank accounts table header (without account holder column)
        header_height = 25
        col_widths = [0.30 * CONTENT_WIDTH, 0.25 * CONTENT_WIDTH, 0.45 * CONTENT_WIDTH]
        
        # Header row
        c.setFillColor(PRIMARY_COLOR)
        c.roundRect(MARGIN_LEFT + 5, y - header_height, CONTENT_WIDTH - 10, header_height, 4, fill=True)
        
        c.setFillColor(colors.white)
        c.setFont(FONT_BOLD, 9)
        
        x_pos = MARGIN_LEFT + 10
        c.drawString(x_pos, y - 17, "Banka")
        x_pos += col_widths[0]
        c.drawString(x_pos, y - 17, "Şube")
        x_pos += col_widths[1]
        c.drawString(x_pos, y - 17, "IBAN")
        
        y -= header_height + 5
        
        # Bank account rows (without account holder)
        row_height = 28
        for i, account in enumerate(bank_accounts):
            # Alternating row background
            if i % 2 == 0:
                c.setFillColor(colors.HexColor('#f8fafc'))
            else:
                c.setFillColor(colors.white)
            c.roundRect(MARGIN_LEFT + 5, y - row_height, CONTENT_WIDTH - 10, row_height, 3, fill=True)
            
            # Border
            c.setStrokeColor(BORDER_COLOR)
            c.setLineWidth(0.5)
            c.roundRect(MARGIN_LEFT + 5, y - row_height, CONTENT_WIDTH - 10, row_height, 3, fill=False, stroke=True)
            
            c.setFillColor(TEXT_COLOR)
            c.setFont(FONT_NORMAL, 8)
            
            x_pos = MARGIN_LEFT + 10
            c.drawString(x_pos, y - 18, account.get('bank_name', '-')[:25])
            x_pos += col_widths[0]
            c.drawString(x_pos, y - 18, account.get('bank_branch', '-')[:20])
            x_pos += col_widths[1]
            c.drawString(x_pos, y - 18, account.get('iban', '-'))
            
            y -= row_height + 3
        
        y -= 20
        
        # ===== SECTION 2: KREDİ KARTI TAKSİT SEÇENEKLERİ =====
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 14)
        c.drawString(MARGIN_LEFT + 10, y, "Kredi Kartı Taksit Seçenekleri")
        y -= 20
        
        # Info box
        c.setFillColor(colors.HexColor('#fffbeb'))
        c.roundRect(MARGIN_LEFT + 5, y - 45, CONTENT_WIDTH - 10, 45, 6, fill=True)
        
        c.setFillColor(colors.HexColor('#d97706'))
        c.setFont(FONT_BOLD, 10)
        c.drawString(MARGIN_LEFT + 15, y - 18, "Taksit Bilgisi")
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 9)
        c.drawString(MARGIN_LEFT + 15, y - 33, "Kredi kartı ile taksitli ödeme seçenekleri için lütfen satış temsilcinizle iletişime geçiniz.")
        
        y -= 60
        
        # Installment grid (if available)
        if installment_options and len(installment_options) > 0:
            c.setFillColor(TEXT_COLOR)
            c.setFont(FONT_BOLD, 10)
            c.drawString(MARGIN_LEFT + 10, y, "Taksit Tablosu")
            y -= 25
            
            # Create installment table
            inst_col_width = (CONTENT_WIDTH - 20) / 4
            inst_row_height = 30
            
            for i, option in enumerate(installment_options[:8]):  # Max 8 options
                col = i % 4
                row = i // 4
                
                box_x = MARGIN_LEFT + 10 + (col * inst_col_width)
                box_y = y - (row * (inst_row_height + 10))
                
                # Option box
                c.setFillColor(colors.HexColor('#f0f9ff'))
                c.roundRect(box_x, box_y - inst_row_height, inst_col_width - 10, inst_row_height, 4, fill=True)
                
                c.setFillColor(PRIMARY_COLOR)
                c.setFont(FONT_BOLD, 10)
                months = option.get('months', 1)
                c.drawCentredString(box_x + (inst_col_width - 10) / 2, box_y - 12, f"{months} Taksit")
                
                c.setFillColor(TEXT_COLOR)
                c.setFont(FONT_NORMAL, 8)
                rate = option.get('rate', 0)
                c.drawCentredString(box_x + (inst_col_width - 10) / 2, box_y - 24, f"%{rate} komisyon")
            
            y -= 90
        
        # ===== SECTION 3: ÖNEMLİ NOTLAR (from settings) =====
        # Default notes if none in settings
        if not payment_notes or len(payment_notes) == 0:
            payment_notes = [
                "Havale/EFT ödemelerinde açıklama kısmına teklif numaranızı yazınız.",
                "Taksitli ödemelerde toplam tutara komisyon oranı eklenir.",
                "Peşin ödemelerde ek indirim için satış temsilcinize danışınız."
            ]
        
        # Calculate box height based on notes count
        notes_box_height = 25 + (len(payment_notes) * 13)
        
        c.setFillColor(colors.HexColor('#f1f5f9'))
        c.roundRect(MARGIN_LEFT + 5, y - notes_box_height, CONTENT_WIDTH - 10, notes_box_height, 6, fill=True)
        
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 10)
        c.drawString(MARGIN_LEFT + 15, y - 18, "Önemli Notlar")
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_NORMAL, 8)
        
        note_y = y - 33
        for note in payment_notes[:10]:  # Max 10 notes
            # Add bullet if not present
            if not note.startswith('•'):
                note = f"• {note}"
            c.drawString(MARGIN_LEFT + 15, note_y, note[:100])  # Max 100 chars per line
            note_y -= 13
        
        c.save()
        buffer.seek(0)
        return buffer
    
    # ==================== PAGE 9: KAPANIŞ KAPAK ====================
    def _create_closing_page(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """
        Create Closing Cover Page (Kapanış Kapak)
        Final page with contact information and thank you message
        """
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Draw template background (same as other pages)
        draw_template_background(c)
        
        # Center content area
        center_y = PAGE_HEIGHT / 2 + 50
        
        # Thank you message
        c.setFillColor(PRIMARY_COLOR)
        c.setFont(FONT_BOLD, 28)
        c.drawCentredString(PAGE_WIDTH / 2, center_y, "Bizi Tercih Ettiğiniz İçin")
        c.drawCentredString(PAGE_WIDTH / 2, center_y - 40, "Teşekkür Ederiz")
        
        # Horizontal line
        c.setStrokeColor(PRIMARY_COLOR)
        c.setLineWidth(2)
        c.line(PAGE_WIDTH / 2 - 80, center_y - 60, PAGE_WIDTH / 2 + 80, center_y - 60)
        
        center_y -= 100
        
        # Company info box
        company_phone = company_settings.get('phone', '')
        company_email = company_settings.get('email', '')
        company_website = company_settings.get('website', '')
        
        c.setFillColor(colors.HexColor('#f0f9ff'))
        box_width = 300
        box_height = 100
        box_x = (PAGE_WIDTH - box_width) / 2
        c.roundRect(box_x, center_y - box_height, box_width, box_height, 10, fill=True)
        
        # Company name - shortened to fit
        c.setFillColor(SECONDARY_COLOR)
        c.setFont(FONT_BOLD, 14)
        c.drawCentredString(PAGE_WIDTH / 2, center_y - 25, "Aktürk Enerji Teknolojileri")
        
        # Contact info
        c.setFont(FONT_NORMAL, 10)
        c.setFillColor(TEXT_COLOR)
        
        info_y = center_y - 45
        if company_phone:
            c.drawCentredString(PAGE_WIDTH / 2, info_y, f"Tel: {company_phone}")
            info_y -= 15
        if company_email:
            c.drawCentredString(PAGE_WIDTH / 2, info_y, company_email)
            info_y -= 15
        if company_website:
            c.setFillColor(PRIMARY_COLOR)
            c.drawCentredString(PAGE_WIDTH / 2, info_y, company_website)
        
        center_y -= 140
        
        # Quote reference
        quote_number = quote_data.get('quote_number', '')
        quote_date = self._format_date(quote_data.get('created_at', ''))
        
        c.setFillColor(TEXT_LIGHT)
        c.setFont(FONT_NORMAL, 9)
        c.drawCentredString(PAGE_WIDTH / 2, center_y, f"Teklif No: {quote_number}  •  Tarih: {quote_date}")
        
        c.save()
        buffer.seek(0)
        return buffer
    
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
