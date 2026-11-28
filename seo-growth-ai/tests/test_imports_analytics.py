from pathlib import Path

import pytest
from sqlalchemy import func, select

from app.analytics import summary, totals
from app.config import Settings
from app.db import database, test_schema as create_schema
from app.imports import import_gsc, parse_gsc, read_table
from app.models import Metric, Site, Tenant


@pytest.fixture
def workspace(tmp_path):
    settings = Settings(state_dir=tmp_path, database_url='sqlite:///' + str(tmp_path / 'test.db'))
    engine, sessions = database(settings)
    create_schema(engine)
    with sessions.begin() as db:
        tenant = Tenant(name='Example')
        db.add(tenant)
        db.flush()
        site = Site(tenant_id=tenant.id, name='Example', base_url='https://example.com/')
        db.add(site)
        db.flush()
        yield db, site, settings
    engine.dispose()


def test_import_is_idempotent_and_missing_dates_remain_unknown(workspace):
    db, site, settings = workspace
    raw = b'Date,Clicks,Impressions,CTR,Position\n2026-11-25,1,100,1%,8\n2026-11-26,2,200,1%,12\n'
    files = [('Chart.csv', raw)]
    assert not import_gsc(db, site, files, settings)['files'][0]['duplicate']
    db.flush()
    assert import_gsc(db, site, files, settings)['files'][0]['duplicate']
    assert db.scalar(select(func.count()).select_from(Metric)) == 2
    data = summary(db, site)
    assert data['totals']['clicks'] == 3
    assert data['totals']['position_approx'] == pytest.approx(10.6666667)
    assert data['windows']['last7']['totals'] is None
    assert not data['windows']['last7']['complete']


def test_ctr_comes_from_counts_not_mean_percentages():
    data = totals([{'clicks': 1, 'impressions': 1, 'position': 1}, {'clicks': 0, 'impressions': 99, 'position': 20}])
    assert data['ctr_pct'] == 1
    assert data['position_approx'] == 19.81


def test_selected_import_set_reuses_chart_but_never_borrows_missing_dimensions(workspace):
    db, site, settings = workspace
    chart = ('Chart.csv', b'Date,Clicks,Impressions,CTR,Position\n2026-11-26,2,200,1%,9\n')
    first_query = ('Queries.csv', b'Top queries,Clicks,Impressions,CTR,Position\nold query,1,100,1%,9\n')
    second_query = ('Queries.csv', b'Top queries,Clicks,Impressions,CTR,Position\nnew query,0,100,0%,8\n')
    import_gsc(db, site, [chart, first_query], settings)
    db.flush()
    import_gsc(db, site, [chart, second_query], settings)
    db.flush()
    result = summary(db, site)
    assert result['totals']['clicks'] == 2
    assert result['dimensions']['query']['rows'][0]['key'] == 'new query'
    import_gsc(db, site, [first_query], settings)
    db.flush()
    assert summary(db, site)['totals'] is None


def test_xlsx_percentages_and_permitted_manual_export_formats():
    import io
    from openpyxl import Workbook
    book = Workbook()
    book.active.append(['Date', 'Clicks', 'Impressions', 'CTR', 'Position'])
    book.active.append(['2026-11-26', 2, 200, .01, 9])
    book.active['D2'].number_format = '0.00%'
    stream = io.BytesIO()
    book.save(stream)
    assert parse_gsc('Chart.xlsx', stream.getvalue(), 'https://example.com/')[2][0]['ctr_pct'] == 1
    assert read_table('keywords.csv', 'Keyword\tAvg. monthly searches\nrag\t100\n'.encode('utf-16'))[1][0]['Keyword'] == 'rag'
    assert read_table('trends.csv', b'Category: All categories\n\nWeek,rag: (India)\n2026-11-22,55\n')[1][0]['rag: (India)'] == '55'
    with pytest.raises(ValueError, match='empty'):
        read_table('empty.csv', b'')


def test_long_queries_are_preserved_without_oversized_database_index_keys(workspace):
    db, site, settings = workspace
    query = 'technical question ' * 80
    raw = ('Top queries,Clicks,Impressions,CTR,Position\n' + query + ',0,10,0%,9\n').encode()
    import_gsc(db, site, [('Queries.csv', raw)], settings)
    db.flush()
    stored = db.scalar(select(Metric))
    assert stored.data['key'] == query.strip()
    assert len(stored.key) == 64


def test_invalid_and_duplicate_rows_are_rejected():
    with pytest.raises(ValueError):
        parse_gsc('Chart.csv', b'Date,Clicks,Impressions,CTR,Position\n2026-11-25,100,2,50%,1', 'https://example.com/')
    with pytest.raises(ValueError):
        read_table('../../bad.xlsm', b'macro')


def test_supplied_export_fixture_when_available(workspace):
    source = Path('/Users/nishantgiri/Downloads/https___codinghubs.in_-Performance-on-Search-2026-11-28')
    if not source.exists():
        pytest.skip('Private user exports are intentionally not bundled with source')
    db, site, settings = workspace
    site.base_url = 'https://codinghubs.in/'
    result = import_gsc(db, site, [(p.name, p.read_bytes()) for p in sorted(source.glob('*.csv'))], settings)
    db.flush()
    data = summary(db, site)
    assert len(result['files']) == 7
    assert data['totals']['clicks'] == 126
    assert data['totals']['impressions'] == 8048
    assert data['dimensions']['page']['totals']['impressions'] == 8673
    assert data['windows']['last7']['totals']['clicks'] == 95
    assert data['windows']['previous7']['totals']['clicks'] == 18
    assert data['windows']['last90']['totals'] is None
