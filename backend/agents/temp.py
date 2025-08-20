from urllib.parse import parse_qs, urlencode, urlparse
from typing import Any, Dict, List, Optional
from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp

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

import numpy as np
from PIL import Image
try:
    import cv2
    import pytesseract
except ImportError:
    cv2 = None
    pytesseract = None

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


def get_transcript_from_video(url: str):
    video_id=get_youtube_video_id(url)
    ytt_api = YouTubeTranscriptApi()
    transcript = ytt_api.fetch(video_id)
    all_text = " ".join([snippet.text for snippet in transcript.snippets])
    return all_text


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





def get_youtube_chapters(url: str):
    """
    Retrieve creator-defined chapter timestamps for a YouTube video.

    Returns structured chapter markers—each with a title and start/end times in seconds—if they exist for the given video.

    Args:
        url (str): A YouTube video URL (any share/watch format) or a value accepted by your URL-to-ID helper.

    Returns:
        list[dict] | None: A list of chapter objects, or None if no chapters are available.
            Each chapter dict includes:
              - "start_time" (float): Start time in seconds.
              - "end_time"   (float): End time in seconds.
              - "title"      (str): Chapter title (e.g., game name).
    """
    video_id=get_youtube_video_id(url)
    modified_url=f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = {"quiet": True, "skip_download": True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(modified_url, download=False)
    return info.get("chapters") 





def get_frame_numbers(games, fps=30):
    """
    Compute the middle-frame index for each game segment and return it with the game name.

    Args:
        games (list[dict]): Each dict must include:
            - "title" (str): Game name.
            - "start_time" (float|int): Segment start time in seconds.
            - "end_time"   (float|int): Segment end time in seconds.
        fps (int|float, optional): Video frames per second. Defaults to 30.

    Returns:
        list[dict]: For each input segment, a dict with:
            - "game_name"   (str): Copied from the segment's "title".
            - "frame_number" (int): Zero-based frame index at the segment midpoint,
              computed as round(((start_time + end_time) / 2) * fps).

    Notes:
        Assumes a constant frame rate and valid start/end times within the video duration.
    """
    frames = []
    for game in games:
        mid_t = (float(game["start_time"]) + float(game["end_time"])) / 2.0
        frames.append(int(round(mid_t * fps)))
        # gamedata={"game_name":game["title"],"frame_number":int(round(mid_t * fps))}
        # frames.append(gamedata)
    return frames






        # """
        # Download a YouTube video and extract specific frames.

        # Args:
        #     url: YouTube video URL.
        #     frame_numbers: List of specific frame numbers to extract (0-indexed).
        #     every_n_seconds: Save one frame every N seconds (alternative to frame_numbers).
        #     output_dir: Directory to save frames; temp dir created if None.
        #     max_frames: Optional cap on number of frames to save.
        #     start_time: Start time (seconds) to begin extraction.
        #     end_time: Optional end time (seconds) to stop extraction.
        #     image_format: Image format to save (e.g., 'png', 'jpg').

        # Returns:
        #     str: JSON string with metadata and saved frame paths.
        # """
def download_youtube_frames(url: str,frame_numbers: Optional[List[int]] = None,every_n_seconds: Optional[float] = None,output_dir: Optional[str] = None,max_frames: Optional[int] = None,start_time: float = 0.0,end_time: Optional[float] = None,image_format: str = "png",)->str:

    if not url:
        return "No URL provided"

    if cv2 is None:
        return "OpenCV (cv2) not installed. Please install with `pip install opencv-python`."
    if yt_dlp is None:
        return "yt_dlp not installed. Please install with `pip install yt-dlp`."

    log_debug(f"Extracting frames from YouTube video: {url}")

    # 1) Download video to a temp file (MP4 preferred)
    temp_root = output_dir or tempfile.mkdtemp(prefix="yt_frames_")
    os.makedirs(temp_root, exist_ok=True)
    temp_video_path = os.path.join(temp_root, "video.mp4")

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "outtmpl": temp_video_path,
        # Prefer mp4 container; fallback to best
        # "format": "best[ext=mp4]/best",
        "format": "best" 
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        return f"Error downloading video with yt_dlp: {e}"

    if not os.path.exists(temp_video_path):
        # yt_dlp may use different filename; try to locate it
        # fallback: find first file in temp_root
        candidates = [str(Path(p)) for p in Path(temp_root).glob("*") if Path(p).is_file()]
        if candidates:
            temp_video_path = candidates[0]
        if not os.path.exists(temp_video_path):
            return "Download completed but video file not found."

    # 2) Open with OpenCV and compute sampling interval
    cap = cv2.VideoCapture(temp_video_path)
    if not cap.isOpened():
        return "Failed to open downloaded video with OpenCV."

    fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total_frames / fps if fps > 0 else None

    if fps <= 0:
        cap.release()
        return "Could not read FPS from video; cannot determine frame interval."

    # Determine extraction mode
    if frame_numbers is not None:
        # Extract specific frame numbers
        extraction_mode = "frame_numbers"
        target_frames = sorted(set(frame_numbers))  # Remove duplicates and sort
        if max_frames is not None:
            target_frames = target_frames[:max_frames]
    elif every_n_seconds is not None:
        # Extract frames at regular intervals
        extraction_mode = "interval"
        frames_per_step = max(int(round(fps * max(0.001, every_n_seconds))), 1)
    else:
        cap.release()
        return "Either frame_numbers or every_n_seconds must be provided"

    # Seek to start_time
    if start_time and start_time > 0:
        cap.set(cv2.CAP_PROP_POS_MSEC, start_time * 1000.0)

    # Prepare output subfolder for frames
    frames_dir = os.path.join(temp_root, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    saved_paths: List[str] = []
    frame_index = int(cap.get(cv2.CAP_PROP_POS_FRAMES)) if start_time > 0 else 0
    saved_count = 0

    try:
        while True:
            # Respect end_time
            if end_time is not None:
                current_time_sec = (cap.get(cv2.CAP_PROP_POS_MSEC) or 0.0) / 1000.0
                if current_time_sec >= end_time:
                    break

            ret, frame = cap.read()
            if not ret:
                break

            should_save = False
                
            if extraction_mode == "frame_numbers":
                # Save this frame if it's in our target list
                if frame_index in target_frames:
                    should_save = True
                    target_frames.remove(frame_index)  # Remove from list to avoid duplicates
            elif extraction_mode == "interval":
                # Save this frame if it lands on our sampling step
                if frame_index % frames_per_step == 0:
                    should_save = True

            if should_save:
                # Build filename with timestamp and frame number
                ts_msec = cap.get(cv2.CAP_PROP_POS_MSEC) or 0.0
                ts_sec = ts_msec / 1000.0
                fname = f"frame_{frame_index:06d}_t{ts_sec:.2f}.{image_format}"
                fpath = os.path.join(frames_dir, fname)

                # Write with OpenCV (BGR). If JPG, you can adjust quality via params if needed.
                ok = cv2.imwrite(fpath, frame)
                if ok:
                    saved_paths.append(fpath)
                    saved_count += 1
                    if max_frames is not None and saved_count >= max_frames:
                        break

            frame_index += 1
    finally:
        cap.release()

    # return json.dumps(result, indent=2)
    print("saved_paths",saved_paths)
    return saved_paths


def bytes_to_data_url(data: bytes, mime: str = "image/png") -> str:
    return f"data:{mime};base64,{base64.b64encode(data).decode('utf-8')}"

def extract_text_from_image(image_path: str) -> str:
    """
    Extract all visible text from an image using GPT-4o-mini.
        
    Args:
        image_path (str): Path to the image file
            
    Returns:
        str: Extracted text from the image
    """
    with open(image_path, "rb") as f:
        data_url = bytes_to_data_url(f.read(), mime="image/png")

    resp = completion(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": "Extract ALL visible text. No cleanup."},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        }],
        temperature=0,
    )
    print("op: ",resp.choices[0].message.content)
    return resp.choices[0].message.content

def main():
    yt_url="https://www.youtube.com/watch?v=bAq3t8xaQQU&ab_channel=DailyValorant"
    # yt_dlp_chapters=get_youtube_chapters(yt_url)
    # frame_numbers=get_frame_numbers(yt_dlp_chapters)
    # tmp_paths=download_youtube_frames(yt_url,frame_numbers)
    # for path in tmp_paths:
    #     extract_text_from_image(path)
    transcript=get_transcript_from_video(yt_url)
    print("gg transcript", transcript)

    # resp = completion(
    #     model="gpt-4o-mini",
    #     messages=[{
    #         "role": "user",
    #         "content": [
    #             {"type": "text", "text": f"Summarise this: {all_text}"},
    #         ],
    #     }],
    #     temperature=0,
    # )
    # print("resp: ",resp.choices[0].message.content)

    
    

main()


