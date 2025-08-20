from typing import List, Optional

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.models.groq import Groq

from dotenv import load_dotenv
import os

try:
    from backend.tools.registry import get_tools
except ModuleNotFoundError:
    from tools.registry import get_tools


load_dotenv()


def create_agent(
    name: str,
    instructions: str,
    tool_names: Optional[List[str]] = None,
    model_provider: str = "openai",
    model_id: str = "gpt-4.1-nano",
    show_tool_calls: bool = True,
    debug_mode: bool = False,
    markdown: bool = True,
) -> Agent:
    open_ai_api_key = os.getenv("OPENAI_API_KEY")
    groq_api_key = os.getenv("GROQ_API_KEY")

    if model_provider.lower() == "openai":
        model = OpenAIChat(id=model_id, api_key=open_ai_api_key)
    elif model_provider.lower() == "groq":
        model = Groq(id=model_id, api_key=groq_api_key)
    else:
        raise ValueError(f"Unknown model_provider: {model_provider}")

    tools = get_tools(tool_names or [])

    return Agent(
        name=name,
        model=model,
        tools=tools,
        show_tool_calls=show_tool_calls,
        instructions=instructions,
        debug_mode=debug_mode,
        add_datetime_to_instructions=True,
        markdown=markdown,
    )


