from fastapi import FastAPI, Request,Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.models.groq import Groq
from dotenv import load_dotenv
import os


from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import Base, Conversation, Message
from typing import List
from datetime import datetime

load_dotenv()

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
# api_key = os.getenv("OPENAI_API_KEY")
api_key = os.getenv("GROQ_API_KEY")

agent = Agent(
    name="Basic Agent",
    # model=OpenAIChat(id="gpt-4o", api_key=api_key),
    model=Groq(id="llama-3.3-70b-versatile",api_key=api_key),
    add_history_to_messages=True,
    num_history_responses=5,
    add_datetime_to_instructions=True,
    markdown=True,
)

# Pydantic model for the request body
class Prompt(BaseModel):
    message: str

@app.post("/run-agent")
async def run_agent(prompt: Prompt):
    try:
        run = agent.run(prompt.message)
        return {"response": run.content}
    except Exception as e:
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
    