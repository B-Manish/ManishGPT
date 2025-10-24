"""removing uncecessary tables

Revision ID: 638c090131da
Revises: c5cf80535b92
Create Date: 2025-10-23 23:13:21.301737

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '638c090131da'
down_revision: Union[str, Sequence[str], None] = 'c5cf80535b92'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop unnecessary tables
    op.drop_table('agent_interactions')
    op.drop_table('conversation_analytics')
    op.drop_table('tool_usages')


def downgrade() -> None:
    """Downgrade schema."""
    # Recreate tables if needed (optional - you can leave empty if you don't plan to rollback)
    # Note: This is a simplified recreation - adjust column definitions if needed
    
    # Recreate tool_usages
    op.create_table('tool_usages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('tool_name', sa.String(), nullable=False),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('result', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Recreate agent_interactions
    op.create_table('agent_interactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('agent_name', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Recreate conversation_analytics
    op.create_table('conversation_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('total_messages', sa.Integer(), nullable=True),
        sa.Column('agent_switches', sa.Integer(), nullable=True),
        sa.Column('tool_calls', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
