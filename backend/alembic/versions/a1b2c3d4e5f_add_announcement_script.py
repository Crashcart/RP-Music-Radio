"""Add announcement_script column to artists table

Revision ID: a1b2c3d4e5f
Revises: 7b9629222ee
Create Date: 2026-05-06

Context:
  The DJ announcement feature (POST /api/v1/artists/{id}/announcement) stores
  the AI-generated 30-second intro script on the Artist row.  The column was
  added to the ORM model but never landed in a migration, causing:

      sqlalchemy.exc.OperationalError: (sqlite3.OperationalError)
          no such column: artists.announcement_script

  on any database created before this feature was merged.  This migration
  adds the column with a blank-string default so no backfill is required and
  existing rows are unaffected.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# ── Revision identifiers ─────────────────────────────────────────────
revision: str = "a1b2c3d4e5f"
down_revision: str | None = "7b9629222ee"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add announcement_script column to artists table (idempotent)."""
    with op.batch_alter_table("artists", schema=None) as batch_op:
        try:
            batch_op.add_column(
                sa.Column(
                    "announcement_script",
                    sa.Text(),
                    nullable=True,
                    server_default="",
                )
            )
        except sa.exc.OperationalError:
            pass  # column already exists on fresh databases seeded from ORM


def downgrade() -> None:
    """Remove announcement_script column from artists table."""
    with op.batch_alter_table("artists", schema=None) as batch_op:
        batch_op.drop_column("announcement_script")
