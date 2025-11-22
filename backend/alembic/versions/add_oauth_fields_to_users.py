"""add oauth fields to users

Revision ID: add_oauth_fields
Revises: f29e385c7802
Create Date: 2025-01-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_oauth_fields'
down_revision: Union[str, Sequence[str], None] = 'f29e385c7802'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Make hashed_password nullable for OAuth users
    op.alter_column('users', 'hashed_password',
                    existing_type=sa.String(),
                    nullable=True)
    
    # Add google_id column
    op.add_column('users', sa.Column('google_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=True)
    
    # Add oauth_provider column
    op.add_column('users', sa.Column('oauth_provider', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove oauth_provider column
    op.drop_column('users', 'oauth_provider')
    
    # Remove google_id column and index
    op.drop_index(op.f('ix_users_google_id'), table_name='users')
    op.drop_column('users', 'google_id')
    
    # Make hashed_password NOT NULL again (this might fail if there are OAuth users)
    # Update any NULL passwords to a placeholder before making it NOT NULL
    op.execute("UPDATE users SET hashed_password = '' WHERE hashed_password IS NULL")
    op.alter_column('users', 'hashed_password',
                    existing_type=sa.String(),
                    nullable=False)

