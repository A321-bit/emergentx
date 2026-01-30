"""
Solar Energy Sales System - Professional PDF Quote Generator
A4 format with fixed margins and proper page handling
Turkish character support with DejaVu Sans font
Updated table layout: Miktar | Birim | Ürün | Birim Fiyat | Toplam Fiyat
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
    logger.warning("DejaVu fonts not found, falling back to Helvetica")
    FONT_NORMAL = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'

# A4 Page Settings
PAGE_WIDTH, PAGE_HEIGHT = A4  # 210mm x 297mm
MARGIN_TOP = 20 * mm
MARGIN_BOTTOM = 20 * mm
MARGIN_LEFT = 15 * mm
MARGIN_RIGHT = 15 * mm

# Content area dimensions
CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT  # ~180mm
CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM

# Column widths for product table (5 columns)
# Miktar | Birim | Ürün Açıklaması | Birim Fiyat | Toplam Fiyat
COL_MIKTAR = 0.10 * CONTENT_WIDTH      # Miktar: 10% (artırıldı)
COL_BIRIM = 0.10 * CONTENT_WIDTH       # Birim: 10%
COL_URUN = 0.40 * CONTENT_WIDTH        # Ürün Açıklaması: 40%
COL_BIRIM_FIYAT = 0.20 * CONTENT_WIDTH # Birim Fiyat: 20%
COL_TOPLAM_FIYAT = 0.20 * CONTENT_WIDTH # Toplam Fiyat: 20%

# Colors
PRIMARY_COLOR = colors.HexColor('#f59e0b')  # Amber/Orange
HEADER_BG = colors.HexColor('#f8fafc')
BORDER_COLOR = colors.HexColor('#e2e8f0')
TEXT_COLOR = colors.HexColor('#1e293b')


def format_currency(value, currency='TRY'):
    """Format number as Turkish currency with ₺ symbol"""
    if currency == 'TRY':
        return f"₺{value:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    return f"${value:,.2f}"


def create_styles():
    """Create custom paragraph styles with Turkish font support"""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='QuoteTitle',
        fontSize=16,
        fontName=FONT_BOLD,
        textColor=PRIMARY_COLOR,
        alignment=TA_CENTER,
        spaceAfter=10,
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
        name='SectionTitle',
        fontSize=11,
        fontName=FONT_BOLD,
        textColor=TEXT_COLOR,
        spaceBefore=10,
        spaceAfter=5,
    ))
    
    styles.add(ParagraphStyle(
        name='TableCell',
        fontSize=9,
        fontName=FONT_NORMAL,
        textColor=TEXT_COLOR,
        leading=12,
        wordWrap='CJK',  # Better word wrapping for long product names
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
        name='TableHeader',
        fontSize=9,
        fontName=FONT_BOLD,
        textColor=colors.white,
        leading=12,
        alignment=TA_CENTER,
    ))
    
    styles.add(ParagraphStyle(
        name='TotalLabel',
        fontSize=10,
        fontName=FONT_NORMAL,
        textColor=TEXT_COLOR,
        alignment=TA_RIGHT,
    ))
    
    styles.add(ParagraphStyle(
        name='TotalValue',
        fontSize=10,
        fontName=FONT_BOLD,
        textColor=TEXT_COLOR,
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
        name='Notes',
        fontSize=9,
        fontName=FONT_NORMAL,
        textColor=TEXT_COLOR,
        leading=12,
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
    
    return styles


class QuotePDFGenerator:
    """Generate professional A4 PDF quotes with Turkish support"""
    
    def __init__(self, upload_dir: str):
        self.upload_dir = Path(upload_dir)
        self.styles = create_styles()
    
    def generate(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """Generate complete PDF with cover, quote details, power calculation, contract, and datasheets"""
        pdf_parts = []
        
        # Part 1: Cover page
        cover_pdf = self._create_cover_page(quote_data, company_settings)
        if cover_pdf:
            pdf_parts.append(cover_pdf)
        
        # Part 2: Quote details (main content)
        quote_pdf = self._create_quote_pages(quote_data, company_settings)
        pdf_parts.append(quote_pdf)
        
        # Part 3: Power calculation page (only for Off Grid, On Grid, Sulama)
        category_name = quote_data.get('customer_category_name', '').lower()
        show_power_page = any(cat in category_name for cat in ['off', 'on', 'grid', 'sulama'])
        if show_power_page:
            power_pdf = self._create_power_calculation_page(quote_data, company_settings)
            if power_pdf:
                pdf_parts.append(power_pdf)
        
        # Part 4: Contract terms page (if exists)
        contract_pdf = self._create_contract_page(quote_data, company_settings)
        if contract_pdf:
            pdf_parts.append(contract_pdf)
        
        # Part 5: Product datasheets
        datasheet_pdfs = self._collect_datasheets(quote_data.get('items', []))
        pdf_parts.extend(datasheet_pdfs)
        
        # Merge all PDFs
        return self._merge_pdfs(pdf_parts)
    
    def _create_cover_page(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """Create cover page - either from uploaded PDF/image or auto-generated"""
        
        # Check for uploaded cover PDF
        cover_path = quote_data.get('cover_pdf_path')
        if cover_path:
            full_path = self.upload_dir / cover_path.replace('/uploads/', '').replace('uploads/', '')
            if full_path.exists() and str(full_path).lower().endswith('.pdf'):
                try:
                    with open(full_path, 'rb') as f:
                        return BytesIO(f.read())
                except Exception as e:
                    logger.warning(f"Could not load cover PDF: {e}")
        
        # Check for uploaded cover image
        cover_image_path = company_settings.get('quote_cover_image') or quote_data.get('cover_image_path')
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # If cover image exists, use it as full-page background
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
        
        # Auto-generate cover page
        c.setFillColor(colors.white)
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=True)
        
        # Decorative top bar
        c.setFillColor(PRIMARY_COLOR)
        c.rect(0, PAGE_HEIGHT - 80, PAGE_WIDTH, 80, fill=True)
        
        # Company logo
        logo_path = company_settings.get('logo')
        if logo_path:
            full_logo_path = self.upload_dir / logo_path.replace('/uploads/', '').replace('uploads/', '')
            if full_logo_path.exists():
                try:
                    c.drawImage(str(full_logo_path), MARGIN_LEFT, PAGE_HEIGHT - 70, 
                               width=60, height=50, preserveAspectRatio=True, mask='auto')
                except Exception as e:
                    logger.warning(f"Could not load logo: {e}")
        
        # Company name in header
        c.setFillColor(colors.white)
        c.setFont(FONT_BOLD, 18)
        company_name = company_settings.get('company_name', 'Solar Enerji')
        c.drawString(MARGIN_LEFT + 70, PAGE_HEIGHT - 50, company_name)
        
        # Main title area
        y_center = PAGE_HEIGHT / 2 + 50
        
        c.setFillColor(TEXT_COLOR)
        c.setFont(FONT_BOLD, 36)
        c.drawCentredString(PAGE_WIDTH / 2, y_center, "TEKLİF")
        
        # Quote number
        c.setFont(FONT_NORMAL, 18)
        quote_number = quote_data.get('quote_number', '')
        c.drawCentredString(PAGE_WIDTH / 2, y_center - 40, f"No: {quote_number}")
        
        # Decorative line
        c.setStrokeColor(PRIMARY_COLOR)
        c.setLineWidth(3)
        c.line(PAGE_WIDTH/2 - 100, y_center - 60, PAGE_WIDTH/2 + 100, y_center - 60)
        
        # Customer name
        c.setFont(FONT_BOLD, 16)
        customer_name = quote_data.get('customer_name', '')
        c.drawCentredString(PAGE_WIDTH / 2, y_center - 100, customer_name)
        
        # Date
        c.setFont(FONT_NORMAL, 12)
        quote_date = quote_data.get('created_at', '')
        if quote_date:
            try:
                if isinstance(quote_date, str):
                    dt = datetime.fromisoformat(quote_date.replace('Z', '+00:00'))
                else:
                    dt = quote_date
                formatted_date = dt.strftime('%d.%m.%Y')
            except:
                formatted_date = str(quote_date)[:10]
        else:
            formatted_date = datetime.now().strftime('%d.%m.%Y')
        
        c.drawCentredString(PAGE_WIDTH / 2, y_center - 130, f"Tarih: {formatted_date}")
        
        # Validity
        validity_days = quote_data.get('validity_days', 15)
        c.drawCentredString(PAGE_WIDTH / 2, y_center - 150, f"Geçerlilik: {validity_days} Gün")
        
        # Bottom bar
        c.setFillColor(PRIMARY_COLOR)
        c.rect(0, 0, PAGE_WIDTH, 40, fill=True)
        
        # Contact info
        c.setFillColor(colors.white)
        c.setFont(FONT_NORMAL, 9)
        contact_info = []
        if company_settings.get('phone'):
            contact_info.append(f"Tel: {company_settings['phone']}")
        if company_settings.get('email'):
            contact_info.append(f"E-posta: {company_settings['email']}")
        
        if contact_info:
            c.drawCentredString(PAGE_WIDTH / 2, 15, " | ".join(contact_info))
        
        c.save()
        buffer.seek(0)
        return buffer
    
    def _create_quote_pages(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """Create main quote detail pages"""
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=MARGIN_TOP,
            bottomMargin=MARGIN_BOTTOM,
            leftMargin=MARGIN_LEFT,
            rightMargin=MARGIN_RIGHT
        )
        
        elements = []
        
        # Header with company | divider | customer
        header_table = self._create_header(quote_data, company_settings)
        elements.append(header_table)
        elements.append(Spacer(1, 12))
        
        # Quote info bar (Teklif No, Tarih, Geçerlilik)
        info_bar = self._create_info_bar(quote_data)
        elements.append(info_bar)
        elements.append(Spacer(1, 12))
        
        # Category-based title - between info bar and products table
        category_name = quote_data.get('customer_category_name', '')
        if category_name:
            title_text = f"{category_name} Fiyat Teklifi"
        else:
            title_text = "Fiyat Teklifi"
        
        elements.append(Paragraph(f"<b>{title_text}</b>", self.styles['QuoteTitle']))
        elements.append(Spacer(1, 8))
        
        # Products table
        products_table = self._create_products_table(quote_data.get('items', []))
        elements.append(products_table)
        
        # Shipping/Installation row (if exists)
        shipping = quote_data.get('shipping_cost', 0)
        if shipping > 0:
            elements.append(Spacer(1, 3))
            shipping_table = self._create_shipping_row(shipping)
            elements.append(shipping_table)
        
        elements.append(Spacer(1, 10))
        
        # Totals (smaller fonts, ₺ symbol)
        totals_table = self._create_totals_table(quote_data)
        elements.append(totals_table)
        elements.append(Spacer(1, 15))
        
        # Quote terms (short notes)
        quote_terms = company_settings.get('quote_terms', '')
        if quote_terms:
            elements.append(Paragraph("TEKLİF ŞARTLARI", self.styles['SectionTitle']))
            elements.append(Spacer(1, 5))
            terms_text = quote_terms.replace('\n', '<br/>')
            elements.append(Paragraph(terms_text, self.styles['Notes']))
            elements.append(Spacer(1, 15))
        
        # Customer notes
        customer_notes = quote_data.get('customer_notes', '')
        if customer_notes:
            elements.append(Paragraph("NOTLAR", self.styles['SectionTitle']))
            elements.append(Spacer(1, 5))
            notes_text = customer_notes.replace('\n', '<br/>')
            elements.append(Paragraph(notes_text, self.styles['Notes']))
            elements.append(Spacer(1, 15))
        
        # Warranty
        warranty_text = company_settings.get('warranty_text', '')
        if warranty_text:
            elements.append(Paragraph("GARANTİ KOŞULLARI", self.styles['SectionTitle']))
            elements.append(Spacer(1, 5))
            elements.append(Paragraph(warranty_text, self.styles['Notes']))
            elements.append(Spacer(1, 15))
        
        # Bank accounts
        bank_accounts = company_settings.get('bank_accounts', [])
        if bank_accounts and len(bank_accounts) > 0:
            elements.append(Paragraph("BANKA HESAP BİLGİLERİ", self.styles['SectionTitle']))
            elements.append(Spacer(1, 5))
            
            bank_table = self._create_bank_accounts_table(bank_accounts)
            elements.append(bank_table)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def _create_shipping_row(self, shipping_cost: float):
        """Create shipping/installation row below products table"""
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
    
    def _create_power_calculation_page(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """Create power calculation page with graphics and explanations"""
        
        items = quote_data.get('items', [])
        
        # Calculate power values from items
        total_panel_watt = 0
        total_inverter_watt = 0
        total_battery_watt = 0
        
        for item in items:
            power = item.get('power_watt', 0) or 0
            quantity = item.get('quantity', 1)
            # Normalize Turkish characters for matching
            category = (item.get('category_name') or '').lower().replace('i̇', 'i').replace('ı', 'i')
            product_name = (item.get('product_name') or '').lower().replace('i̇', 'i').replace('ı', 'i')
            
            # Check battery FIRST (before panel check, since battery names may contain "solar")
            if any(x in category or x in product_name for x in ['batarya', 'akü', 'battery', 'depolama', 'lityum']):
                total_battery_watt += power * quantity
            # Check inverter (with Turkish character normalization)
            elif any(x in category or x in product_name for x in ['inverter', 'invertor', 'evirici']):
                total_inverter_watt += power * quantity
            # Check panel last
            elif any(x in category or x in product_name for x in ['panel', 'güneş', 'solar', 'mono', 'poli']):
                total_panel_watt += power * quantity
        
        # If no power data, don't create page
        if total_panel_watt == 0 and total_inverter_watt == 0 and total_battery_watt == 0:
            return None
        
        # Convert to kW
        panel_kw = total_panel_watt / 1000
        inverter_kw = total_inverter_watt / 1000
        battery_kwh = total_battery_watt / 1000  # Assuming Wh for battery
        
        # Calculate estimates
        daily_sun_hours = 5  # Average for Turkey
        daily_production = panel_kw * daily_sun_hours  # kWh
        monthly_production = daily_production * 30
        yearly_production = daily_production * 365
        
        # Check if Off-Grid system
        category_name = quote_data.get('customer_category_name', '').lower()
        is_off_grid = 'off' in category_name or ('grid' not in category_name and 'sulama' in category_name)
        
        # Financial calculations
        if is_off_grid:
            # Off-Grid: Calculate based on generator fuel cost
            # Generator uses ~0.35 L diesel per kWh
            # Diesel price ~45 TL/L in Turkey
            diesel_per_kwh = 0.35  # liters
            diesel_price = 45.0  # TL per liter
            generator_cost_per_kwh = diesel_per_kwh * diesel_price  # ~15.75 TL/kWh
            yearly_savings = yearly_production * generator_cost_per_kwh
            savings_label = "Jeneratör Mazot Tasarrufu"
            savings_note_text = (
                "<i>• Tasarruf hesaplamaları jeneratör mazot tüketimine göre yapılmıştır (0.35 L/kWh).<br/>"
                "• Güncel mazot fiyatı baz alınmıştır. Yakıt fiyat artışları tasarrufu artıracaktır.</i>"
            )
        else:
            # On-Grid / Hybrid: Calculate based on electricity price
            electricity_price = 3.0  # TL/kWh
            yearly_savings = yearly_production * electricity_price
            savings_label = "Elektrik Faturası Tasarrufu"
            savings_note_text = (
                "<i>• Tasarruf hesaplamaları güncel elektrik tarifelerine göre yapılmıştır.<br/>"
                "• Elektrik fiyatlarındaki artışlar tasarruf miktarını olumlu etkileyecektir.</i>"
            )
        
        # Environmental impact
        if is_off_grid:
            # Generator CO2: ~2.7 kg CO2 per liter diesel
            co2_per_kwh = diesel_per_kwh * 2.7  # ~0.95 kg CO2/kWh from generator
        else:
            co2_per_kwh = 0.5  # kg CO2 per kWh (Turkey grid average)
        yearly_co2_saved = yearly_production * co2_per_kwh
        trees_equivalent = yearly_co2_saved / 22  # 1 tree absorbs ~22kg CO2/year
        
        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=MARGIN_TOP,
            bottomMargin=MARGIN_BOTTOM,
            leftMargin=MARGIN_LEFT,
            rightMargin=MARGIN_RIGHT
        )
        
        elements = []
        
        # Title
        category_name = quote_data.get('customer_category_name', 'Solar')
        elements.append(Paragraph(f"<b>{category_name} Sistem Analizi</b>", self.styles['QuoteTitle']))
        elements.append(Spacer(1, 15))
        
        # System capacity summary box
        summary_style = ParagraphStyle('SummaryText', parent=self.styles['Notes'], fontSize=10, leading=14)
        
        # Create capacity cards
        capacity_data = []
        
        if panel_kw > 0:
            capacity_data.append([
                self._create_capacity_card("☀️ PANEL GÜCÜ", f"{panel_kw:.1f} kW", "#f59e0b"),
            ])
        if inverter_kw > 0:
            capacity_data.append([
                self._create_capacity_card("⚡ İNVERTER", f"{inverter_kw:.1f} kW", "#3b82f6"),
            ])
        if battery_kwh > 0:
            capacity_data.append([
                self._create_capacity_card("🔋 BATARYA", f"{battery_kwh:.1f} kWh", "#10b981"),
            ])
        
        if capacity_data:
            # Horizontal layout for capacity cards
            card_row = []
            if panel_kw > 0:
                card_row.append(self._create_capacity_card("PANEL GÜCÜ", f"{panel_kw:.1f} kW", "#f59e0b"))
            if inverter_kw > 0:
                card_row.append(self._create_capacity_card("İNVERTER", f"{inverter_kw:.1f} kW", "#3b82f6"))
            if battery_kwh > 0:
                card_row.append(self._create_capacity_card("BATARYA", f"{battery_kwh:.1f} kWh", "#10b981"))
            
            num_cards = len(card_row)
            card_width = CONTENT_WIDTH / num_cards if num_cards > 0 else CONTENT_WIDTH
            
            capacity_table = Table([card_row], colWidths=[card_width] * num_cards)
            capacity_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ]))
            elements.append(capacity_table)
            elements.append(Spacer(1, 20))
        
        # Production estimates section
        elements.append(Paragraph("<b>TAHMİNİ ÜRETİM DEĞERLERİ</b>", self.styles['SectionTitle']))
        elements.append(Spacer(1, 10))
        
        # Hourly production = panel power (kW)
        hourly_production = panel_kw
        
        production_data = [
            [f"Saatlik Üretim (Panel Gücü: {panel_kw:.1f} kW)", f"{hourly_production:.1f} kWh"],
            ["Günlük Ortalama Üretim", f"{daily_production:.1f} kWh"],
            ["Aylık Ortalama Üretim", f"{monthly_production:.0f} kWh"],
            ["Yıllık Tahmini Üretim", f"{yearly_production:.0f} kWh"],
        ]
        
        prod_table = Table(production_data, colWidths=[CONTENT_WIDTH * 0.6, CONTENT_WIDTH * 0.4])
        prod_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), HEADER_BG),
            ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('FONTNAME', (0, 0), (0, -1), FONT_NORMAL),
            ('FONTNAME', (1, 0), (1, -1), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('RIGHTPADDING', (1, 0), (1, -1), 10),
        ]))
        elements.append(prod_table)
        
        # Production info note
        prod_note = Paragraph(
            "<i>• Üretim değerleri şehir bazlı ortalama güneşlenme verilerine göre hesaplanmıştır.<br/>"
            "• Gerçek üretim değerleri kurulum açısı, yönü ve gölgelenme durumuna göre değişebilir.</i>",
            ParagraphStyle('InfoNote', parent=self.styles['Notes'], fontSize=7, textColor=colors.HexColor('#64748b'), leading=10)
        )
        elements.append(Spacer(1, 5))
        elements.append(prod_note)
        elements.append(Spacer(1, 15))
        
        # Financial savings section
        elements.append(Paragraph(f"<b>TAHMİNİ TASARRUF ({savings_label})</b>", self.styles['SectionTitle']))
        elements.append(Spacer(1, 10))
        
        savings_data = [
            ["Yıllık Tahmini Tasarruf", f"₺{yearly_savings:,.0f}".replace(',', '.')],
            ["3 Yıllık Tahmini Tasarruf", f"₺{yearly_savings * 3:,.0f}".replace(',', '.')],
            ["5 Yıllık Tahmini Tasarruf", f"₺{yearly_savings * 5:,.0f}".replace(',', '.')],
        ]
        
        savings_table = Table(savings_data, colWidths=[CONTENT_WIDTH * 0.6, CONTENT_WIDTH * 0.4])
        savings_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ecfdf5')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#10b981')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#10b981')),
            ('FONTNAME', (0, 0), (0, -1), FONT_NORMAL),
            ('FONTNAME', (1, 0), (1, -1), FONT_BOLD),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#059669')),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('RIGHTPADDING', (1, 0), (1, -1), 10),
        ]))
        elements.append(savings_table)
        
        # Savings info note
        savings_note = Paragraph(
            "<i>• Tasarruf hesaplamaları güncel elektrik tarifelerine göre yapılmıştır.<br/>"
            "• Elektrik fiyatlarındaki artışlar tasarruf miktarını olumlu etkileyecektir.</i>",
            ParagraphStyle('InfoNote', parent=self.styles['Notes'], fontSize=7, textColor=colors.HexColor('#64748b'), leading=10)
        )
        elements.append(Spacer(1, 5))
        elements.append(savings_note)
        elements.append(Spacer(1, 15))
        
        # Environmental impact section
        elements.append(Paragraph("<b>ÇEVRESEL ETKİ</b>", self.styles['SectionTitle']))
        elements.append(Spacer(1, 10))
        
        env_data = [
            ["Yıllık CO₂ Tasarrufu", f"{yearly_co2_saved:.0f} kg"],
            ["Ağaç Eşdeğeri", f"{trees_equivalent:.0f} ağaç/yıl"],
        ]
        
        env_table = Table(env_data, colWidths=[CONTENT_WIDTH * 0.6, CONTENT_WIDTH * 0.4])
        env_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdf4')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#22c55e')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#22c55e')),
            ('FONTNAME', (0, 0), (0, -1), FONT_NORMAL),
            ('FONTNAME', (1, 0), (1, -1), FONT_BOLD),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#16a34a')),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('RIGHTPADDING', (1, 0), (1, -1), 10),
        ]))
        elements.append(env_table)
        
        # Environmental info note
        env_note = Paragraph(
            "<i>• CO₂ tasarrufu Türkiye şebeke emisyon faktörüne göre hesaplanmıştır.<br/>"
            "• Bir ağaç yılda ortalama 22 kg CO₂ absorbe etmektedir.</i>",
            ParagraphStyle('InfoNote', parent=self.styles['Notes'], fontSize=7, textColor=colors.HexColor('#64748b'), leading=10)
        )
        elements.append(Spacer(1, 5))
        elements.append(env_note)
        elements.append(Spacer(1, 20))
        
        # Auto-generated explanation text
        explanation_parts = []
        
        if panel_kw > 0:
            explanation_parts.append(
                f"Bu sistem {panel_kw:.1f} kW panel gücü ile günde ortalama {daily_production:.1f} kWh, "
                f"yılda yaklaşık {yearly_production:.0f} kWh enerji üretebilir."
            )
        
        if battery_kwh > 0:
            explanation_parts.append(
                f"{battery_kwh:.1f} kWh batarya kapasitesi ile gece kullanımınızı veya "
                f"şebeke kesintilerinde ihtiyacınızı karşılayabilirsiniz."
            )
        
        if inverter_kw > 0:
            explanation_parts.append(
                f"{inverter_kw:.1f} kW inverter ile aynı anda {inverter_kw * 1000:.0f}W'a kadar "
                f"cihaz çalıştırabilirsiniz."
            )
        
        if explanation_parts:
            elements.append(Paragraph("<b>SİSTEM AÇIKLAMASI</b>", self.styles['SectionTitle']))
            elements.append(Spacer(1, 8))
            explanation_text = " ".join(explanation_parts)
            elements.append(Paragraph(explanation_text, self.styles['Notes']))
        
        # Disclaimer
        elements.append(Spacer(1, 20))
        disclaimer = Paragraph(
            "<i>* Hesaplamalar Türkiye ortalaması güneşlenme süreleri ve mevcut elektrik tarifeleri "
            "baz alınarak yapılmıştır. Gerçek değerler bölgeye, mevsime ve kullanım alışkanlıklarına "
            "göre farklılık gösterebilir.</i>",
            ParagraphStyle('Disclaimer', parent=self.styles['Notes'], fontSize=7, textColor=colors.gray)
        )
        elements.append(disclaimer)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def _create_capacity_card(self, title: str, value: str, color: str):
        """Create a capacity info card"""
        card_color = colors.HexColor(color)
        
        card_data = [
            [Paragraph(f"<b>{title}</b>", ParagraphStyle('CardTitle', fontSize=9, fontName=FONT_BOLD, textColor=colors.white, alignment=TA_CENTER))],
            [Paragraph(f"<b>{value}</b>", ParagraphStyle('CardValue', fontSize=16, fontName=FONT_BOLD, textColor=card_color, alignment=TA_CENTER))],
        ]
        
        card = Table(card_data, colWidths=[55 * mm])
        card.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), card_color),
            ('BACKGROUND', (0, 1), (0, 1), colors.white),
            ('BOX', (0, 0), (-1, -1), 2, card_color),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        return card
    
    def _create_contract_page(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """Create contract terms page if contract_terms exists"""
        
        contract_terms = company_settings.get('contract_terms', '')
        if not contract_terms or not contract_terms.strip():
            return None
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=MARGIN_TOP,
            bottomMargin=MARGIN_BOTTOM,
            leftMargin=MARGIN_LEFT,
            rightMargin=MARGIN_RIGHT
        )
        
        elements = []
        
        # Company logo at top
        logo_path = company_settings.get('logo')
        if logo_path:
            full_logo_path = self.upload_dir / logo_path.replace('/uploads/', '').replace('uploads/', '')
            if full_logo_path.exists():
                try:
                    img = Image(str(full_logo_path), width=40, height=30)
                    img.hAlign = 'LEFT'
                    elements.append(img)
                    elements.append(Spacer(1, 10))
                except Exception as e:
                    logger.warning(f"Could not load logo: {e}")
        
        # Contract title
        elements.append(Paragraph("SÖZLEŞME KOŞULLARI", self.styles['ContractTitle']))
        elements.append(Spacer(1, 10))
        
        # Split contract text by lines and add as paragraphs
        lines = contract_terms.split('\n')
        for line in lines:
            if line.strip():
                elements.append(Paragraph(line, self.styles['ContractText']))
            else:
                elements.append(Spacer(1, 6))
        
        # Add quote reference at bottom
        elements.append(Spacer(1, 30))
        quote_number = quote_data.get('quote_number', '')
        quote_date = quote_data.get('created_at', '')
        if quote_date:
            try:
                if isinstance(quote_date, str):
                    dt = datetime.fromisoformat(quote_date.replace('Z', '+00:00'))
                else:
                    dt = quote_date
                formatted_date = dt.strftime('%d.%m.%Y')
            except:
                formatted_date = str(quote_date)[:10]
        else:
            formatted_date = datetime.now().strftime('%d.%m.%Y')
        
        ref_text = f"<b>Teklif No:</b> {quote_number} &nbsp;&nbsp;&nbsp; <b>Tarih:</b> {formatted_date}"
        elements.append(Paragraph(ref_text, self.styles['Notes']))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def _create_header(self, quote_data: dict, company_settings: dict):
        """Create header with company | vertical divider | customer"""
        
        # Company info (left side, smaller)
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
        
        # Customer info (right side, bigger and more prominent - NO "MÜŞTERİ" label)
        customer_name = quote_data.get('customer_name', '-')
        customer_phone = quote_data.get('customer_phone', '')
        customer_city = quote_data.get('customer_city', '')
        customer_district = quote_data.get('customer_district', '')
        
        customer_lines = [Paragraph(f"<b>{customer_name}</b>", self.styles['CustomerName'])]
        
        # Location (il/ilçe)
        location_parts = []
        if customer_district:
            location_parts.append(customer_district)
        if customer_city:
            location_parts.append(customer_city)
        if location_parts:
            customer_lines.append(Paragraph(' / '.join(location_parts), self.styles['CustomerInfo']))
        
        # Phone
        if customer_phone:
            customer_lines.append(Paragraph(f"Tel: {customer_phone}", self.styles['CustomerInfo']))
        
        # Create 3-column layout: Company | Divider | Customer
        # Divider is a thin column with vertical line
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
            # Vertical line in middle column
            ('LINEAFTER', (0, 0), (0, 0), 1.5, PRIMARY_COLOR),
            ('LEFTPADDING', (2, 0), (2, 0), 10),
        ]))
        
        return header_table
    
    def _create_info_bar(self, quote_data: dict):
        """Create quote information bar"""
        
        quote_number = quote_data.get('quote_number', '-')
        quote_date = quote_data.get('created_at', '')
        validity = quote_data.get('validity_days', 15)
        
        if quote_date:
            try:
                if isinstance(quote_date, str):
                    dt = datetime.fromisoformat(quote_date.replace('Z', '+00:00'))
                else:
                    dt = quote_date
                formatted_date = dt.strftime('%d.%m.%Y')
            except:
                formatted_date = str(quote_date)[:10]
        else:
            formatted_date = datetime.now().strftime('%d.%m.%Y')
        
        info_data = [[
            Paragraph(f"<b>Teklif No:</b> {quote_number}", self.styles['TableCell']),
            Paragraph(f"<b>Tarih:</b> {formatted_date}", self.styles['TableCell']),
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
        """Create products table with 5 columns: Miktar | Birim | Ürün Açıklaması | Birim Fiyat | Toplam Fiyat"""
        
        # Header row - 5 columns
        header = [
            Paragraph("<b>Miktar</b>", self.styles['TableHeader']),
            Paragraph("<b>Birim</b>", self.styles['TableHeader']),
            Paragraph("<b>Ürün Açıklaması</b>", self.styles['TableHeader']),
            Paragraph("<b>Birim Fiyat</b>", self.styles['TableHeader']),
            Paragraph("<b>Toplam Fiyat</b>", self.styles['TableHeader']),
        ]
        
        table_data = [header]
        
        # Product rows
        for item in items:
            product_name = item.get('product_name', '-')
            quantity = item.get('quantity', 0)
            unit = item.get('unit', 'Adet')
            unit_price = item.get('unit_price_tl', 0)
            total_price = item.get('total_price_tl', 0)
            
            row = [
                Paragraph(str(quantity), self.styles['TableCellCenter']),
                Paragraph(unit, self.styles['TableCellCenter']),
                Paragraph(product_name, self.styles['TableCell']),  # Long names will wrap
                Paragraph(format_currency(unit_price), self.styles['TableCellRight']),
                Paragraph(format_currency(total_price), self.styles['TableCellRight']),
            ]
            table_data.append(row)
        
        # Create table with 5 columns
        table = Table(table_data, colWidths=[COL_MIKTAR, COL_BIRIM, COL_URUN, COL_BIRIM_FIYAT, COL_TOPLAM_FIYAT])
        
        style = TableStyle([
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            
            # General styling
            ('FONTNAME', (0, 1), (-1, -1), FONT_NORMAL),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            
            # Borders
            ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            
            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HEADER_BG]),
            
            # Align columns
            ('ALIGN', (0, 0), (1, -1), 'CENTER'),  # Miktar and Birim centered
            ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),  # Prices right aligned
        ])
        
        table.setStyle(style)
        return table
    
    def _create_totals_table(self, quote_data: dict):
        """Create totals section with smaller fonts and ₺ symbol"""
        
        subtotal = quote_data.get('subtotal_tl', 0)
        discount = quote_data.get('discount_amount_tl', 0)
        discount_rate = quote_data.get('discount_rate', 0)
        vat = quote_data.get('vat_amount_tl', 0)
        total = quote_data.get('total_tl', 0)
        vat_rate = quote_data.get('vat_rate', 20)
        
        # Styles for totals - using simple text instead of Paragraph for no wrapping
        rows = []
        
        rows.append([
            "Ara Toplam:",
            format_currency(subtotal)
        ])
        
        if discount > 0:
            discount_label = f"İndirim (%{int(discount_rate)}):" if discount_rate > 0 else "İndirim:"
            rows.append([
                discount_label,
                f"-{format_currency(discount)}"
            ])
        
        rows.append([
            f"KDV (%{int(vat_rate)}):",
            format_currency(vat)
        ])
        
        rows.append([
            "GENEL TOPLAM:",
            format_currency(total)
        ])
        
        # Wide columns to prevent wrapping
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
        """Create bank accounts table for PDF"""
        
        # Header
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
        
        # Column widths: Banka 20%, Şube 15%, Hesap Sahibi 25%, IBAN 40%
        col_widths = [0.20 * CONTENT_WIDTH, 0.15 * CONTENT_WIDTH, 0.25 * CONTENT_WIDTH, 0.40 * CONTENT_WIDTH]
        
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            
            # General styling
            ('FONTNAME', (0, 1), (-1, -1), FONT_NORMAL),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            
            # Borders
            ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            
            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HEADER_BG]),
        ]))
        
        return table
    
    def _collect_datasheets(self, items: list) -> list:
        """Collect datasheet PDFs from items in order"""
        
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
        """Merge multiple PDF buffers into one"""
        
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


def generate_quote_pdf(quote_data: dict, company_settings: dict, upload_dir: str) -> BytesIO:
    """Main function to generate a quote PDF"""
    generator = QuotePDFGenerator(upload_dir)
    return generator.generate(quote_data, company_settings)
