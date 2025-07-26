from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.models.groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

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
