"""Add custom fields to users

Revision ID: add_custom_fields
Revises: None
Create Date: 2024-03-24 13:42:51.000000

"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Add custom_fields column to users table
    op.add_column('users', sa.Column('custom_fields', sa.Text(), nullable=True))

def downgrade():
    # Remove custom_fields column from users table
    op.drop_column('users', 'custom_fields')
