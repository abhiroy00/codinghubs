import shutil
import subprocess
import tempfile
from pathlib import Path
from django.db import transaction
from pypdf import PdfReader
from pypdf import __version__ as parser_version
from .models import ReferenceDocument, ReferencePage


def extract_document(pk, ocr=False):
    # Compare-and-swap claims a queued/failed job once, including across workers.
    if not ReferenceDocument.objects.filter(pk=pk, status__in=['QUEUED', 'FAILED', 'OCR_REQUIRED']).update(status='PROCESSING', error=''):
        return ReferenceDocument.objects.get(pk=pk).status
    doc = ReferenceDocument.objects.get(pk=pk)
    try:
        reader = PdfReader(doc.file.path)
        if reader.is_encrypted:
            raise ValueError('Encrypted PDFs require an unlocked reference copy.')
        if len(reader.pages) > 500:
            raise ValueError('Split references into files of at most 500 pages.')
        metadata = {str(k): str(v)[:2000] for k, v in (reader.metadata or {}).items()}
        metadata['_extractor'] = f'pypdf {parser_version}; text extraction; OCR optional; visual review required'
        outline = []

        def collect(items):
            for item in items:
                if isinstance(item, list):
                    collect(item)
                else:
                    try:
                        outline.append({'title': str(item.title), 'page': reader.get_destination_page_number(item) + 1})
                    except (AttributeError, ValueError, TypeError):
                        continue
        collect(reader.outline)
        pages, needs_ocr = [], False
        for number, page in enumerate(reader.pages, 1):
            stream = page.get_contents()
            if stream and len(stream.get_data()) > 5 * 1024 * 1024:
                raise ValueError(f'Page {number} content stream exceeds the 5 MB extraction limit.')
            text = (page.extract_text() or '').strip()
            notes = 'Text extraction only. Equations, code formatting and figures need visual review.'
            status = 'NEEDS_REVIEW'
            if len(text) < 40:
                if ocr and shutil.which('pdftoppm') and shutil.which('tesseract'):
                    with tempfile.TemporaryDirectory(prefix='learning-ocr-') as temp:
                        prefix = str(Path(temp) / 'page')
                        subprocess.run(['pdftoppm', '-f', str(number), '-l', str(number), '-r', '150', '-scale-to', '2000', '-singlefile', '-png', doc.file.path, prefix], check=True, timeout=30, capture_output=True)
                        result = subprocess.run(['tesseract', prefix + '.png', 'stdout'], check=True, timeout=30, capture_output=True, text=True)
                        text = result.stdout.strip()
                        notes += ' OCR performed with Tesseract; output accuracy has not been reviewed.'
                        status = 'OCR_NEEDS_REVIEW'
                        if len(text) < 40:
                            status, needs_ocr = 'OCR_REQUIRED', True
                else:
                    status, needs_ocr = 'OCR_REQUIRED', True
                    notes += ' Low-text page: install OCR tools and rerun with --ocr, then inspect the original page.'
            if len(text) > 200000:
                raise ValueError(f'Page {number} exceeds the text limit; extraction was not saved as complete.')
            pages.append(ReferencePage(document=doc, number=number, text=text, status=status, notes=notes))
        with transaction.atomic():
            doc.pages.all().delete()
            ReferencePage.objects.bulk_create(pages)
            doc.page_count = len(pages)
            doc.metadata, doc.toc = metadata, outline
            doc.author = metadata.get('/Author', '')[:250]
            doc.status = 'OCR_REQUIRED' if needs_ocr else 'EXTRACTED_NEEDS_REVIEW'
            doc.save(update_fields=['page_count', 'metadata', 'toc', 'author', 'status'])
        return doc.status
    except Exception as error:
        # No partial text is represented as successful; error contains no source text.
        ReferenceDocument.objects.filter(pk=pk).update(status='FAILED', error=f'{type(error).__name__}: {str(error)[:500]}')
        return 'FAILED'
