from textwrap import dedent

from agno.models.openai import OpenAIChat
from agno.models.groq import Groq
import sys
from pathlib import Path

# Ensure module imports work whether running from project root, backend/, or agents/
_current_file = Path(__file__).resolve()
_backend_dir = _current_file.parents[1]  # .../backend
_project_root = _current_file.parents[2]  # .../ManishGPT
for _p in (str(_project_root), str(_backend_dir)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from backend.agents.factory import create_agent


youtube_agent = create_agent(
    name="Basic Agent",
    instructions="You are a helpful YouTube assistant. When given a YouTube URL, extract and provide the video transcript. You can also answer general questions about YouTube videos and have casual conversations.",
    tool_names=["youtube"],
    model_provider="openai",
    model_id="gpt-4.1-nano",
    show_tool_calls=True,
    debug_mode=False,
)


result = youtube_agent.run("https://www.youtube.com/watch?v=nRegbipwCsc&ab_channel=Mrwhosetheboss")
print("result", result.content)