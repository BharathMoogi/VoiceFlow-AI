"""
Alembic environment configuration for VoiceFlow-AI.

Supports both:
  - Online mode  (run_migrations_online) — used by `alembic upgrade`
  - Offline mode (run_migrations_offline) — generates SQL scripts without a DB connection

The database URL is loaded from app.core.config.settings so there is a
single source of truth and no hardcoded credentials here.

All SQLAlchemy models are imported via app.db.base so Alembic's
autogenerate can detect schema changes automatically.
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# ---------------------------------------------------------------------------
# Make sure the project root is on the path so app.* imports work when
# running `alembic` from the project root directory.
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ---------------------------------------------------------------------------
# Import app settings and ALL models (required for autogenerate)
# ---------------------------------------------------------------------------
from app.core.config import settings  # noqa: E402
from app.db.base import Base  # noqa: E402  — imports all models via side-effects
import app.models  # noqa: E402, F401  — ensure every model is registered

# ---------------------------------------------------------------------------
# Alembic Config object (gives access to values in alembic.ini)
# ---------------------------------------------------------------------------
config = context.config

# Override the sqlalchemy.url with the real URL from .env
# Use the *synchronous* psycopg2 driver for Alembic migrations
# (asyncpg is only used at runtime by the FastAPI async engine).
# Determine a synchronous database URL for Alembic migrations
sync_db_url = settings.DATABASE_URL.replace(
    "postgresql+asyncpg://", "postgresql://"
).replace("%", "%%")
# If using SQLite with the async aiosqlite driver, switch to the sync driver
if sync_db_url.startswith("sqlite+aiosqlite://"):
    sync_db_url = sync_db_url.replace("sqlite+aiosqlite://", "sqlite://")
config.set_main_option("sqlalchemy.url", sync_db_url)

# Set up Python logging from the alembic.ini [loggers] section
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata object that autogenerate inspects
target_metadata = Base.metadata


# ---------------------------------------------------------------------------
# Offline migration (no live DB connection — generates raw SQL)
# ---------------------------------------------------------------------------
def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    Useful for generating a SQL script to review or apply manually.
    Usage:
        alembic upgrade head --sql > migration.sql
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online migration (live DB connection)
# ---------------------------------------------------------------------------
def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode using a real database connection.

    A NullPool is used so connections are not kept open between migration
    steps — important for tools like Alembic that run as short-lived scripts.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,           # detect column type changes
            compare_server_default=True, # detect default value changes
        )

        with context.begin_transaction():
            context.run_migrations()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
