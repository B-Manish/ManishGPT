from logging.config import fileConfig
import os
from dotenv import load_dotenv

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Load environment variables
load_dotenv()

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
from models import Base
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = os.getenv("DATABASE_URL", config.get_main_option("sqlalchemy.url"))
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Get database URL from environment or config
    database_url = os.getenv("DATABASE_URL") or "postgresql://postgres:manish@localhost:5432/manishgpt"
    
    # Validate that the URL includes a database name
    if database_url and "/" in database_url:
        # Ensure the URL has a database name (after the last /)
        parts = database_url.rsplit("/", 1)
        if len(parts) == 2 and not parts[1] or parts[1].split("?")[0].strip() == "":
            raise ValueError(
                "Database URL must include a database name. "
                "Example: postgresql://user:pass@localhost:5432/manishgpt"
            )
    
    # Override the sqlalchemy.url with environment variable if available
    configuration = config.get_section(config.config_ini_section, {})
    if database_url:
        configuration["sqlalchemy.url"] = database_url
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Ensure we're connected to the correct database
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            version_table_schema=None,  # Use default schema (public)
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
