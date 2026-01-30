"""
Solar Energy Sales System - Professional PDF Quote Generator
A4 format with fixed margins and proper page handling
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from PyPDF2 import PdfReader, PdfWriter
from io import BytesIO
from pathlib import Path
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

# A4 Page Settings
PAGE_WIDTH, PAGE_HEIGHT = A4  # 210mm x 297mm
MARGIN_TOP = 20 * mm
MARGIN_BOTTOM = 20 * mm
MARGIN_LEFT = 15 * mm
MARGIN_RIGHT = 15 * mm

# Content area dimensions
CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT  # ~180mm
CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM

# Column widths for product table (percentages of content width)
COL_PRODUCT = 0.40 * CONTENT_WIDTH  # Product Name: 40%
COL_QTY = 0.10 * CONTENT_WIDTH       # Quantity: 10%
COL_UNIT = 0.15 * CONTENT_WIDTH      # Unit Price: 15%
COL_SUBTOTAL = 0.15 * CONTENT_WIDTH  # Subtotal: 15%
COL_DESC = 0.20 * CONTENT_WIDTH      # Description: 20%

# Colors
PRIMARY_COLOR = colors.HexColor('#f59e0b')  # Amber/Orange
HEADER_BG = colors.HexColor('#f8fafc')
BORDER_COLOR = colors.HexColor('#e2e8f0')
TEXT_COLOR = colors.HexColor('#1e293b')


def format_currency(value, currency='TRY'):
    """Format number as Turkish currency"""
    if currency == 'TRY':
        return f"₺{value:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    return f"${value:,.2f}"


def create_styles():
    """Create custom paragraph styles"""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='CompanyName',
        fontSize=16,
        fontName='Helvetica-Bold',
        textColor=TEXT_COLOR,
        leading=20,
    ))
    
    styles.add(ParagraphStyle(
        name='CompanyInfo',
        fontSize=9,
        fontName='Helvetica',
        textColor=TEXT_COLOR,
        leading=12,
    ))
    
    styles.add(ParagraphStyle(
        name='SectionTitle',
        fontSize=12,
        fontName='Helvetica-Bold',
        textColor=TEXT_COLOR,
        spaceBefore=10,
        spaceAfter=5,
    ))
    
    styles.add(ParagraphStyle(
        name='TableCell',
        fontSize=9,
        fontName='Helvetica',
        textColor=TEXT_COLOR,
        leading=12,
    ))
    
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontSize=9,
        fontName='Helvetica-Bold',
        textColor=TEXT_COLOR,
        leading=12,
    ))
    
    styles.add(ParagraphStyle(
        name='TotalLabel',
        fontSize=10,
        fontName='Helvetica',
        textColor=TEXT_COLOR,
        alignment=TA_RIGHT,
    ))
    
    styles.add(ParagraphStyle(
        name='TotalValue',
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=TEXT_COLOR,
        alignment=TA_RIGHT,
    ))
    
    styles.add(ParagraphStyle(
        name='GrandTotal',
        fontSize=14,
        fontName='Helvetica-Bold',
        textColor=PRIMARY_COLOR,
        alignment=TA_RIGHT,
    ))
    
    styles.add(ParagraphStyle(
        name='Notes',
        fontSize=9,
        fontName='Helvetica',
        textColor=TEXT_COLOR,
        leading=12,
    ))
    
    styles.add(ParagraphStyle(
        name='CoverTitle',
        fontSize=28,
        fontName='Helvetica-Bold',
        textColor=TEXT_COLOR,
        alignment=TA_CENTER,
        leading=34,
    ))
    
    styles.add(ParagraphStyle(
        name='CoverSubtitle',
        fontSize=14,
        fontName='Helvetica',
        textColor=TEXT_COLOR,
        alignment=TA_CENTER,
        leading=18,
    ))
    
    return styles


class QuotePDFGenerator:
    """Generate professional A4 PDF quotes"""
    
    def __init__(self, upload_dir: str):
        self.upload_dir = Path(upload_dir)
        self.styles = create_styles()
    
    def generate(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """
        Generate complete PDF with cover, quote details, and datasheets
        
        Args:
            quote_data: Quote information including items, customer, totals
            company_settings: Company information and logo path
        
        Returns:
            BytesIO buffer containing the complete PDF
        """
        pdf_parts = []
        
        # Part 1: Cover page
        cover_pdf = self._create_cover_page(quote_data, company_settings)
        if cover_pdf:
            pdf_parts.append(cover_pdf)
        
        # Part 2: Quote details (main content)
        quote_pdf = self._create_quote_pages(quote_data, company_settings)
        pdf_parts.append(quote_pdf)
        
        # Part 3: Product datasheets
        datasheet_pdfs = self._collect_datasheets(quote_data.get('items', []))
        pdf_parts.extend(datasheet_pdfs)
        
        # Merge all PDFs
        return self._merge_pdfs(pdf_parts)
    
    def _create_cover_page(self, quote_data: dict, company_settings: dict) -> BytesIO:
        """Create cover page - either from uploaded PDF or auto-generated"""
        
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
        
        # Check for uploaded cover image (jpg, png, jpeg)
        cover_image_path = company_settings.get('quote_cover_image') or quote_data.get('cover_image_path')
        
        # Auto-generate cover page
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # If cover image exists, use it as background
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
        
        # Generate text-based cover
        # Background
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
        c.setFont('Helvetica-Bold', 18)
        company_name = company_settings.get('company_name', 'Solar Enerji')
        c.drawString(MARGIN_LEFT + 70, PAGE_HEIGHT - 50, company_name)
        
        # Main title area (center of page)
        y_center = PAGE_HEIGHT / 2 + 50
        
        c.setFillColor(TEXT_COLOR)
        c.setFont('Helvetica-Bold', 36)
        c.drawCentredString(PAGE_WIDTH / 2, y_center, "TEKLİF")
        
        # Quote number
        c.setFont('Helvetica', 18)
        quote_number = quote_data.get('quote_number', '')
        c.drawCentredString(PAGE_WIDTH / 2, y_center - 40, f"No: {quote_number}")
        
        # Decorative line
        c.setStrokeColor(PRIMARY_COLOR)
        c.setLineWidth(3)
        c.line(PAGE_WIDTH/2 - 100, y_center - 60, PAGE_WIDTH/2 + 100, y_center - 60)
        
        # Customer name
        c.setFont('Helvetica-Bold', 16)
        customer_name = quote_data.get('customer_name', '')
        c.drawCentredString(PAGE_WIDTH / 2, y_center - 100, customer_name)
        
        # Date
        c.setFont('Helvetica', 12)
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
        
        # Bottom decorative bar
        c.setFillColor(PRIMARY_COLOR)
        c.rect(0, 0, PAGE_WIDTH, 40, fill=True)
        
        # Contact info in footer
        c.setFillColor(colors.white)
        c.setFont('Helvetica', 9)
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
        """Create main quote detail pages using Platypus for automatic page breaks"""
        
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
        
        # Header with company and customer info
        header_table = self._create_header(quote_data, company_settings)
        elements.append(header_table)
        elements.append(Spacer(1, 15))
        
        # Quote info bar
        info_bar = self._create_info_bar(quote_data)
        elements.append(info_bar)
        elements.append(Spacer(1, 15))
        
        # Products table
        elements.append(Paragraph("ÜRÜNLER", self.styles['SectionTitle']))
        elements.append(Spacer(1, 5))
        
        products_table = self._create_products_table(quote_data.get('items', []))
        elements.append(products_table)
        elements.append(Spacer(1, 15))
        
        # Totals section
        totals_table = self._create_totals_table(quote_data)
        elements.append(totals_table)
        elements.append(Spacer(1, 20))
        
        # Notes section
        customer_notes = quote_data.get('customer_notes', '')
        if customer_notes:
            elements.append(Paragraph("NOTLAR", self.styles['SectionTitle']))
            elements.append(Spacer(1, 5))
            notes_text = customer_notes.replace('\n', '<br/>')
            elements.append(Paragraph(notes_text, self.styles['Notes']))
            elements.append(Spacer(1, 15))
        
        # Warranty text
        warranty_text = company_settings.get('warranty_text', '')
        if warranty_text:
            elements.append(Paragraph("GARANTİ KOŞULLARI", self.styles['SectionTitle']))
            elements.append(Spacer(1, 5))
            elements.append(Paragraph(warranty_text, self.styles['Notes']))
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def _create_header(self, quote_data: dict, company_settings: dict):
        """Create header with company logo/info and customer info"""
        
        # Company column
        company_content = []
        
        # Logo
        logo_path = company_settings.get('logo')
        if logo_path:
            full_logo_path = self.upload_dir / logo_path.replace('/uploads/', '').replace('uploads/', '')
            if full_logo_path.exists():
                try:
                    img = Image(str(full_logo_path), width=50, height=40)
                    img.hAlign = 'LEFT'
                    company_content.append(img)
                except Exception as e:
                    logger.warning(f"Could not load logo in header: {e}")
        
        company_name = company_settings.get('company_name', 'Solar Enerji')
        company_content.append(Paragraph(f"<b>{company_name}</b>", self.styles['CompanyName']))
        
        company_info_parts = []
        if company_settings.get('address'):
            company_info_parts.append(company_settings['address'])
        if company_settings.get('phone'):
            company_info_parts.append(f"Tel: {company_settings['phone']}")
        if company_settings.get('email'):
            company_info_parts.append(f"E-posta: {company_settings['email']}")
        
        if company_info_parts:
            company_content.append(Paragraph("<br/>".join(company_info_parts), self.styles['CompanyInfo']))
        
        # Customer column
        customer_content = []
        customer_content.append(Paragraph("<b>MÜŞTERİ BİLGİLERİ</b>", self.styles['SectionTitle']))
        
        customer_name = quote_data.get('customer_name', '-')
        customer_content.append(Paragraph(f"<b>{customer_name}</b>", self.styles['CompanyInfo']))
        
        customer_info_parts = []
        if quote_data.get('customer_phone'):
            customer_info_parts.append(f"Tel: {quote_data['customer_phone']}")
        if quote_data.get('customer_email'):
            customer_info_parts.append(f"E-posta: {quote_data['customer_email']}")
        if quote_data.get('customer_address'):
            customer_info_parts.append(quote_data['customer_address'])
        
        if customer_info_parts:
            customer_content.append(Paragraph("<br/>".join(customer_info_parts), self.styles['CompanyInfo']))
        
        # Create two-column layout
        header_data = [[company_content, customer_content]]
        header_table = Table(header_data, colWidths=[CONTENT_WIDTH * 0.5, CONTENT_WIDTH * 0.5])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
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
        """Create products table with fixed column widths"""
        
        # Header row
        header = [
            Paragraph("<b>Ürün Adı</b>", self.styles['TableHeader']),
            Paragraph("<b>Adet</b>", self.styles['TableHeader']),
            Paragraph("<b>Birim Fiyat</b>", self.styles['TableHeader']),
            Paragraph("<b>Ara Toplam</b>", self.styles['TableHeader']),
            Paragraph("<b>Açıklama</b>", self.styles['TableHeader']),
        ]
        
        table_data = [header]
        
        # Product rows
        for item in items:
            product_name = item.get('product_name', '-')
            quantity = item.get('quantity', 0)
            unit = item.get('unit', 'adet')
            unit_price = item.get('unit_price_tl', 0)
            total_price = item.get('total_price_tl', 0)
            description = item.get('description', '')
            
            row = [
                Paragraph(product_name, self.styles['TableCell']),
                Paragraph(f"{quantity} {unit}", self.styles['TableCell']),
                Paragraph(format_currency(unit_price), self.styles['TableCell']),
                Paragraph(format_currency(total_price), self.styles['TableCell']),
                Paragraph(description or '-', self.styles['TableCell']),
            ]
            table_data.append(row)
        
        # Create table with fixed widths
        table = Table(table_data, colWidths=[COL_PRODUCT, COL_QTY, COL_UNIT, COL_SUBTOTAL, COL_DESC])
        
        # Style the table
        style = TableStyle([
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            
            # General styling
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            
            # Borders
            ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            
            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HEADER_BG]),
            
            # Right align numbers
            ('ALIGN', (1, 1), (3, -1), 'RIGHT'),
        ])
        
        table.setStyle(style)
        return table
    
    def _create_totals_table(self, quote_data: dict):
        """Create totals section aligned to the right"""
        
        subtotal = quote_data.get('subtotal_tl', 0)
        shipping = quote_data.get('shipping_cost', 0)
        discount = quote_data.get('discount_amount_tl', 0)
        vat = quote_data.get('vat_amount_tl', 0)
        total = quote_data.get('total_tl', 0)
        vat_rate = quote_data.get('vat_rate', 20)
        
        rows = []
        
        rows.append([
            Paragraph("Ara Toplam:", self.styles['TotalLabel']),
            Paragraph(format_currency(subtotal), self.styles['TotalValue'])
        ])
        
        if shipping > 0:
            rows.append([
                Paragraph("Nakliye & Montaj:", self.styles['TotalLabel']),
                Paragraph(format_currency(shipping), self.styles['TotalValue'])
            ])
        
        if discount > 0:
            rows.append([
                Paragraph("İskonto:", self.styles['TotalLabel']),
                Paragraph(f"-{format_currency(discount)}", self.styles['TotalValue'])
            ])
        
        rows.append([
            Paragraph(f"KDV (%{vat_rate}):", self.styles['TotalLabel']),
            Paragraph(format_currency(vat), self.styles['TotalValue'])
        ])
        
        rows.append([
            Paragraph("<b>GENEL TOPLAM:</b>", self.styles['GrandTotal']),
            Paragraph(f"<b>{format_currency(total)}</b>", self.styles['GrandTotal'])
        ])
        
        # Create table aligned to right
        totals_data = [[Spacer(1, 1), rows]]
        
        inner_table = Table(rows, colWidths=[80, 100])
        inner_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LINEABOVE', (0, -1), (-1, -1), 2, PRIMARY_COLOR),
            ('TOPPADDING', (0, -1), (-1, -1), 8),
        ]))
        
        # Wrap in outer table for right alignment
        wrapper_data = [['', inner_table]]
        wrapper = Table(wrapper_data, colWidths=[CONTENT_WIDTH - 200, 200])
        wrapper.setStyle(TableStyle([
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        return wrapper
    
    def _collect_datasheets(self, items: list) -> list:
        """Collect datasheet PDFs from items in order"""
        
        datasheets = []
        
        for item in items:
            datasheet_url = item.get('datasheet_url')
            if not datasheet_url:
                continue
            
            # Extract filename from URL
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
    """
    Main function to generate a quote PDF
    
    Args:
        quote_data: Complete quote data with items, customer info, totals
        company_settings: Company information including logo path
        upload_dir: Path to the uploads directory
    
    Returns:
        BytesIO buffer containing the complete PDF
    """
    generator = QuotePDFGenerator(upload_dir)
    return generator.generate(quote_data, company_settings)
