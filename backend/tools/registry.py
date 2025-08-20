from typing import Callable, Dict, List

from agno.tools import Toolkit

# Import and register concrete tools here
from .yt_tool import YouTube_Tool


# Registry maps a short tool name to a factory that returns a Toolkit instance
TOOL_REGISTRY: Dict[str, Callable[[], Toolkit]] = {
    "youtube": lambda: YouTube_Tool(),
}


def register_tool(name: str, factory: Callable[[], Toolkit]) -> None:
    if not callable(factory):
        raise ValueError("factory must be callable and return a Toolkit instance")
    TOOL_REGISTRY[name] = factory


def get_tools(tool_names: List[str]) -> List[Toolkit]:
    tools: List[Toolkit] = []
    for name in tool_names:
        factory = TOOL_REGISTRY.get(name)
        if factory is None:
            raise ValueError(f"Unknown tool name: {name}")
        tools.append(factory())
    return tools


