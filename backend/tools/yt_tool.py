import json
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import urlopen

from agno.tools import Toolkit
from agno.utils.log import log_debug
import base64
from litellm import completion


import os
import re
import json
import tempfile
import subprocess
from pathlib import Path
from typing import Tuple

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    raise ImportError(
        "`youtube_transcript_api` not installed. Please install using `pip install youtube_transcript_api`"
    )


try:
    import yt_dlp
except ImportError:
    yt_dlp = None


class YouTube_Tool(Toolkit):
    def __init__(
        self,
        # languages: Optional[List[str]] = None,
        # proxies: Optional[Dict[str, Any]] = None,
        **kwargs,
    ):
        # self.languages: Optional[List[str]] = languages
        # self.proxies: Optional[Dict[str, Any]] = proxies

        tools: List[Any] = []

        tools.append(self.get_youtube_video_id)
        tools.append(self.get_transcript_from_video)

        super().__init__(name="youtube_tools", tools=tools, **kwargs)



    def get_youtube_video_id(self, url: str) -> Optional[str]:
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
    
    def get_transcript_from_video(self, url: str) -> str:
        """Extract the full transcript text from a YouTube video.
        Args:
            url (str): The URL of the YouTube video to extract transcript from.
        Returns:
            str: The complete transcript text as a single string, with all snippets joined together.
                Returns empty string if no transcript is available.
        """
        video_id = self.get_youtube_video_id(url)
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id)
        all_text = " ".join([snippet.text for snippet in transcript.snippets])
        # print("transcript from tool:",all_text)
        return all_text



