from fastapi import FastAPI, Request,Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.models.groq import Groq
from dotenv import load_dotenv
import os
from typing import Any, Dict, List, Optional
from youtube_transcript_api import YouTubeTranscriptApi
from litellm import completion
from agno.tools import tool


from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import Base, Conversation, Message
from typing import List
from datetime import datetime

from urllib.parse import parse_qs, urlencode, urlparse

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
openai_api_key = os.getenv("OPENAI_API_KEY")
groq_api_key = os.getenv("GROQ_API_KEY")

agent = Agent(
    name="Basic Agent",
    # model=OpenAIChat(id="gpt-4o", api_key=openai_api_key),
    model=Groq(id="llama-3.3-70b-versatile",api_key=groq_api_key),
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
    



def get_youtube_video_id(url: str) -> Optional[str]:
    """Function to get the video ID from a YouTube URL.

    Args:
        url: The URL of the YouTube video.

    Returns:
        str: The video ID of the YouTube video.
    """
    parsed_url = urlparse(url)
    hostname = parsed_url.hostname

    if hostname == "youtu.be":
        return parsed_url.path[1:]
    if hostname in ("www.youtube.com", "youtube.com"):
        if parsed_url.path == "/watch":
            query_params = parse_qs(parsed_url.query)
            return query_params.get("v", [None])[0]
        if parsed_url.path.startswith("/embed/"):
            return parsed_url.path.split("/")[2]
        if parsed_url.path.startswith("/v/"):
            return parsed_url.path.split("/")[2]
    return None




@tool()
def get_yt_video_summary(yt_url:str):
    print("yt_url",yt_url)
    video_id=get_youtube_video_id(yt_url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    ytt_api = YouTubeTranscriptApi()
    transcript = ytt_api.fetch(video_id)
    all_text = " ".join([snippet.text for snippet in transcript.snippets])

    resp = completion(
    model="gpt-5-nano",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": f"Summarise this: {all_text}"},
        ],
    }],
    )
    summarized_text=resp.choices[0].message.content
    output={"transcript":all_text,"summary":summarized_text}
    print("gg output",output)
    return output


class MovieScript(BaseModel):
    transript: str = Field(..., description="transcript of the yt video")
    summary: str = Field(..., description="SUmmary of the yt video")


yt_agent = Agent(
    name="Yt Summarizer agent",
    model=OpenAIChat(id="gpt-5-nano", api_key=openai_api_key),
    # model=Groq(id="llama-3.3-70b-versatile",api_key=groq_api_key),
    instructions=["You are a YouTube video summarizer. Only use the get_yt_video_summary tool when a user provides a YouTube URL. If no URL is provided, ask the user to provide a YouTube URL first. Do not call any tools unless a YouTube URL is explicitly shared. The user wants the raw tool output exactly as returned."],
    tools=[get_yt_video_summary],
    add_history_to_messages=True,
    num_history_responses=5,
    add_datetime_to_instructions=True,
    markdown=True,
    response_model=MovieScript,    
)


@app.post("/run-yt-summarizer-agent")
async def run_yt_summarizer_agent(prompt: Prompt):
    try:
        run = yt_agent.run(prompt.message)
        return {"response": run.content}
    except Exception as e:
        return {"error": str(e)}


# YouTube Agent API using the factory pattern
try:
    from backend.agents.factory import create_agent
except ModuleNotFoundError:
    from agents.factory import create_agent

@app.post("/run-youtube-agent")
async def run_youtube_agent(prompt: Prompt):
    """Run the YouTube agent to get video transcripts and timestamps."""
    try:
        # Create the YouTube agent using the factory
        youtube_agent = create_agent(
            name="YouTube Agent",
            instructions="Give the transcript of the video",
            tool_names=["youtube"],
            model_provider="openai",
            model_id="gpt-4.1-nano",
            show_tool_calls=True,
            debug_mode=False,
        )
        
        # Run the agent with the user's message
        result = youtube_agent.run(prompt.message)
        return {"response": result.content}
    except Exception as e:
        return {"error": str(e)}