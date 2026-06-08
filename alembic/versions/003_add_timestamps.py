"""Add created_at and updated_at columns to user table"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "003_add_timestamps"
down_revision = "002_add_email_verified"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('user', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False))
    op.add_column('user', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False))

def downgrade() -> None:
    op.drop_column('user', 'updated_at')
    op.drop_column('user', 'created_at')
