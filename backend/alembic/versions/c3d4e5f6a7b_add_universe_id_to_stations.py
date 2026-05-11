"""Add universe_id column to stations table

Revision ID: c3d4e5f6a7b
Revises: a1b2c3d4e5f
Create Date: 2026-05-11

Context:
  Stations now belong to a Universe (game world). The column is nullable so
  existing stations are unaffected. The startup auto-attach endpoint assigns
  the first universe to any unlinked stations when the app loads.

  Migration note: no backfill is performed here because the frontend handles
  auto-attach at runtime via POST /api/v1/startup/auto-attach.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# ── Revision identifiers ─────────────────────────────────────────────
revision: str = "c3d4e5f6a7b"
down_revision: str | None = "a1b2c3d4e5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add universe_id column to stations table (idempotent)."""
    with op.batch_alter_table("stations", schema=None) as batch_op:
        try:
            batch_op.add_column(
                sa.Column(
                    "universe_id",
                    sa.String(),
                    nullable=True,
                )
            )
        except Exception:
            pass  # column already exists on fresh databases seeded from ORM
        try:
            batch_op.create_foreign_key(
                "fk_stations_universe_id",
                "universes",
                ["universe_id"],
                ["id"],
            )
        except Exception:
            pass  # constraint already exists


def downgrade() -> None:
    """Remove universe_id column from stations table."""
    with op.batch_alter_table("stations", schema=None) as batch_op:
        batch_op.drop_column("universe_id")
