"""add user favorite device ids

Revision ID: 20260605_0008
Revises: 20260513_0007
Create Date: 2026-06-05 13:05:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260605_0008"
down_revision = "20260513_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("favorite_device_ids", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "favorite_device_ids")
