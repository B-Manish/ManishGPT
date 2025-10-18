"""
Web Search Tool for Agno
"""
from typing import Dict, Any, List
from agno.tools import Toolkit
import requests
import json


class WebSearchTool(Toolkit):
    """Tool for performing web searches"""
    
    def __init__(self):
        super().__init__()
        self.name = "web_search"
        self.description = "Search the web for information on any topic"
    
    def search_web(self, query: str, num_results: int = 5) -> str:
        """
        Search the web for information
        
        Args:
            query: The search query
            num_results: Number of results to return (default: 5)
            
        Returns:
            Search results as a formatted string
        """
        try:
            # For now, we'll use a simple mock implementation
            # In production, you'd integrate with a real search API like Google Search API, Bing API, etc.
            
            # Mock search results for demonstration
            mock_results = [
                {
                    "title": f"Search Result 1 for '{query}'",
                    "url": "https://example.com/result1",
                    "snippet": f"This is a mock search result for the query '{query}'. In a real implementation, this would contain actual search results from a search engine."
                },
                {
                    "title": f"Search Result 2 for '{query}'",
                    "url": "https://example.com/result2", 
                    "snippet": f"Another mock result for '{query}'. This demonstrates how web search results would be formatted and returned."
                },
                {
                    "title": f"Search Result 3 for '{query}'",
                    "url": "https://example.com/result3",
                    "snippet": f"Third mock result for '{query}'. Real implementation would use actual search APIs."
                }
            ]
            
            # Format results
            formatted_results = f"Web Search Results for '{query}':\n\n"
            for i, result in enumerate(mock_results[:num_results], 1):
                formatted_results += f"{i}. {result['title']}\n"
                formatted_results += f"   URL: {result['url']}\n"
                formatted_results += f"   {result['snippet']}\n\n"
            
            return formatted_results
            
        except Exception as e:
            return f"Error performing web search: {str(e)}"
    
    def get_tools(self) -> List[Dict[str, Any]]:
        """Return the tools provided by this toolkit"""
        return [
            {
                "name": "search_web",
                "description": "Search the web for information on any topic",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The search query"
                        },
                        "num_results": {
                            "type": "integer",
                            "description": "Number of results to return",
                            "default": 5
                        }
                    },
                    "required": ["query"]
                }
            }
        ]
