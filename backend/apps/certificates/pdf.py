"""Certificate PDF (A4 landscape) with a QR code that opens the public verification page."""
from datetime import date
from io import BytesIO
from urllib.parse import quote

from django.conf import settings
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

NAVY, BLUE, GOLD, INK, MUTED = HexColor('#0b1530'), HexColor('#0b5cf0'), HexColor('#c9962b'), HexColor('#0b1220'), HexColor('#5c6c81')


def verify_url(code):
    return f'{settings.SITE_URL}/certificates/verify/?id={quote(code)}'


def _fit(c, text, font, size, max_width, min_size=14):
    while size > min_size and c.stringWidth(text, font, size) > max_width:
        size -= 1
    return size


def _long_date(value):
    return f'{value.day} {value.strftime("%B %Y")}'


def render_certificate(*, recipient_name, course_name, completed_on, issued_on, code, sample=False):
    buffer = BytesIO()
    width, height = landscape(A4)
    c = canvas.Canvas(buffer, pagesize=(width, height))
    c.setTitle(f'{"SAMPLE " if sample else ""}Certificate {code}')
    c.setAuthor('Coding Hubs School of AI')

    # Frame: navy outer band, thin gold rule inside.
    c.setFillColor(HexColor('#f7f9fd'))
    c.rect(0, 0, width, height, stroke=0, fill=1)
    c.setStrokeColor(NAVY)
    c.setLineWidth(14)
    c.rect(18, 18, width - 36, height - 36, stroke=1, fill=0)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.2)
    c.rect(36, 36, width - 72, height - 72, stroke=1, fill=0)
    c.setFillColor(BLUE)
    c.rect(36, height - 44, width - 72, 8, stroke=0, fill=1)

    cx = width / 2
    c.setFillColor(NAVY)
    c.setFont('Helvetica-Bold', 22)
    c.drawCentredString(cx, height - 92, 'CODING HUBS')
    c.setFont('Helvetica', 11)
    c.setFillColor(MUTED)
    c.drawCentredString(cx, height - 108, 'SCHOOL OF AI  ·  NEW DELHI')

    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 30)
    c.drawCentredString(cx, height - 160, 'Certificate of Completion')
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(cx - 90, height - 174, cx + 90, height - 174)

    c.setFont('Helvetica', 13)
    c.setFillColor(MUTED)
    c.drawCentredString(cx, height - 205, 'This is to certify that')
    size = _fit(c, recipient_name, 'Helvetica-Bold', 34, width - 220)
    c.setFont('Helvetica-Bold', size)
    c.setFillColor(NAVY)
    c.drawCentredString(cx, height - 248, recipient_name)
    c.setFont('Helvetica', 13)
    c.setFillColor(MUTED)
    c.drawCentredString(cx, height - 280, 'has successfully completed the course')
    size = _fit(c, course_name, 'Helvetica-Bold', 22, width - 220)
    c.setFont('Helvetica-Bold', size)
    c.setFillColor(BLUE)
    c.drawCentredString(cx, height - 312, course_name)
    c.setFont('Helvetica', 12)
    c.setFillColor(MUTED)
    c.drawCentredString(cx, height - 338, f'Completed on {_long_date(completed_on)}')

    # Footer: issue details on the left, QR on the right.
    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 11)
    c.drawString(70, 112, 'Certificate ID')
    c.setFont('Courier-Bold', 13)
    c.drawString(70, 95, code)
    c.setFont('Helvetica', 10)
    c.setFillColor(MUTED)
    c.drawString(70, 76, f'Issued on {_long_date(issued_on)}')
    c.drawString(70, 61, f'Verify at {settings.SITE_URL.removeprefix("https://")}/certificates/verify/')

    c.setStrokeColor(MUTED)
    c.setLineWidth(.6)
    c.line(cx - 90, 92, cx + 90, 92)
    c.setFont('Helvetica', 10)
    c.drawCentredString(cx, 78, 'Coding Hubs School of AI')
    c.drawCentredString(cx, 64, 'Academic office')

    qr = QrCodeWidget(verify_url(code))
    x0, y0, x1, y1 = qr.getBounds()
    box = 92
    drawing = Drawing(box, box, transform=[box / (x1 - x0), 0, 0, box / (y1 - y0), 0, 0])
    drawing.add(qr)
    renderPDF.draw(drawing, c, width - 70 - box, 54)
    c.setFont('Helvetica', 8)
    c.drawCentredString(width - 70 - box / 2, 44, 'Scan to verify')

    if sample:
        c.saveState()
        c.setFillColor(HexColor('#d0182f'))
        c.setFillAlpha(.16)
        c.setFont('Helvetica-Bold', 150)
        c.translate(cx, height / 2)
        c.rotate(24)
        c.drawCentredString(0, -50, 'SAMPLE')
        c.restoreState()
        c.setFont('Helvetica-Bold', 10)
        c.setFillColor(HexColor('#d0182f'))
        c.drawCentredString(cx, 46, 'SAMPLE - NOT A VALID CERTIFICATE')

    c.showPage()
    c.save()
    return buffer.getvalue()


def certificate_pdf(certificate):
    return render_certificate(recipient_name=certificate.recipient_name, course_name=certificate.course_name,
                              completed_on=certificate.completed_on, issued_on=certificate.issued_on, code=certificate.code)


def sample_pdf():
    return render_certificate(recipient_name='Your Name', course_name='Generative AI & Machine Learning',
                              completed_on=date(2026, 1, 31), issued_on=date(2026, 2, 7), code='CH-SAMP-LE00-0000', sample=True)
