"""add admin audit actions

Revision ID: 20260513_0006
Revises: 20260513_0005
Create Date: 2026-05-13 15:00:00
"""

from __future__ import annotations

from alembic import op


revision = "20260513_0006"
down_revision = "20260513_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE audit_log_action ADD VALUE IF NOT EXISTS 'ADMIN_DEVICE_GENERATED'")
    op.execute("ALTER TYPE audit_log_action ADD VALUE IF NOT EXISTS 'ADMIN_USER_ROLE_CHANGED'")


def downgrade() -> None:
    pass
