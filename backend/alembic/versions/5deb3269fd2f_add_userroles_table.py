"""Add userroles table

Revision ID: 5deb3269fd2f
Revises: 1fb4e7ba3426
Create Date: 2025-10-18 00:42:28.596307

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5deb3269fd2f'
down_revision: Union[str, Sequence[str], None] = '1fb4e7ba3426'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create user_roles table first
    op.create_table('user_roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_roles_id'), 'user_roles', ['id'], unique=False)
    op.create_index(op.f('ix_user_roles_name'), 'user_roles', ['name'], unique=True)
    
    # Insert default roles
    op.execute("""
        INSERT INTO user_roles (name, description, is_active, created_at)
        VALUES 
        ('admin', 'Administrator with full access', true, NOW()),
        ('user', 'Regular user with limited access', true, NOW())
    """)
    
    # Add role_id column to users table as nullable first
    op.add_column('users', sa.Column('role_id', sa.Integer(), nullable=True))
    
    # Update existing users to have role_id
    op.execute("""
        UPDATE users 
        SET role_id = (SELECT id FROM user_roles WHERE name = CASE 
            WHEN users.role = 'admin' THEN 'admin'
            ELSE 'user'
        END)
    """)
    
    # Make role_id NOT NULL
    op.alter_column('users', 'role_id', nullable=False)
    
    # Add foreign key constraint
    op.create_foreign_key('fk_users_role_id', 'users', 'user_roles', ['role_id'], ['id'])
    
    # Drop the old role column
    op.drop_column('users', 'role')
    
    # Add columns to conversations table as nullable first
    op.add_column('conversations', sa.Column('user_id', sa.Integer(), nullable=True))
    op.add_column('conversations', sa.Column('persona_id', sa.Integer(), nullable=True))
    op.add_column('conversations', sa.Column('status', sa.String(), nullable=True))
    op.add_column('conversations', sa.Column('updated_at', sa.DateTime(), nullable=True))
    
    # Update existing conversations with default values
    op.execute("""
        UPDATE conversations 
        SET user_id = (SELECT id FROM users WHERE role_id = (SELECT id FROM user_roles WHERE name = 'admin') LIMIT 1),
            persona_id = (SELECT id FROM personas LIMIT 1),
            status = 'active',
            updated_at = NOW()
        WHERE user_id IS NULL OR persona_id IS NULL
    """)
    
    # Make columns NOT NULL
    op.alter_column('conversations', 'user_id', nullable=False)
    op.alter_column('conversations', 'persona_id', nullable=False)
    
    # Add foreign key constraints
    op.create_foreign_key('fk_conversations_user_id', 'conversations', 'users', ['user_id'], ['id'])
    op.create_foreign_key('fk_conversations_persona_id', 'conversations', 'personas', ['persona_id'], ['id'])
    
    # Add columns to messages table
    op.add_column('messages', sa.Column('sender_type', sa.String(), nullable=True))
    op.add_column('messages', sa.Column('agent_name', sa.String(), nullable=True))
    
    # Make conversation_id NOT NULL if it isn't already
    op.alter_column('messages', 'conversation_id',
               existing_type=sa.INTEGER(),
               nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop foreign key constraints
    op.drop_constraint('fk_conversations_persona_id', 'conversations', type_='foreignkey')
    op.drop_constraint('fk_conversations_user_id', 'conversations', type_='foreignkey')
    
    # Drop columns from conversations table
    op.drop_column('conversations', 'updated_at')
    op.drop_column('conversations', 'status')
    op.drop_column('conversations', 'persona_id')
    op.drop_column('conversations', 'user_id')
    
    # Drop columns from messages table
    op.drop_column('messages', 'agent_name')
    op.drop_column('messages', 'sender_type')
    
    # Add back the old role column
    op.add_column('users', sa.Column('role', sa.String(), nullable=True))
    
    # Update role column from role_id
    op.execute("""
        UPDATE users 
        SET role = (SELECT name FROM user_roles WHERE id = users.role_id)
    """)
    
    # Make role NOT NULL
    op.alter_column('users', 'role', nullable=False)
    
    # Drop foreign key constraint
    op.drop_constraint('fk_users_role_id', 'users', type_='foreignkey')
    
    # Drop role_id column
    op.drop_column('users', 'role_id')
    
    # Drop user_roles table
    op.drop_table('user_roles')
