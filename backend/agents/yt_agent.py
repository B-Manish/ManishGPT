from textwrap import dedent

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.models.groq import Groq
from agno.tools.youtube import YouTubeTools
from dotenv import load_dotenv
import os

load_dotenv()


open_ai_api_key = os.getenv("OPENAI_API_KEY")
groq_api_key = os.getenv("GROQ_API_KEY")

youtube_agent = Agent(
    name="YouTube Agent",
    model=OpenAIChat(id="gpt-4o-mini",api_key=open_ai_api_key),
    # model=Groq(id="llama-3.3-70b-versatile",api_key=groq_api_key),
    tools=[YouTubeTools()],
    show_tool_calls=True,
    instructions="compare the data such as gpu temperarature, framerate , ram usage and gpu and cpu utilization of each game in the video",
    debug_mode=True,
    add_datetime_to_instructions=True,
    markdown=True,
)


result=youtube_agent.run("https://www.youtube.com/watch?v=iDRlfyQiveg&ab_channel=MarkPC")
print("result",result.content)