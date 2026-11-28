"""Coherent import sets reference deduplicated files without mixing periods."""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'


def upgrade():
    op.create_table('import_sets',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('created_at', sa.Float(), nullable=False),
        sa.Column('tenant_id', sa.String(32), nullable=False),
        sa.Column('site_id', sa.String(32), sa.ForeignKey('sites.id'), nullable=False),
        sa.Column('digest', sa.String(64), nullable=False),
        sa.Column('batches', sa.JSON(), nullable=False),
        sa.Column('context', sa.JSON(), nullable=False),
        sa.UniqueConstraint('site_id', 'digest'))
    op.create_index('ix_import_sets_tenant_id', 'import_sets', ['tenant_id'])
    op.create_index('ix_import_sets_site_id', 'import_sets', ['site_id'])


def downgrade():
    raise RuntimeError('Restore a verified local backup instead of deleting imported evidence.')
