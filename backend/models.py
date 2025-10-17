from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# User Management Models
class UserRole(Base):
    __tablename__ = "user_roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    users = relationship("User", back_populates="user_role")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey("user_roles.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user_role = relationship("UserRole", back_populates="users")
    assigned_personas = relationship("UserPersona", back_populates="user", foreign_keys="UserPersona.user_id")
    conversations = relationship("Conversation", back_populates="user", foreign_keys="Conversation.user_id")

# Persona Management Models
class Persona(Base):
    __tablename__ = "personas"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    instructions = Column(Text)  # Instructions for the persona/team
    agno_team_config = Column(JSON)  # Configuration for Agno Team
    model_provider = Column(String, default="openai")  # openai, groq, etc.
    model_id = Column(String, default="gpt-4o")
    is_active = Column(Boolean, default=True)
    created_by_admin_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by_admin = relationship("User", foreign_keys=[created_by_admin_id])
    assigned_users = relationship("UserPersona", back_populates="persona", foreign_keys="UserPersona.persona_id")
    conversations = relationship("Conversation", back_populates="persona", foreign_keys="Conversation.persona_id")
    tools = relationship("PersonaTool", back_populates="persona", foreign_keys="PersonaTool.persona_id")

# Many-to-many relationship between Users and Personas
class UserPersona(Base):
    __tablename__ = "user_personas"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    persona_id = Column(Integer, ForeignKey("personas.id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    assigned_by_admin_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    user = relationship("User", back_populates="assigned_personas", foreign_keys=[user_id])
    persona = relationship("Persona", back_populates="assigned_users", foreign_keys=[persona_id])
    assigned_by_admin = relationship("User", foreign_keys=[assigned_by_admin_id])

# Tool Management Models
class Tool(Base):
    __tablename__ = "tools"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text)
    tool_class = Column(String, nullable=False)  # Python class name
    config = Column(JSON)  # Tool-specific configuration
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    persona_tools = relationship("PersonaTool", back_populates="tool")

class PersonaTool(Base):
    __tablename__ = "persona_tools"
    id = Column(Integer, primary_key=True, index=True)
    persona_id = Column(Integer, ForeignKey("personas.id"), nullable=False)
    tool_id = Column(Integer, ForeignKey("tools.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    added_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    persona = relationship("Persona", back_populates="tools")
    tool = relationship("Tool", back_populates="persona_tools")

# Enhanced Conversation and Message Models
class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, default="Untitled")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    persona_id = Column(Integer, ForeignKey("personas.id"), nullable=False)
    status = Column(String, default="active")  # active, ended, paused
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="conversations")
    persona = relationship("Persona", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")
    tool_usages = relationship("ToolUsage", back_populates="conversation")
    agent_interactions = relationship("AgentInteraction", back_populates="conversation")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String, nullable=False)  # user, assistant, system, agent
    content = Column(Text, nullable=False)
    sender_type = Column(String, default="user")  # user, persona, team_member
    agent_name = Column(String)  # Name of the specific agent if from team
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")

# Tracking Models
class ToolUsage(Base):
    __tablename__ = "tool_usages"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    tool_name = Column(String, nullable=False)
    input_data = Column(JSON)
    output_data = Column(JSON)
    execution_time = Column(Float)  # Time taken in seconds
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="tool_usages")

class AgentInteraction(Base):
    __tablename__ = "agent_interactions"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    action = Column(String, nullable=False)  # delegate, respond, analyze, etc.
    details = Column(JSON)  # Additional interaction details
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="agent_interactions")

# Analytics Models
class ConversationAnalytics(Base):
    __tablename__ = "conversation_analytics"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    total_messages = Column(Integer, default=0)
    total_tool_usages = Column(Integer, default=0)
    total_agent_interactions = Column(Integer, default=0)
    average_response_time = Column(Float)
    user_satisfaction_score = Column(Float)  # If you implement rating system
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    conversation = relationship("Conversation")
