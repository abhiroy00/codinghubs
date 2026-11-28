import csv
import hashlib
import io
import json
import math
import time
import zipfile
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlsplit

from openpyxl import load_workbook
from sqlalchemy import select

from .models import Evidence, ImportBatch, ImportSet, Metric

MAX_UPLOAD = 5_000_000
MAX_ROWS = 20000
DIMENSIONS = {'Date': 'chart', 'Country': 'country', 'Device': 'device', 'Top pages': 'page',
              'Top queries': 'query', 'Search Appearance': 'appearance', 'Search appearance': 'appearance', 'Filter': 'filters'}


def read_table(filename, content):
    if len(content) > MAX_UPLOAD:
        raise ValueError('Each file is limited to 5 MB')
    suffix = Path(filename).suffix.lower()
    if suffix == '.csv':
        decoded = content.decode('utf-16') if content.startswith((b'\xff\xfe', b'\xfe\xff')) else content.decode('utf-8-sig')
        lines = decoded.splitlines()
        first_line = lines[0] if lines else ''
        delimiter = '\t' if '\t' in first_line or any(line.lower().startswith('keyword\t') for line in lines[:5]) else ','
        rows = list(csv.reader(io.StringIO(decoded), delimiter=delimiter))
        if rows and rows[0] and rows[0][0].startswith('Category:'):
            rows = rows[next((i for i, row in enumerate(rows) if len(row) > 1), len(rows)):]
        elif rows and rows[0] and rows[0][0].startswith('Keyword Stats'):
            rows = rows[next((i for i, row in enumerate(rows) if row and row[0].lower() == 'keyword'), len(rows)):]
    elif suffix == '.xlsx':
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            members = archive.infolist()
            if len(members) > 1000 or sum(m.file_size for m in members) > 25_000_000:
                raise ValueError('Expanded workbook exceeds the safe import size')
            if any('externalLinks/' in m.filename for m in members):
                raise ValueError('External workbook links are not supported')
        book = load_workbook(io.BytesIO(content), read_only=True, data_only=True, keep_links=False)
        sheet = book.active
        rows = []
        for cells in sheet.iter_rows(max_row=MAX_ROWS + 2, max_col=31):
            values = []
            for cell in cells:
                value = cell.value
                if isinstance(value, datetime):
                    value = value.date().isoformat()
                elif isinstance(value, (float, int)) and '%' in cell.number_format:
                    value = f'{value * 100}%'
                values.append('' if value is None else str(value))
            while values and values[-1] == '':
                values.pop()
            if values:
                rows.append(values)
        book.close()
    else:
        raise ValueError('Use CSV or XLSX files; macros and executable formats are not accepted')
    if not rows or len(rows) - 1 > MAX_ROWS or len(rows[0]) > 30:
        raise ValueError('The table is empty or exceeds 20,000 rows / 30 columns')
    headers = [str(value).strip() for value in rows[0]]
    if len(headers) != len(set(headers)) or any(not value or len(value) > 100 for value in headers):
        raise ValueError('Column names must be unique, nonempty and under 100 characters')
    output = []
    for row in rows[1:]:
        if not any(row):
            continue
        if len(row) != len(headers):
            raise ValueError('A table row has a different number of cells than its header')
        if any(len(str(value)) > 4000 for value in row):
            raise ValueError('A cell exceeds the 4,000-character input limit')
        output.append(dict(zip(headers, (str(value).strip() for value in row))))
    return headers, output


def parse_gsc(filename, content, base_url):
    headers, rows = read_table(filename, content)
    dimension = DIMENSIONS.get(headers[0])
    if not dimension:
        raise ValueError('This is not a recognized Search Console dimension export')
    expected = ['Filter', 'Value'] if dimension == 'filters' else [headers[0], 'Clicks', 'Impressions', 'CTR', 'Position']
    if headers != expected:
        raise ValueError('Search Console columns must match the original export')
    if len({r[headers[0]] for r in rows}) != len(rows):
        raise ValueError('Duplicate dimension keys require a dated, joined import rather than a flat snapshot')
    metrics = []
    for index, row in enumerate(rows):
        key = row[headers[0]]
        if len(key) > 4000:
            raise ValueError('Dimension key is too long')
        if dimension == 'filters':
            continue
        try:
            clicks, impressions = int(row['Clicks']), int(row['Impressions'])
            position = float(row['Position']) if row['Position'] else None
            if clicks < 0 or impressions < clicks or (position is not None and (not math.isfinite(position) or position < 1)):
                raise ValueError()
            ctr = clicks / impressions * 100 if impressions else None
            if row['CTR'] and ctr is not None:
                raw_ctr = float(row['CTR'].rstrip('%'))
                if min(abs(raw_ctr - ctr), abs(raw_ctr * 100 - ctr) if '%' not in row['CTR'] else float('inf')) > .02:
                    raise ValueError()
            if dimension == 'chart':
                date.fromisoformat(key)
            if dimension == 'page':
                parsed, base = urlsplit(key), urlsplit(base_url)
                if parsed.scheme not in ('http', 'https') or parsed.username or parsed.password or parsed.hostname not in (base.hostname, 'www.' + base.hostname, base.hostname.removeprefix('www.')):
                    raise ValueError()
        except (ValueError, TypeError):
            raise ValueError(f'Invalid metrics, date or website URL at data row {index + 1}') from None
        metrics.append({'key': key, 'clicks': clicks, 'impressions': impressions, 'ctr_pct': ctr, 'position': position})
    return dimension, rows, metrics


