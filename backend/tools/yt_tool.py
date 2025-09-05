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
        **kwargs,
    ):
        print("gg YouTube_Tool init")

        tools: List[Any] = []

        tools.append(self.get_youtube_video_id)
        tools.append(self.get_transcript_from_video)
        tools.append(self.summarize_transcript)

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
        print(f"🔍 get_transcript_from_video called with URL: {url}")
        try:
            video_id = self.get_youtube_video_id(url)
            print(f"📹 Extracted video ID: {video_id}")
            
            if not video_id:
                return "Error: Could not extract video ID from URL"
            
            ytt_api = YouTubeTranscriptApi()
            print("📝 Fetching transcript...")
            transcript = ytt_api.fetch(video_id)
            
            # Join all transcript snippets with proper spacing
            all_text = " ".join([snippet.text for snippet in transcript.snippets])
            
            print(f"✅ Transcript fetched successfully, length: {len(all_text)} characters")
            print(f"📄 First 200 chars: {all_text[:200]}...")
            print(f"📄 Last 200 chars: ...{all_text[-200:]}")
            
            # Ensure we return the full transcript
            if len(all_text) == 0:
                return "No transcript available for this video"
            
            return all_text
        except Exception as e:
            print(f"❌ Error in get_transcript_from_video: {str(e)}")
            import traceback
            traceback.print_exc()
            return f"Error fetching transcript: {str(e)}"
    
    def summarize_transcript(self, transcript_text: str) -> str:
        """Summarize the provided transcript text.
        Args:
            transcript_text (str): The transcript text to summarize.
        Returns:
            str: A concise summary of the transcript.
        """
        print(f"📊 summarize_transcript called with text length: {len(transcript_text)}")
        try:
            print("🤖 Calling OpenAI for summary...")
            resp = completion(
                model="gpt-4o-mini",
                messages=[{
                    "role": "user",
                    "content": f"Please provide a concise summary of this transcript: {transcript_text}"
                }],
            )
            summary = resp.choices[0].message.content
            print(f"✅ Summary generated successfully, length: {len(summary)}")
            return summary
        except Exception as e:
            print(f"❌ Error in summarize_transcript: {str(e)}")
            return f"Error summarizing transcript: {str(e)}"



