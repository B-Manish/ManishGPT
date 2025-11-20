from fastapi import FastAPI, Request, Depends, HTTPException, status, UploadFile, File
import re
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, RedirectResponse
from pydantic import BaseModel, Field, EmailStr
from agno.agent import Agent as AgnoAgent
from agno.models.openai import OpenAIChat
from agno.models.groq import Groq
from dotenv import load_dotenv
import os
import jwt
import bcrypt
from datetime import datetime, timedelta
import pytz
from typing import Any, Dict, List, Optional
import asyncio
import json
from authlib.integrations.httpx_client import AsyncOAuth2Client
from urllib.parse import urlencode, quote_plus


from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import (
    Base, 
    User, 
    UserRole,
    Persona, 
    UserPersona, 
    Tool, 
    Conversation, 
    Message, 
    Agent,
    File as FileModel,
    MessageFile,
    AgentRunLog
)
from typing import List
from datetime import datetime
from services.agno_team_service import agno_team_service
from services.file_service import file_service
from services.model_service import model_service



load_dotenv()

# Timezone configuration
IST = pytz.timezone('Asia/Kolkata')

def get_ist_time():
    """Get current time in IST"""
    return datetime.now(IST)

# Authentication configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", f"{BACKEND_URL}/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3001")

# Security
security = HTTPBearer()

app = FastAPI()

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Authentication dependency
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).join(UserRole).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def get_current_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.user_role.name != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Pydantic Schemas
class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    role_id: int = Field(..., description="User role ID")

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    role_id: int
    role_name: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserRoleResponse(BaseModel):
    id: int
    name: str
    description: str
    is_active: bool
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class Token(BaseModel):
    access_token: str
    token_type: str

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int

class UserAssignPersona(BaseModel):
    user_id: int
    persona_id: int

class UserDeactivate(BaseModel):
    user_id: int
    reason: Optional[str] = None

# Agent Management Schemas
class AgentCreate(BaseModel):
    name: str = Field(..., description="Agent name")
    role: str = Field(..., description="Agent role (team_leader, specialist, assistant)")
    instructions: str = Field(..., description="Agent instructions")
    model_provider: str = Field(default="openai", description="Model provider")
    model_id: str = Field(default="gpt-4o", description="Model ID")
    tool_names: Optional[List[str]] = Field(default=[], description="List of tool names")

class AgentResponse(BaseModel):
    id: int
    name: str
    role: str
    instructions: str
    model_provider: str
    model_id: str
    is_active: bool
    created_at: datetime
    tools: List[str] = Field(default=[], description="Tool names")

class AgentListResponse(BaseModel):
    agents: List[AgentResponse]
    total: int

class PersonaCreateRequest(BaseModel):
    name: str = Field(..., description="Persona name")
    description: Optional[str] = Field(default="", description="Persona description")
    instructions: str = Field(..., description="Persona instructions")
    model_provider: str = Field(default="openai", description="Model provider")
    model_id: str = Field(..., description="Model ID")
    agent_ids: List[int] = Field(..., description="List of agent IDs to attach")

class PersonaTeamInfo(BaseModel):
    persona_id: int
    total_agents: int
    team_leader: Optional[AgentResponse]
    specialists: List[AgentResponse]
    assistants: List[AgentResponse]

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the agent globally
openai_api_key = os.getenv("OPENAI_API_KEY")
groq_api_key = os.getenv("GROQ_API_KEY")

# Import tools from registry
from tools.registry import get_tools, TOOL_REGISTRY

# Get all available tools automatically
available_tools = get_tools(list(TOOL_REGISTRY.keys()))
print(f"🔧 Loaded {len(available_tools)} tools: {[tool.name for tool in available_tools]}")

# Auto-create tools in database on startup
def ensure_tools_exist():
    """Ensure basic tools exist in database"""
    db = SessionLocal()
    try:
        # Check if tools already exist
        existing_tools = db.query(Tool).count()
        if existing_tools > 0:
            print(f"✅ Database tools already exist ({existing_tools} found)")
            return
        
        # Create basic tools
        tools_to_create = [
            {
                "name": "youtube",
                "description": "YouTube video transcript extraction tool",
                "tool_class": "YouTube_Tool",
                "config": {"enabled": True}
            },
            {
                "name": "web_search", 
                "description": "Web search tool for finding information",
                "tool_class": "WebSearchTool",
                "config": {"enabled": True}
            },
            {
                "name": "file_processing",
                "description": "File processing tool for PDF, DOCX, and other document types",
                "tool_class": "FileProcessingTool",
                "config": {"enabled": True}
            },
            {
                "name": "gmail",
                "description": "Gmail integration tool for email management",
                "tool_class": "GmailTool",
                "config": {"enabled": True}
            }
        ]
        
        for tool_data in tools_to_create:
            tool = Tool(**tool_data, is_active=True)
            db.add(tool)
        
        db.commit()
        print(f"✅ Created {len(tools_to_create)} tools in database")
        
    except Exception as e:
        print(f"❌ Error creating tools: {e}")
        db.rollback()
    finally:
        db.close()

# Run on startup
ensure_tools_exist()