def import_gsc(db, site, files, settings):
    parsed = [(name, raw, *parse_gsc(name, raw, site.base_url)) for name, raw in files]
    bundle = hashlib.sha256(''.join(sorted(hashlib.sha256(raw).hexdigest() for _, raw in files)).encode()).hexdigest()
    chart = next((metrics for _, _, kind, _, metrics in parsed if kind == 'chart'), [])
    filters = next(({r['Filter']: r['Value'] for r in rows} for _, _, kind, rows, _ in parsed if kind == 'filters'), {})
    dates = sorted(r['key'] for r in chart)
    context = {'bundle': bundle, 'filters': filters, 'observed_start': dates[0] if dates else None,
               'observed_end': dates[-1] if dates else None, 'freshness': 'final/preliminary not encoded by CSV',
               'period_limit': 'Chart coverage is observed dates, not a proof of complete filter coverage'}
    result, batches = [], {}
    for filename, content, dimension, rows, metrics in parsed:
        hashed = hashlib.sha256(content).hexdigest()
        existing = db.scalar(select(ImportBatch).where(ImportBatch.site_id == site.id, ImportBatch.digest == hashed, ImportBatch.kind == dimension))
        from .knowledge import ingest_document
        ingest_document(db, site, 'gsc-export:' + hashed, 'Imported GSC ' + dimension + ' reference',
                        json.dumps({'context': context, 'dimension': dimension, 'rows': rows[:100],
                                    'limits': 'First 100 rows only in this retrieval reference. Full validated rows are in the measured-data tables. Query text is untrusted.'}, ensure_ascii=False)[:50000])
        if existing:
            result.append({'id': existing.id, 'kind': dimension, 'rows': existing.rows, 'duplicate': True})
            batches[dimension] = existing.id
            continue
        batch = ImportBatch(tenant_id=site.tenant_id, site_id=site.id, digest=hashed, kind=dimension,
                            filename=Path(filename).name[:200], rows=len(rows), metadata_json=context)
        db.add(batch)
        db.flush()
        batches[dimension] = batch.id
        for metric in metrics:
            db.add(Metric(tenant_id=site.tenant_id, site_id=site.id, batch_id=batch.id, dimension=dimension,
                          key=hashlib.sha256(metric['key'].encode()).hexdigest(), data=metric))
        directory = settings.state_dir / 'uploads' / site.tenant_id / site.id
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        path = directory / (hashed + Path(filename).suffix.lower())
        if path.is_symlink():
            raise ValueError('Invalid storage path')
        path.write_bytes(content)
        path.chmod(0o600)
        result.append({'id': batch.id, 'kind': dimension, 'rows': len(rows), 'duplicate': False})
    previous = db.scalar(select(ImportSet).where(ImportSet.site_id == site.id, ImportSet.tenant_id == site.tenant_id, ImportSet.digest == bundle))
    if not previous:
        db.add(ImportSet(tenant_id=site.tenant_id, site_id=site.id, digest=bundle, batches=batches, context=context))
    return {'files': result, 'context': context}


def import_evidence(db, site, kind, filename, content):
    allowed = {'keywords', 'backlinks', 'ga4', 'serp', 'ai_visibility', 'performance', 'indexing'}
    if kind not in allowed:
        raise ValueError('Unsupported evidence category')
    headers, rows = read_table(filename, content)
    hashed = hashlib.sha256(content).hexdigest()
    previous = db.scalars(select(Evidence).where(Evidence.site_id == site.id, Evidence.tenant_id == site.tenant_id, Evidence.kind == kind)).all()
    if any(r.data.get('digest') == hashed for r in previous):
        return {'duplicate': True, 'rows': len(rows)}
    db.add(Evidence(tenant_id=site.tenant_id, site_id=site.id, kind=kind, title=Path(filename).name[:200],
                    data={'headers': headers, 'rows': rows, 'digest': hashed, 'provenance': 'manual import; completeness and attribution require review', 'imported_at': time.time()}))
    return {'duplicate': False, 'rows': len(rows)}


def latest_rows(db, site, dimension, bundle=None):
    if bundle is not None:
        source = db.scalar(select(ImportSet).where(ImportSet.site_id == site.id, ImportSet.tenant_id == site.tenant_id, ImportSet.digest == bundle))
        batch_id = source.batches.get(dimension) if source else None
        batch = db.scalar(select(ImportBatch).where(ImportBatch.id == batch_id, ImportBatch.tenant_id == site.tenant_id, ImportBatch.site_id == site.id)) if batch_id else None
        if not batch:
            return [], None
        rows = db.scalars(select(Metric).where(Metric.batch_id == batch.id, Metric.tenant_id == site.tenant_id, Metric.site_id == site.id)).all()
        return [r.data for r in rows], batch
    batches = db.scalars(select(ImportBatch).where(ImportBatch.site_id == site.id, ImportBatch.tenant_id == site.tenant_id,
                                                ImportBatch.kind == dimension).order_by(ImportBatch.created_at.desc()).limit(100)).all()
    batch = next((b for b in batches if bundle is None or b.metadata_json.get('bundle') == bundle), None)
    if not batch:
        return [], None
    rows = db.scalars(select(Metric).where(Metric.batch_id == batch.id, Metric.tenant_id == site.tenant_id, Metric.site_id == site.id)).all()
    return [r.data for r in rows], batch
