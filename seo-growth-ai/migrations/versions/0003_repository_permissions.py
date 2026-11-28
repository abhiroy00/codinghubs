"""Explicit OS-owner registration binds repository permissions to one tenant/site."""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'


def upgrade():
    op.create_table('repositories',
        sa.Column('id', sa.String(32), primary_key=True), sa.Column('created_at', sa.Float(), nullable=False),
        sa.Column('tenant_id', sa.String(32), nullable=False),
        sa.Column('site_id', sa.String(32), sa.ForeignKey('sites.id'), nullable=False),
        sa.Column('name', sa.String(120), nullable=False), sa.Column('path', sa.Text(), nullable=False),
        sa.UniqueConstraint('site_id', 'path'))
    op.create_index('ix_repositories_site_id', 'repositories', ['site_id'])
    op.create_index('ix_repositories_tenant_id', 'repositories', ['tenant_id'])


def downgrade():
    raise RuntimeError('Restore a verified local backup instead.')