agent = AgnoAgent(
    name="Basic Agent",
    model=OpenAIChat(id="gpt-4o", api_key=openai_api_key),
    # model=Groq(id="llama-3.3-70b-versatile",api_key=groq_api_key),
    tools=available_tools,
    instructions=[
        "You are a helpful AI assistant with access to various tools. Automatically detect and use the appropriate tools based on the user's input:",
        "- If the user mentions YouTube, provides a YouTube URL, or asks about video content, automatically use the YouTube tools to:",
        "  * Extract video transcripts using get_transcript_from_video ONLY",
        "  * Return the raw transcript text as provided by the tool - do not summarize or modify it",
        "  * Handle any YouTube-related queries",
        "- For general questions, conversations, or non-YouTube requests, respond conversationally without using tools",
        "- Always be helpful, clear, and informative in your responses",
        "- When using tools, explain what you're doing and provide the results in a user-friendly format",
        f"- Available tools: {', '.join(TOOL_REGISTRY.keys())}"
    ],
    # show_tool_calls=True,
    debug_mode=True,
    markdown=True,
)

# Authentication helper functions
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Pydantic model for the request body
class Prompt(BaseModel):
    message: str

@app.post("/run-agent")
async def run_agent(prompt: Prompt):
    try:
        print(f"\n🚀 Running agent with message: {prompt.message}")
        print(f"📋 Available tools: {[tool.name for tool in available_tools]}")
        
        import asyncio
        import concurrent.futures
        
        # Run agent in thread pool with timeout
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            try:
                # Run with 60 second timeout
                run = await asyncio.wait_for(
                    loop.run_in_executor(executor, agent.run, prompt.message),
                    timeout=60.0
                )
                print(f"✅ Agent response length: {len(run.content)} characters")
                print(f"📄 First 200 chars: {run.content[:200]}...")
                print(f"📄 Last 200 chars: ...{run.content[-200:]}")
                return {"response": run.content}
            except asyncio.TimeoutError:
                print("⏰ Agent request timed out after 60 seconds")
                return {"error": "Request timed out. Please try again."}
        
    except Exception as e:
        print(f"❌ Agent error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Schemas
class MessageCreate(BaseModel):
    role: str
    content: str

class ConversationUpdate(BaseModel):
    title: str = None

class MessageOut(BaseModel):
    role: str
    content: str
    timestamp: datetime

    class Config:
        orm_mode = True

class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime

    class Config:
        orm_mode = True

@app.get("/conversations", response_model=List[ConversationOut])
def list_conversations(db: Session = Depends(get_db)):
    return db.query(Conversation).order_by(Conversation.created_at.desc()).all()

@app.post("/conversations", response_model=ConversationOut)
def create_conversation(db: Session = Depends(get_db)):
    conv = Conversation()
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv

@app.patch("/conversations/{conversation_id}", response_model=ConversationOut)
def update_conversation(conversation_id: int, update_data: ConversationUpdate, db: Session = Depends(get_db)):
    conversation = db.query(Conversation).filter_by(id=conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if update_data.title is not None:
        conversation.title = update_data.title if update_data.title.strip() else None
    
    db.commit()
    db.refresh(conversation)
    return conversation

@app.get("/conversations/{conversation_id}/messages", response_model=List[MessageOut])
def get_messages(conversation_id: int, db: Session = Depends(get_db)):
    return db.query(Message).filter_by(conversation_id=conversation_id).order_by(Message.timestamp).all()

@app.post("/conversations/{conversation_id}/message", response_model=MessageOut)
def add_message(conversation_id: int, msg: MessageCreate, db: Session = Depends(get_db)):
    if not db.query(Conversation).filter_by(id=conversation_id).first():
        raise HTTPException(status_code=404, detail="Conversation not found")
    message = Message(conversation_id=conversation_id, role=msg.role, content=msg.content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message    

@app.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conversation = db.query(Conversation).filter_by(id=conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Delete all messages in the conversation first
    db.query(Message).filter_by(conversation_id=conversation_id).delete()
    
    # Delete the conversation
    db.delete(conversation)
    db.commit()
    
    return {"message": "Conversation deleted successfully"}
    
# =============================================================================
# USER MANAGEMENT ENDPOINTS
# =============================================================================

# Authentication Endpoints
@app.post("/auth/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user.email) | (User.username == user.username)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="Email or username already registered"
        )
    
    # Create new user
    hashed_password = hash_password(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        role="user",
        is_active=True
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@app.post("/auth/login", response_model=Token)
def login_user(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token"""
    user = db.query(User).filter(User.username == user_credentials.username).first()
    
    # Check if user exists
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )
    
    # Check if user is OAuth-only (no password)
    if user.oauth_provider and not user.hashed_password:
        raise HTTPException(
            status_code=401,
            detail="Please sign in with Google"
        )
    
    # Verify password for local users
    if not user.hashed_password or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="Account is deactivated"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/refresh")
async def refresh_token(current_user: User = Depends(get_current_user)):
    """Refresh access token"""
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(current_user.id)}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

# Google OAuth Endpoints
@app.get("/auth/google/login")
async def google_login():
    """Initiate Google OAuth login"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )
    
    # Google OAuth authorization URL - properly encode the redirect_uri
    encoded_redirect_uri = quote_plus(GOOGLE_REDIRECT_URI)
    
    google_oauth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={encoded_redirect_uri}&"
        "response_type=code&"
        "scope=openid email profile&"
        "access_type=offline&"
        "prompt=consent"
    )
    
    return {"auth_url": google_oauth_url}

@app.get("/auth/google/callback")
async def google_callback(
    request: Request,
    code: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured"
        )
    
    # Check for OAuth errors from Google
    if error:
        error_description = request.query_params.get("error_description", "Unknown error")
        # Redirect to frontend with error
        redirect_url = f"{FRONTEND_URL}/login?error={error}&error_description={error_description}"
        return RedirectResponse(url=redirect_url)
    
    # Check if code is missing
    if not code:
        # Redirect to frontend with error
        redirect_url = f"{FRONTEND_URL}/login?error=missing_code&error_description=Authorization code not received from Google"
        return RedirectResponse(url=redirect_url)
    
    try:
        # Exchange authorization code for tokens
        async with AsyncOAuth2Client(
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
        ) as client:
            token_response = await client.fetch_token(
                "https://oauth2.googleapis.com/token",
                code=code,
                redirect_uri=GOOGLE_REDIRECT_URI,
            )
            
            access_token = token_response.get("access_token")
            
            # Get user info from Google
            user_info_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            user_info = user_info_response.json()
            
            google_id = user_info.get("id")
            email = user_info.get("email")
            name = user_info.get("name", "")
            picture = user_info.get("picture", "")
            
            if not google_id or not email:
                raise HTTPException(
                    status_code=400,
                    detail="Failed to retrieve user information from Google"
                )
            
            # Check if user exists by Google ID
            user = db.query(User).filter(User.google_id == google_id).first()
            
            # If not found, check by email
            if not user:
                user = db.query(User).filter(User.email == email).first()
                
                # If user exists with email but no Google ID, link the account
                if user:
                    user.google_id = google_id
                    user.oauth_provider = "google"
                    db.commit()
                    db.refresh(user)
                else:
                    # Create new user
                    # Get default role (assuming role_id=2 is 'user', adjust as needed)
                    default_role = db.query(UserRole).filter(UserRole.name == "user").first()
                    if not default_role:
                        raise HTTPException(
                            status_code=500,
                            detail="Default user role not found"
                        )
                    
                    # Generate username from email
                    username_base = email.split("@")[0]
                    username = username_base
                    counter = 1
                    while db.query(User).filter(User.username == username).first():
                        username = f"{username_base}{counter}"
                        counter += 1
                    
                    user = User(
                        email=email,
                        username=username,
                        google_id=google_id,
                        oauth_provider="google",
                        hashed_password=None,  # OAuth users don't have passwords
                        role_id=default_role.id,
                        is_active=True
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
            
            if not user.is_active:
                raise HTTPException(
                    status_code=401,
                    detail="Account is deactivated"
                )
            
            # Generate JWT token
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            jwt_token = create_access_token(
                data={"sub": str(user.id)}, expires_delta=access_token_expires
            )
            
            # Redirect to frontend with token
            redirect_url = f"{FRONTEND_URL}/auth/callback?token={jwt_token}"
            return RedirectResponse(url=redirect_url)
            
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"OAuth authentication failed: {str(e)}"
        )

@app.get("/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "role_id": current_user.role_id,
        "role_name": current_user.user_role.name,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }

# User Profile Management
@app.put("/users/profile", response_model=UserResponse)
def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    # Check if email is already taken by another user
    if user_update.email and user_update.email != current_user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already taken")
    
    # Check if username is already taken by another user
    if user_update.username and user_update.username != current_user.username:
        existing_user = db.query(User).filter(User.username == user_update.username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    # Update user fields
    if user_update.username:
        current_user.username = user_update.username
    if user_update.email:
        current_user.email = user_update.email
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "role_id": current_user.role_id,
        "role_name": current_user.user_role.name,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }

@app.post("/users/change-password")
def change_password(
    password_change: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    # Verify current password
    if not verify_password(password_change.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    current_user.hashed_password = hash_password(password_change.new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Password changed successfully"}

# Admin User Management Endpoints
@app.get("/admin/users", response_model=UserListResponse)
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users (Admin only)"""
    users = db.query(User).join(UserRole).offset(skip).limit(limit).all()
    total = db.query(User).count()
    
    # Convert to response format with role information
    user_responses = []
    for user in users:
        user_responses.append({
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "role_id": user.role_id,
            "role_name": user.user_role.name,
            "is_active": user.is_active,
            "created_at": user.created_at
        })
    
    return UserListResponse(users=user_responses, total=total)

@app.get("/admin/users/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get user by ID (Admin only)"""
    user = db.query(User).join(UserRole).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "role_id": user.role_id,
        "role_name": user.user_role.name,
        "is_active": user.is_active,
        "created_at": user.created_at
    }

@app.put("/admin/users/{user_id}/role")
def update_user_role(
    user_id: int,
    new_role: str,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update user role (Admin only)"""
    if new_role not in ["admin", "user"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'admin' or 'user'")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get the role_id for the new role
    role = db.query(UserRole).filter(UserRole.name == new_role).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user.role_id = role.id
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": f"User role updated to {new_role}"}

@app.post("/admin/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    deactivate_data: UserDeactivate,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Deactivate user account (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    user.is_active = False
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "User deactivated successfully"}

@app.post("/admin/users/{user_id}/activate")
def activate_user(
    user_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Activate user account (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = True
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "User activated successfully"}

@app.post("/admin/users/{user_id}/assign-persona")
def assign_persona_to_user(
    user_id: int,
    assignment: UserAssignPersona,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Assign persona to user (Admin only)"""
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify persona exists
    persona = db.query(Persona).filter(Persona.id == assignment.persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Check if assignment already exists
    existing_assignment = db.query(UserPersona).filter(
        UserPersona.user_id == user_id,
        UserPersona.persona_id == assignment.persona_id
    ).first()
    
    if existing_assignment:
        if existing_assignment.is_active:
            raise HTTPException(status_code=400, detail="Persona already assigned to user")
        else:
            # Reactivate existing assignment
            existing_assignment.is_active = True
            existing_assignment.assigned_at = datetime.utcnow()
            existing_assignment.assigned_by_admin_id = admin_user.id
    else:
        # Create new assignment
        user_persona = UserPersona(
            user_id=user_id,
            persona_id=assignment.persona_id,
            assigned_by_admin_id=admin_user.id,
            is_active=True
        )
        db.add(user_persona)
    
    db.commit()
    return {"message": "Persona assigned to user successfully"}

@app.delete("/admin/users/{user_id}/personas/{persona_id}")
def remove_persona_from_user(
    user_id: int,
    persona_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Remove persona from user (Admin only)"""
    assignment = db.query(UserPersona).filter(
        UserPersona.user_id == user_id,
        UserPersona.persona_id == persona_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Persona assignment not found")
    
    assignment.is_active = False
    db.commit()
    
    return {"message": "Persona removed from user successfully"}

@app.get("/admin/users/{user_id}/personas")
def get_user_personas(
    user_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all personas assigned to a user (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    assignments = db.query(UserPersona).filter(
        UserPersona.user_id == user_id,
        UserPersona.is_active == True
    ).all()
    
    personas = []
    for assignment in assignments:
        persona = db.query(Persona).filter(Persona.id == assignment.persona_id).first()
        if persona:
            personas.append({
                "id": persona.id,
                "name": persona.name,
                "description": persona.description,
                "assigned_at": assignment.assigned_at
            })
    
    return {"user_id": user_id, "personas": personas}

# User Role Management
@app.get("/admin/user-roles", response_model=List[UserRoleResponse])
def get_user_roles(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all user roles (Admin only)"""
    roles = db.query(UserRole).filter(UserRole.is_active == True).all()
    return roles

@app.post("/admin/users", response_model=UserResponse)
def create_user_by_admin(
    user_data: UserCreate,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new user (Admin only)"""
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="Email or username already registered"
        )
    
    # Verify role exists
    role = db.query(UserRole).filter(UserRole.id == user_data.role_id).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role ID")
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        role_id=user_data.role_id,
        is_active=True
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Return user with role information
    return {
        "id": db_user.id,
        "email": db_user.email,
        "username": db_user.username,
        "role_id": db_user.role_id,
        "role_name": role.name,
        "is_active": db_user.is_active,
        "created_at": db_user.created_at
    }

# =============================================================================
# USER ENDPOINTS (For regular users)
# =============================================================================

@app.get("/user/personas")
def get_user_personas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get personas assigned to current user"""
    assignments = db.query(UserPersona).filter(
        UserPersona.user_id == current_user.id,
        UserPersona.is_active == True
    ).all()
    
    personas = []
    for assignment in assignments:
        persona = db.query(Persona).filter(Persona.id == assignment.persona_id).first()
        if persona and persona.is_active:
            personas.append({
                "id": persona.id,
                "name": persona.name,
                "description": persona.description,
                "instructions": persona.instructions,
                "model_provider": persona.model_provider,
                "model_id": persona.model_id
            })
    
    return {"personas": personas}

@app.get("/user/conversations")
def get_user_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get conversations for current user"""
    conversations = db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).all()
    
    return {"conversations": conversations}

@app.post("/user/conversations")
def create_user_conversation(
    conversation_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new conversation for current user"""
    persona_id = conversation_data.get("persona_id")
    if not persona_id:
        raise HTTPException(status_code=400, detail="persona_id is required")
    
    # Verify persona is assigned to user
    assignment = db.query(UserPersona).filter(
        UserPersona.user_id == current_user.id,
        UserPersona.persona_id == persona_id,
        UserPersona.is_active == True
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=403, detail="Persona not assigned to user")
    
    conversation = Conversation(
        user_id=current_user.id,
        persona_id=persona_id,
        status="active"
    )
    
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    
    return conversation

@app.get("/user/conversations/{conversation_id}")
def get_user_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific conversation for current user"""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversation

@app.get("/user/conversations/{conversation_id}/messages")
def get_conversation_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages for a conversation"""
    # Verify conversation belongs to user
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.timestamp.asc()).all()
    
    return messages

# Conversation locks to ensure sequential processing
conversation_locks = {}
import threading

def get_conversation_lock(conversation_id: int):
    """Get or create a lock for a specific conversation"""
    if conversation_id not in conversation_locks:
        conversation_locks[conversation_id] = threading.Lock()
    return conversation_locks[conversation_id]

@app.post("/user/conversations/{conversation_id}/messages")
def send_message(
    conversation_id: int,
    message_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message in a conversation"""
    # Get conversation lock to ensure sequential processing
    conversation_lock = get_conversation_lock(conversation_id)
    
    with conversation_lock:
        # Verify conversation belongs to user
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        content = message_data.get("content")
        file_ids = message_data.get("file_ids", [])
        
        if not content:
            raise HTTPException(status_code=400, detail="content is required")
        
        # Create user message
        user_message = Message(
            conversation_id=conversation_id,
            role="user",  # Set the role field
            content=content,
            sender_type="user",
            timestamp=datetime.utcnow()
        )
        
        db.add(user_message)
        db.commit()
        db.refresh(user_message)
        
        # Process message with persona's team leader agent
        try:
            # Get conversation history for context
            recent_messages = db.query(Message).filter(
                Message.conversation_id == conversation_id
            ).order_by(Message.timestamp.desc()).limit(10).all()
            
            # Convert to format expected by AgnoTeamService
            conversation_history = []
            for msg in reversed(recent_messages):  # Reverse to get chronological order
                conversation_history.append({
                    "role": msg.role,
                    "content": msg.content
                })
            
            # Process message with persona's team leader
            ai_result = agno_team_service.process_message_with_persona(
                db=db,
                persona_id=conversation.persona_id,
                message=content,
                conversation_history=conversation_history[:-1],  # Exclude the current message
                file_ids=file_ids
            )
            ai_response = ai_result["content"] if isinstance(ai_result, dict) else ai_result
            # Create AI response message
            ai_message = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=ai_response,
                sender_type="persona",
                agent_name="Team Leader",
                timestamp=datetime.utcnow()
            )
            # First persist AI message to get a real ID
            db.add(ai_message)
            db.commit()
            db.refresh(ai_message)

            # Persist raw Agno log if available (now with message_id present)
            try:
                from models import AgentRunLog
                if isinstance(ai_result, dict) and ai_result.get("raw_log"):
                    ansi_cleaner = re.compile(r"\x1B\[[0-?]*[ -/]*[@-~]")
                    clean_log = ansi_cleaner.sub("", ai_result["raw_log"])
                    run_log = AgentRunLog(
                        conversation_id=conversation_id,
                        persona_id=conversation.persona_id,
                        message_id=ai_message.id,
                        raw_log=clean_log,
                    )
                    db.add(run_log)
                    db.commit()
            except Exception as _:
                pass
            
            return {
                "user_message": user_message,
                "ai_response": ai_message
            }
        
        except Exception as e:
            # If agent processing fails, return user message with error
            error_message = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=f"Sorry, I encountered an error: {str(e)}",
                sender_type="system",
                timestamp=datetime.utcnow()
            )
            
            db.add(error_message)
            db.commit()
            db.refresh(error_message)
            
            return {
                "user_message": user_message,
                "ai_response": error_message,
                "error": str(e)
            }

@app.post("/user/conversations/{conversation_id}/messages/stream")
async def send_message_stream(
    conversation_id: int,
    message_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message in a conversation with streaming response"""
    # Get conversation lock to ensure sequential processing
    conversation_lock = get_conversation_lock(conversation_id)
    
    with conversation_lock:
        # Verify conversation belongs to user
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        content = message_data.get("content")
        file_ids = message_data.get("file_ids", [])
        
        if not content:
            raise HTTPException(status_code=400, detail="content is required")
        
        # Create user message
        user_message = Message(
            conversation_id=conversation_id,
            role="user",
            content=content,
            sender_type="user",
            timestamp=datetime.utcnow()
        )
        
        db.add(user_message)
        db.commit()
        db.refresh(user_message)
        
        # Process AI response inside the lock
        try:
            # Get conversation history for context
            recent_messages = db.query(Message).filter(
                Message.conversation_id == conversation_id
            ).order_by(Message.timestamp.desc()).limit(10).all()
            
            # Convert to format expected by AgnoTeamService
            conversation_history = []
            for msg in reversed(recent_messages):
                conversation_history.append({
                    "role": msg.role,
                    "content": msg.content
                })
            
            # Process message with persona's team leader
            ai_result = agno_team_service.process_message_with_persona(
                db=db,
                persona_id=conversation.persona_id,
                message=content,
                conversation_history=conversation_history[:-1],
                file_ids=file_ids
            )
            ai_response = ai_result["content"] if isinstance(ai_result, dict) else ai_result

            # Create AI message
            ai_message = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=ai_response,
                sender_type="persona",
                agent_name="Team Leader",
                timestamp=datetime.utcnow()
            )
            # First persist AI message to get a real ID
            db.add(ai_message)
            db.commit()
            db.refresh(ai_message)

            # Persist raw Agno log if available (now with message_id present)
            try:
                from models import AgentRunLog
                if isinstance(ai_result, dict) and ai_result.get("raw_log"):
                    ansi_cleaner = re.compile(r"\x1B\[[0-?]*[ -/]*[@-~]")
                    clean_log = ansi_cleaner.sub("", ai_result["raw_log"])
                    run_log = AgentRunLog(
                        conversation_id=conversation_id,
                        persona_id=conversation.persona_id,
                        message_id=ai_message.id,
                        raw_log=clean_log,
                    )
                    db.add(run_log)
                    db.commit()
            except Exception:
                pass
            
            db.add(ai_message)
            db.commit()
            db.refresh(ai_message)
            
        except Exception as e:
            # Create error message
            ai_message = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=f"Sorry, I encountered an error: {str(e)}",
                sender_type="system",
                timestamp=datetime.utcnow()
            )
            
            db.add(ai_message)
            db.commit()
            db.refresh(ai_message)
            ai_response = ai_message.content
    
    async def generate_stream():
        try:
            # Send user message first
            yield f"data: {json.dumps({'type': 'user_message', 'data': {'id': user_message.id, 'content': user_message.content, 'role': user_message.role}})}\n\n"
            
            # Simulate streaming by breaking response into character chunks
            chunk_size = 1  # One character per chunk for letter-by-letter streaming
            full_response = ""
            
            for i in range(0, len(ai_response), chunk_size):
                chunk = ai_response[i:i + chunk_size]
                full_response += chunk
                
                # Send chunk
                yield f"data: {json.dumps({'type': 'chunk', 'data': chunk})}\n\n"
                
                # Small delay to simulate streaming
                await asyncio.sleep(0.01)  # Much faster for letter-by-letter
            
            # Send completion signal
            yield f"data: {json.dumps({'type': 'complete', 'data': {'id': ai_message.id, 'content': ai_response, 'role': ai_message.role}})}\n\n"
            
        except Exception as e:
            # Send error
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )

# =============================================================================
# PERSONA MANAGEMENT ENDPOINTS
# =============================================================================

# Persona CRUD Operations
@app.post("/admin/personas", response_model=dict)
def create_persona(
    persona_data: PersonaCreateRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new persona (Admin only) - REQUIRES existing agents to be selected"""
    # Validate that agents are provided and not empty
    if not persona_data.agent_ids or len(persona_data.agent_ids) == 0:
        raise HTTPException(status_code=400, detail="At least one agent must be selected to create a persona")
    
    # Check if persona name already exists
    existing_persona = db.query(Persona).filter(Persona.name == persona_data.name).first()
    if existing_persona:
        raise HTTPException(status_code=400, detail="Persona name already exists")
    
    # Validate that all agent IDs exist and are active
    agents = db.query(Agent).filter(
        Agent.id.in_(persona_data.agent_ids),
        Agent.is_active == True
    ).all()
    
    if len(agents) != len(persona_data.agent_ids):
        raise HTTPException(status_code=400, detail="One or more selected agents do not exist or are inactive")
    
    # Create persona with agents directly
    persona = Persona(
        name=persona_data.name,
        description=persona_data.description,
        instructions=persona_data.instructions,
        model_provider=persona_data.model_provider,
        model_id=persona_data.model_id,
        agents=persona_data.agent_ids,  # Store agent IDs directly
        created_by_admin_id=admin_user.id,
        is_active=True
    )
    
    db.add(persona)
    db.commit()
    db.refresh(persona)
    
    return {
        "id": persona.id,
        "name": persona.name,
        "description": persona.description,
        "instructions": persona.instructions,
        "model_provider": persona.model_provider,
        "model_id": persona.model_id,
        "created_at": persona.created_at,
        "agents_attached": len(persona_data.agent_ids),
        "message": f"Persona '{persona.name}' created successfully with {len(persona_data.agent_ids)} agents"
    }

@app.get("/admin/personas", response_model=List[dict])
def get_all_personas(
    skip: int = 0,
    limit: int = 100,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all personas (Admin only)"""
    personas = db.query(Persona).offset(skip).limit(limit).all()
    
    return [
        {
            "id": persona.id,
            "name": persona.name,
            "description": persona.description,
            "instructions": persona.instructions,
            "model_provider": persona.model_provider,
            "model_id": persona.model_id,
            "agents": persona.agents or [],  # Include agents field
            "is_active": persona.is_active,
            "created_at": persona.created_at,
            "created_by": persona.created_by_admin.email if persona.created_by_admin else None
        }
        for persona in personas
    ]

@app.get("/admin/personas/{persona_id}", response_model=dict)
def get_persona_by_id(
    persona_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get persona by ID (Admin only)"""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    return {
        "id": persona.id,
        "name": persona.name,
        "description": persona.description,
        "instructions": persona.instructions,
        "model_provider": persona.model_provider,
        "model_id": persona.model_id,
        "agents": persona.agents or [],  # Include agents field
        "is_active": persona.is_active,
        "created_at": persona.created_at,
        "created_by": persona.created_by_admin.email if persona.created_by_admin else None
    }

@app.put("/admin/personas/{persona_id}")
def update_persona(
    persona_id: int,
    persona_data: dict,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update persona (Admin only)"""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Update fields if provided
    if "name" in persona_data:
        # Check if new name already exists
        existing_persona = db.query(Persona).filter(
            Persona.name == persona_data["name"],
            Persona.id != persona_id
        ).first()
        if existing_persona:
            raise HTTPException(status_code=400, detail="Persona name already exists")
        persona.name = persona_data["name"]
    
    if "description" in persona_data:
        persona.description = persona_data["description"]
    
    if "instructions" in persona_data:
        persona.instructions = persona_data["instructions"]
    
    if "model_provider" in persona_data:
        persona.model_provider = persona_data["model_provider"]
    
    if "model_id" in persona_data:
        persona.model_id = persona_data["model_id"]
    
    if "agents" in persona_data:
        persona.agents = persona_data["agents"]
    
    persona.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Persona updated successfully"}

@app.delete("/admin/personas/{persona_id}")
def delete_persona(
    persona_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete persona (Admin only)"""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Check if persona is assigned to any users
    active_assignments = db.query(UserPersona).filter(
        UserPersona.persona_id == persona_id,
        UserPersona.is_active == True
    ).count()
    
    if active_assignments > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete persona. It is currently assigned to {active_assignments} user(s). Remove assignments first."
        )
    
    # Soft delete by deactivating
    persona.is_active = False
    persona.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Persona deleted successfully"}

@app.post("/admin/personas/{persona_id}/activate")
def activate_persona(
    persona_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Activate persona (Admin only)"""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    persona.is_active = True
    persona.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Persona activated successfully"}

@app.get("/admin/personas/{persona_id}/users")
def get_persona_users(
    persona_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users assigned to a persona (Admin only)"""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    assignments = db.query(UserPersona).filter(
        UserPersona.persona_id == persona_id,
        UserPersona.is_active == True
    ).all()
    
    users = []
    for assignment in assignments:
        user = db.query(User).filter(User.id == assignment.user_id).first()
        if user:
            users.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "assigned_at": assignment.assigned_at
            })
    
    return {"persona_id": persona_id, "persona_name": persona.name, "users": users}

# =============================================================================
# AGENT MANAGEMENT ENDPOINTS (Admin Only)
# =============================================================================

@app.post("/admin/agents", response_model=AgentResponse)
def create_agent(
    agent_data: AgentCreate,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a standalone agent (Admin only)"""
    # Validate role
    valid_roles = ["team_leader", "specialist", "assistant"]
    if agent_data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
    
    # Create agent (standalone, no persona_id)
    agent = Agent(
        name=agent_data.name,
        role=agent_data.role,
        instructions=agent_data.instructions,
        model_provider=agent_data.model_provider,
        model_id=agent_data.model_id,
        is_active=True
    )
    
    db.add(agent)
    db.commit()
    db.refresh(agent)
    
    # Add tools if specified
    if agent_data.tool_names:
        agno_team_service.add_tools_to_agent(db, agent.id, agent_data.tool_names)
    
    # Get tool names for response
    tool_names = agent.tools or []
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        role=agent.role,
        instructions=agent.instructions,
        model_provider=agent.model_provider,
        model_id=agent.model_id,
        is_active=agent.is_active,
        created_at=agent.created_at,
        tools=tool_names
    )

@app.get("/admin/agents", response_model=AgentListResponse)
def get_all_agents(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all agents (Admin only)"""
    agents = db.query(Agent).filter(Agent.is_active == True).all()
    
    agent_responses = []
    for agent in agents:
        tool_names = agent.tools or []
        
        agent_responses.append(AgentResponse(
            id=agent.id,
            name=agent.name,
            role=agent.role,
            instructions=agent.instructions,
            model_provider=agent.model_provider,
            model_id=agent.model_id,
            is_active=agent.is_active,
            created_at=agent.created_at,
            tools=tool_names
        ))
    
    return AgentListResponse(agents=agent_responses, total=len(agent_responses))

@app.post("/admin/personas/{persona_id}/attach-agent/{agent_id}")
def attach_agent_to_persona(
    persona_id: int,
    agent_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Attach an agent to a persona (Admin only)"""
    # Check if persona exists
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Check if agent exists
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Check if agent is already attached to this persona
    current_agents = persona.agents or []
    if agent_id in current_agents:
        raise HTTPException(status_code=400, detail="Agent is already attached to this persona")
    
    # Add agent to persona's agents list
    updated_agents = current_agents + [agent_id]
    persona.agents = updated_agents
    db.commit()
    
    return {"message": f"Agent '{agent.name}' attached to persona '{persona.name}' successfully"}

@app.post("/admin/personas/{persona_id}/detach-agent/{agent_id}")
def detach_agent_from_persona(
    persona_id: int,
    agent_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Detach an agent from a persona (Admin only)"""
    # Check if persona exists
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Check if agent exists
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Check if agent is attached to this persona
    current_agents = persona.agents or []
    if agent_id not in current_agents:
        raise HTTPException(status_code=404, detail="Agent is not attached to this persona")
    
    # Remove agent from persona's agents list
    updated_agents = [id for id in current_agents if id != agent_id]
    persona.agents = updated_agents
    db.commit()
    
    return {"message": f"Agent '{agent.name}' detached from persona '{persona.name}' successfully"}

@app.get("/admin/personas/{persona_id}/agents", response_model=AgentListResponse)
def get_persona_agents(
    persona_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all agents for a persona (Admin only)"""
    # Check if persona exists
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Get agents from persona's agents list
    agent_ids = persona.agents or []
    agents = db.query(Agent).filter(
        Agent.id.in_(agent_ids),
        Agent.is_active == True
    ).all()
    
    agent_responses = []
    for agent in agents:
        tool_names = agent.tools or []
        
        agent_responses.append(AgentResponse(
            id=agent.id,
            name=agent.name,
            role=agent.role,
            instructions=agent.instructions,
            model_provider=agent.model_provider,
            model_id=agent.model_id,
            is_active=agent.is_active,
            created_at=agent.created_at,
            tools=tool_names
        ))
    
    return AgentListResponse(agents=agent_responses, total=len(agent_responses))

@app.get("/admin/personas/{persona_id}/team-info", response_model=PersonaTeamInfo)
def get_persona_team_info(
    persona_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get team information for a persona (Admin only)"""
    team_info = agno_team_service.get_persona_team_info(db, persona_id)
    return PersonaTeamInfo(**team_info)

@app.put("/admin/agents/{agent_id}")
def update_agent(
    agent_id: int,
    agent_data: AgentCreate,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update an agent (Admin only)"""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Update agent fields
    agent.name = agent_data.name
    agent.role = agent_data.role
    agent.instructions = agent_data.instructions
    agent.model_provider = agent_data.model_provider
    agent.model_id = agent_data.model_id
    agent.tools = agent_data.tool_names  # Use tool_names from AgentCreate model
    agent.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(agent)
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        role=agent.role,
        instructions=agent.instructions,
        model_provider=agent.model_provider,
        model_id=agent.model_id,
        tools=agent.tools,
        is_active=agent.is_active,
        created_at=agent.created_at,
        updated_at=agent.updated_at
    )

@app.delete("/admin/agents/{agent_id}")
def delete_persona_agent(
    agent_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete an agent (Admin only)"""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Soft delete - mark as inactive
    agent.is_active = False
    agent.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Agent deleted successfully"}

@app.post("/admin/personas/{persona_id}/create-agent")
def create_default_agent(
    persona_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a default agent for a persona (Admin only)"""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Check if persona already has agents
    if persona.agents and len(persona.agents) > 0:
        raise HTTPException(status_code=400, detail="Persona already has agents")
    
    # Create default agent
    agent = agno_team_service.create_agent_for_persona(
        db=db,
        persona=persona,
        agent_name=f"{persona.name} Assistant",
        agent_role="assistant",
        instructions=f"You are an assistant for {persona.name}. {persona.instructions or 'Help users with their requests.'}",
        tool_names=["youtube", "file_processing"]  # Default tools
    )
    
    return {"message": "Agent created successfully", "agent_id": agent.id}

# =============================================================================
# TOOLS MANAGEMENT ENDPOINTS (Admin Only)
# =============================================================================

@app.get("/admin/tools")
def get_all_tools(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all tools (Admin only)"""
    tools = db.query(Tool).filter(Tool.is_active == True).all()
    
    tool_responses = []
    for tool in tools:
        tool_responses.append({
            "id": tool.id,
            "name": tool.name,
            "description": tool.description,
            "tool_class": tool.tool_class,
            "config": tool.config,
            "is_active": tool.is_active,
            "created_at": tool.created_at
        })
    
    return tool_responses


# File Upload Endpoints
@app.post("/user/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a file and return file info"""
    try:
        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        file_content = await file.read()
        if len(file_content) > max_size:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")
        
        # Validate file type
        allowed_types = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/zip', 'application/x-rar-compressed',
            'text/javascript', 'text/css', 'text/html', 'text/x-python'
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="File type not allowed")
        
        # Upload to MinIO
        from io import BytesIO
        file_data = BytesIO(file_content)
        file_info = file_service.upload_file(
            file_data, 
            file.filename, 
            file.content_type
        )
        
        # Save file info to database
        db_file = FileModel(
            filename=file_info['filename'],
            object_name=file_info['object_name'],
            file_size=file_info['file_size'],
            content_type=file_info['content_type'],
            bucket_name=file_info['bucket_name'],
            uploaded_by_id=current_user.id
        )
        
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        
        return {
            "file_id": db_file.id,
            "filename": db_file.filename,
            "file_size": db_file.file_size,
            "content_type": db_file.content_type,
            "uploaded_at": db_file.created_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/user/files/{file_id}/download")
async def download_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get download URL for a file"""
    try:
        # Get file info from database
        file_record = db.query(FileModel).filter(FileModel.id == file_id).first()
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check if user has access to this file
        if file_record.uploaded_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Generate download URL
        download_url = file_service.get_download_url(file_record.object_name)
        
        return {
            "download_url": download_url,
            "filename": file_record.filename,
            "file_size": file_record.file_size,
            "content_type": file_record.content_type
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@app.delete("/user/files/{file_id}")
async def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a file"""
    try:
        # Get file info from database
        file_record = db.query(FileModel).filter(FileModel.id == file_id).first()
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check if user has access to this file
        if file_record.uploaded_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete from MinIO
        success = file_service.delete_file(file_record.object_name)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete file from storage")
        
        # Delete from database
        db.delete(file_record)
        db.commit()
        
        return {"message": "File deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

# Logs API endpoints
@app.get("/api/logs")
async def get_all_logs(skip: int = 0, limit: int = 100):
    """Get all logs with pagination"""
    db = SessionLocal()
    try:
        logs = db.query(AgentRunLog).order_by(
            AgentRunLog.created_at.desc()
        ).offset(skip).limit(limit).all()
        
        total_count = db.query(AgentRunLog).count()
        
        return {
            "logs": [
                {
                    "id": log.id,
                    "conversation_id": log.conversation_id,
                    "persona_id": log.persona_id,
                    "message_id": log.message_id,
                    "raw_log": log.raw_log,
                    "created_at": log.created_at.replace(tzinfo=pytz.UTC).astimezone(IST).isoformat()
                }
                for log in logs
            ],
            "total_count": total_count,
            "skip": skip,
            "limit": limit
        }
    finally:
        db.close()

@app.get("/api/logs/{conversation_id}")
async def get_conversation_logs(conversation_id: int):
    """Get logs for a specific conversation"""
    db = SessionLocal()
    try:
        logs = db.query(AgentRunLog).filter(
            AgentRunLog.conversation_id == conversation_id
        ).order_by(AgentRunLog.created_at.desc()).all()
        
        return {
            "conversation_id": conversation_id,
            "logs": [
                {
                    "id": log.id,
                    "persona_id": log.persona_id,
                    "message_id": log.message_id,
                    "raw_log": log.raw_log,
                    "created_at": log.created_at.replace(tzinfo=pytz.UTC).astimezone(IST).isoformat()
                }
                for log in logs
            ]
        }
    finally:
        db.close()

@app.get("/api/models")
async def get_available_models():
    """Get all available models from all providers"""
    try:
        models = model_service.get_all_models()
        return {
            "success": True,
            "data": models,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": model_service.get_all_models(),  # Return fallback data
            "timestamp": datetime.utcnow().isoformat()
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
