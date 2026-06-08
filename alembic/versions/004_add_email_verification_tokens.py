"""
Revision ID: 004_add_email_verification_tokens
Revises: 003_add_timestamps
Create Date: 2026-06-08 23:30:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import func

# revision identifiers, used by Alembic.
revision = '004_add_email_verification_tokens'
down_revision = '003_add_timestamps'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'email_verification_tokens',
        sa.Column('id', sa.Integer, primary_key=True, nullable=False),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('token', sa.String(length=255), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime, nullable=False),
        sa.Column('used', sa.Boolean, nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime, server_default=func.now(), nullable=False),
    )
    op.create_index('ix_email_verification_tokens_user_id', 'email_verification_tokens', ['user_id'])

def downgrade():
    op.drop_index('ix_email_verification_tokens_user_id', table_name='email_verification_tokens')
    op.drop_table('email_verification_tokens')
