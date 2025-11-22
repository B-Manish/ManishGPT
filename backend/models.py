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
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth users
    google_id = Column(String, unique=True, index=True, nullable=True)  # Google OAuth ID
    oauth_provider = Column(String, nullable=True)  # 'google', 'local', etc.
    role_id = Column(Integer, ForeignKey("user_roles.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user_role = relationship("UserRole", back_populates="users")
    assigned_personas = relationship("UserPersona", back_populates="user", foreign_keys="UserPersona.user_id")
    conversations = relationship("Conversation", back_populates="user", foreign_keys="Conversation.user_id")

# Agent Management Models
class Agent(Base):
    __tablename__ = "agents"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False)  # team_leader, specialist, assistant
    instructions = Column(Text, nullable=False)
    model_provider = Column(String, default="openai")  # openai, groq, etc.
    model_id = Column(String, default="gpt-4o")
    tools = Column(JSON)  # List of tool names directly in agent
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# File Management Models
class File(Base):
    __tablename__ = "files"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)  # Original filename
    object_name = Column(String, nullable=False)  # MinIO object name
    file_size = Column(Integer, nullable=False)
    content_type = Column(String, nullable=False)
    bucket_name = Column(String, nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])

class MessageFile(Base):
    __tablename__ = "message_files"
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    file_id = Column(Integer, ForeignKey("files.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    message = relationship("Message", foreign_keys=[message_id])
    file = relationship("File", foreign_keys=[file_id])

# Junction tables removed - using JSON columns instead
# class AgentTool(Base):
#     __tablename__ = "agent_tools"
#     id = Column(Integer, primary_key=True, index=True)
#     agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
#     tool_id = Column(Integer, ForeignKey("tools.id"), nullable=False)
#     is_active = Column(Boolean, default=True)
#     added_at = Column(DateTime, default=datetime.utcnow)
#     
#     # Relationships
#     agent = relationship("Agent", back_populates="agent_tools")
#     tool = relationship("Tool", back_populates="agent_tools")

# Junction table for Persona-Agent relationships
# class PersonaAgent(Base):
#     __tablename__ = "persona_agents"
#     id = Column(Integer, primary_key=True, index=True)
#     persona_id = Column(Integer, ForeignKey("personas.id"), nullable=False)
#     agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
#     is_active = Column(Boolean, default=True)
#     attached_at = Column(DateTime, default=datetime.utcnow)
#     
#     # Relationships
#     persona = relationship("Persona", back_populates="persona_agents")
#     agent = relationship("Agent", back_populates="persona_agents")

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
    agents = Column(JSON)  # List of agent IDs directly in persona
    is_active = Column(Boolean, default=True)
    created_by_admin_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by_admin = relationship("User", foreign_keys=[created_by_admin_id])
    assigned_users = relationship("UserPersona", back_populates="persona", foreign_keys="UserPersona.persona_id")
    conversations = relationship("Conversation", back_populates="persona", foreign_keys="Conversation.persona_id")

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
    # persona_tools relationship removed - personas get tools through agents

# PersonaTool junction table removed - personas get tools through their agents
# class PersonaTool(Base):
#     __tablename__ = "persona_tools"
#     id = Column(Integer, primary_key=True, index=True)
#     persona_id = Column(Integer, ForeignKey("personas.id"), nullable=False)
#     tool_id = Column(Integer, ForeignKey("tools.id"), nullable=False)
#     is_active = Column(Boolean, default=True)
#     added_at = Column(DateTime, default=datetime.utcnow)
#     
#     # Relationships
#     persona = relationship("Persona", back_populates="tools")
#     tool = relationship("Tool", back_populates="persona_tools")

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

# Tracking Models (Removed: ToolUsage, AgentInteraction, ConversationAnalytics)
# These tables were removed as they are not used with Agno Teams implementation

# Store raw Agno logs per agent run
class AgentRunLog(Base):
    __tablename__ = "logs"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    persona_id = Column(Integer, ForeignKey("personas.id"), nullable=False)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    raw_log = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    conversation = relationship("Conversation")
    message = relationship("Message")
