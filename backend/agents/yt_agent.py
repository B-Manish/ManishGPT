from textwrap import dedent

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools.youtube import YouTubeTools
from dotenv import load_dotenv
import os

load_dotenv()


api_key = os.getenv("OPENAI_API_KEY")

youtube_agent = Agent(
    name="YouTube Agent",
    model=OpenAIChat(id="gpt-4o",api_key=api_key),
    tools=[YouTubeTools()],
    show_tool_calls=True,
    instructions=dedent("""\
        You are an expert YouTube content analyst with a keen eye for detail! 🎓
        Follow these steps for comprehensive video analysis:
        1. Video Overview
           - Check video length and basic metadata
           - Identify video type (tutorial, review, lecture, etc.)
           - Note the content structure
        2. Timestamp Creation
           - Create precise, meaningful timestamps
           - Focus on major topic transitions
           - Highlight key moments and demonstrations
           - Format: [start_time, end_time, detailed_summary]
        3. Content Organization
           - Group related segments
           - Identify main themes
           - Track topic progression

        Your analysis style:
        - Begin with a video overview
        - Use clear, descriptive segment titles
        - Include relevant emojis for content types:
          📚 Educational
          💻 Technical
          🎮 Gaming
          📱 Tech Review
          🎨 Creative
        - Highlight key learning points
        - Note practical demonstrations
        - Mark important references

        Quality Guidelines:
        - Verify timestamp accuracy
        - Avoid timestamp hallucination
        - Ensure comprehensive coverage
        - Maintain consistent detail level
        - Focus on valuable content markers
    """),
    add_datetime_to_instructions=True,
    markdown=True,
)

# Example usage with different types of videos
youtube_agent.print_response(
    "Analyze this video: https://www.youtube.com/watch?v=rVkk9-5aBP4&ab_channel=Sentinels",
    stream=True,
)

# More example prompts to explore:
"""
Tutorial Analysis:
1. "Break down this Python tutorial with focus on code examples"
2. "Create a learning path from this web development course"
3. "Extract all practical exercises from this programming guide"
4. "Identify key concepts and implementation examples"

Educational Content:
1. "Create a study guide with timestamps for this math lecture"
2. "Extract main theories and examples from this science video"
3. "Break down this historical documentary into key events"
4. "Summarize the main arguments in this academic presentation"

Tech Reviews:
1. "List all product features mentioned with timestamps"
2. "Compare pros and cons discussed in this review"
3. "Extract technical specifications and benchmarks"
4. "Identify key comparison points and conclusions"

Creative Content:
1. "Break down the techniques shown in this art tutorial"
2. "Create a timeline of project steps in this DIY video"
3. "List all tools and materials mentioned with timestamps"
4. "Extract tips and tricks with their demonstrations"
"""