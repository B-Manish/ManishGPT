from fastapi import FastAPI, Request,Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.models.groq import Groq
from dotenv import load_dotenv
import os
from typing import Any, Dict, List, Optional


from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import Base, Conversation, Message
from typing import List
from datetime import datetime



load_dotenv("config.env")

app = FastAPI()

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

agent = Agent(
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
    











