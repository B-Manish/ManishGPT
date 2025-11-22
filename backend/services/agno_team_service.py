"""
AgnoTeamService - Manages Agno agents and teams for personas
"""
from typing import List, Optional, Dict, Any
from contextlib import contextmanager
import sys
import io
from sqlalchemy.orm import Session
from agno.agent import Agent as AgnoAgent
from agno.team.team import Team
from agno.models.openai import OpenAIChat
from agno.models.groq import Groq
from agno.db.postgres import PostgresDb
from dotenv import load_dotenv
import os
import json

from models import Persona, Agent as AgentModel, Tool
from tools.registry import get_tools

load_dotenv()


class AgnoTeamService:
    """Service to manage Agno agents and teams for personas"""
    
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        
        # Initialize Agno PostgresDb for agentic memory
        # Convert SQLAlchemy URL format to Agno format (postgresql+psycopg://)
        database_url = os.getenv(
            "DATABASE_URL", 
            "postgresql://postgres:manish@localhost:5432/manishgpt"
        )
        # Convert postgresql:// to postgresql+psycopg:// for Agno
        if database_url.startswith("postgresql://"):
            agno_db_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        elif database_url.startswith("postgresql+psycopg://"):
            agno_db_url = database_url
        else:
            # Try to construct it
            agno_db_url = database_url.replace("://", "+psycopg://", 1) if "://" in database_url else database_url
        
        try:
            self.agno_db = PostgresDb(db_url=agno_db_url)
            print(f"✅ Agno PostgresDb initialized for agentic memory")
        except Exception as e:
            print(f"⚠️  Warning: Could not initialize Agno PostgresDb: {e}")
            print("   Agentic memory will be disabled")
            self.agno_db = None
    
    def create_agent_from_model(self, agent_model: AgentModel, enable_memory: bool = True) -> AgnoAgent:
        """Create an Agno Agent from database Agent model with agentic memory support"""
        # Get model
        if agent_model.model_provider.lower() == "openai":
            model = OpenAIChat(id=agent_model.model_id, api_key=self.openai_api_key)
        elif agent_model.model_provider.lower() == "groq":
            model = Groq(id=agent_model.model_id, api_key=self.groq_api_key)
        else:
            raise ValueError(f"Unknown model_provider: {agent_model.model_provider}")
        
        # Get tools for this agent from JSON column
        tool_names = agent_model.tools or []
        tools = get_tools(tool_names)
        
        # Create Agno Agent with role and agentic memory
        agent_kwargs = {
            "name": agent_model.name,
            "role": f"{agent_model.role}: {agent_model.instructions}",  # Role with instructions
            "model": model,
            "tools": tools,
            "debug_mode": True,
            "debug_level": 2,
        }
        
        # Enable agentic memory if database is available
        if enable_memory and self.agno_db is not None:
            agent_kwargs["db"] = self.agno_db
            agent_kwargs["enable_agentic_memory"] = True
        
        return AgnoAgent(**agent_kwargs)
    
    def create_team_from_persona(self, db: Session, persona_id: int) -> Optional[Team]:
        """Create an Agno Team from a persona's agents"""
        # Get the persona
        persona = db.query(Persona).filter(Persona.id == persona_id).first()
        if not persona:
            return None
        
        # Get all active agents for this persona
        if not persona.agents or len(persona.agents) == 0:
            return None
        
        # Get agent models from database
        agent_models = db.query(AgentModel).filter(
            AgentModel.id.in_(persona.agents),
            AgentModel.is_active == True
        ).all()
        
        if not agent_models:
            return None
        
        # If only one agent, return single agent wrapped in team
        if len(agent_models) == 1:
            single_agent = self.create_agent_from_model(agent_models[0])
            
            # Get model for team
            if persona.model_provider.lower() == "openai":
                team_model = OpenAIChat(id=persona.model_id, api_key=self.openai_api_key)
            elif persona.model_provider.lower() == "groq":
                team_model = Groq(id=persona.model_id, api_key=self.groq_api_key)
            else:
                team_model = OpenAIChat(id="gpt-4o", api_key=self.openai_api_key)
            
            # Create a team with single member
            team_kwargs = {
                "name": f"{persona.name} Team",
                "model": team_model,
                "members": [single_agent],
                "instructions": [
                    persona.instructions or f"You are {persona.name}. Help users with their requests."
                ],
                "debug_mode": True,
                "debug_level": 2,
                "show_members_responses": True,
                "markdown": True,
            }
            
            # Enable team memory if database is available
            if self.agno_db is not None:
                team_kwargs["db"] = self.agno_db
                team_kwargs["enable_user_memories"] = True
            
            return Team(**team_kwargs)
        
        # Multiple agents - create true collaborative team
        team_members = []
        for agent_model in agent_models:
            try:
                agno_agent = self.create_agent_from_model(agent_model)
                team_members.append(agno_agent)
            except Exception as e:
                print(f"Error creating agent {agent_model.name}: {e}")
                continue
        
        if not team_members:
            return None
        
        # Get model for team
        if persona.model_provider.lower() == "openai":
            team_model = OpenAIChat(id=persona.model_id, api_key=self.openai_api_key)
        elif persona.model_provider.lower() == "groq":
            team_model = Groq(id=persona.model_id, api_key=self.groq_api_key)
        else:
            team_model = OpenAIChat(id="gpt-4o", api_key=self.openai_api_key)
        
        # Build team instructions from persona config or defaults
        team_instructions = []
        if persona.instructions:
            team_instructions.append(persona.instructions)
        
        # Add role-based delegation instructions
        team_instructions.extend([
            "You are the team leader coordinating specialized agents.",
            "Analyze the user's request and delegate tasks to the most appropriate team members.",
            "Each team member has specific expertise - use them effectively.",
            "Synthesize the team members' responses into a comprehensive answer.",
        ])
        
        # Create Team
        team_kwargs = {
            "name": f"{persona.name} Team",
            "model": team_model,
            "members": team_members,
            "instructions": team_instructions,
            "debug_mode": True,
            "debug_level": 2,
            "show_members_responses": True,
            "markdown": True,
            "add_member_tools_to_context": False,  # Keep tool context clean
        }
        
        # Enable team memory if database is available
        if self.agno_db is not None:
            team_kwargs["db"] = self.agno_db
            team_kwargs["enable_user_memories"] = True
        
        team = Team(**team_kwargs)
        
        return team
    
    def get_persona_team_leader(self, db: Session, persona_id: int) -> Optional[AgnoAgent]:
        """Get any active agent for a persona (previously called team leader)"""
        # Get persona
        persona = db.query(Persona).filter(Persona.id == persona_id).first()
        if not persona or not persona.agents:
            return None
        
        # Get first active agent from the agents list
        agent_ids = persona.agents
        for agent_id in agent_ids:
            agent_model = db.query(AgentModel).filter(
                AgentModel.id == agent_id,
                AgentModel.is_active == True
            ).first()
            
            if agent_model:
                return self.create_agent_from_model(agent_model)
        
        return None
    
    def get_persona_agents(self, db: Session, persona_id: int) -> List[AgnoAgent]:
        """Get all active agents for a persona"""
        # Get persona
        persona = db.query(Persona).filter(Persona.id == persona_id).first()
        if not persona or not persona.agents:
            return []
        
        agents = []
        agent_ids = persona.agents
        for agent_id in agent_ids:
            agent_model = db.query(AgentModel).filter(
                AgentModel.id == agent_id,
                AgentModel.is_active == True
            ).first()
            
            if agent_model:
                try:
                    agent = self.create_agent_from_model(agent_model)
                    agents.append(agent)
                except Exception as e:
                    print(f"Error creating agent {agent_model.name}: {e}")
                    continue
        
        return agents
    
    def create_agent_for_persona(
        self, 
        db: Session, 
        persona: Persona, 
        agent_name: str,
        agent_role: str = "assistant",
        instructions: str = None,
        tool_names: Optional[List[str]] = None
    ) -> AgentModel:
        """Create an agent for a persona"""
        # Use persona instructions if none provided
        if instructions is None:
            instructions = persona.instructions or f"You are an assistant for {persona.name}. Help users with their requests."
        
        # Create agent model (standalone)
        agent_model = AgentModel(
            name=agent_name,
            role=agent_role,
            instructions=instructions,
            model_provider=persona.model_provider,
            model_id=persona.model_id,
            is_active=True
        )
        
        db.add(agent_model)
        db.commit()
        db.refresh(agent_model)
        
        # Add agent to persona's agents list
        if persona.agents is None:
            persona.agents = []
        persona.agents.append(agent_model.id)
        db.commit()
        
        # Add tools if specified
        if tool_names:
            agent_model.tools = tool_names
            db.commit()
        
        return agent_model
    
    def add_tools_to_agent(self, db: Session, agent_id: int, tool_names: List[str]):
        """Add tools to an agent"""
        agent = db.query(AgentModel).filter(AgentModel.id == agent_id).first()
        if agent:
            if agent.tools is None:
                agent.tools = []
            agent.tools.extend(tool_names)
            agent.tools = list(set(agent.tools))  # Remove duplicates
            db.commit()
    
    def process_message_with_persona(
        self, 
        db: Session, 
        persona_id: int, 
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        file_ids: Optional[List[int]] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process a message using the persona's Agno Team with agentic memory support"""
        # Get the persona
        persona = db.query(Persona).filter(Persona.id == persona_id).first()
        if not persona:
            return {"content": "Sorry, this persona doesn't exist.", "raw_log": ""}
        
        # Create Team from persona's agents
        team = self.create_team_from_persona(db, persona_id)
        
        if not team:
            return {"content": "Sorry, this persona doesn't have any active agents configured.", "raw_log": ""}
        
        try:
            # Build context with conversation history
            if conversation_history and len(conversation_history) > 0:
                context_messages = []
                for msg in conversation_history:
                    role_label = "User" if msg["role"] == "user" else "Assistant"
                    context_messages.append(f"{role_label}: {msg['content']}")
                
                context = "\n".join(context_messages)
                full_message = f"Previous conversation:\n{context}\n\nCurrent message: {message}"
            else:
                full_message = message
            
            # Enhance message with file information if files are attached
            enhanced_message = full_message
            if file_ids:
                file_info = []
                for file_id in file_ids:
                    file_info.append(f"[File ID: {file_id} - Use process_file tool to analyze this file]")
                
                if file_info:
                    enhanced_message += f"\n\nAttached Files:\n" + "\n".join(file_info)

            # Capture Agno stdout but still print to terminal (tee)
            class _Tee(io.TextIOBase):
                def __init__(self, a, b):
                    self.a = a
                    self.b = b
                def write(self, s):
                    if hasattr(self.a, "write"):
                        self.a.write(s)
                    if hasattr(self.b, "write"):
                        self.b.write(s)
                    return len(s)
                def flush(self):
                    if hasattr(self.a, "flush"):
                        self.a.flush()
                    if hasattr(self.b, "flush"):
                        self.b.flush()

            buf = io.StringIO()
            old_stdout = sys.stdout
            sys.stdout = _Tee(old_stdout, buf)
            try:
                # Use Team.print_response() for team memory support
                # Check if team has memory enabled (enable_user_memories=True)
                if user_id and hasattr(team, 'db') and team.db and hasattr(team, 'print_response'):
                    # Use team.print_response() with user_id for team memory
                    # This will store and retrieve memories at the team level
                    # print_response handles both memory storage/retrieval and response generation
                    response_obj = team.print_response(
                        enhanced_message,
                        stream=False,
                        user_id=user_id
                    )
                    # print_response may return None or the response object
                    # If it returns None, we need to get the response from run()
                    # But memory was already stored/retrieved by print_response
                    if response_obj is None:
                        # Get the response content using run() - memory context is already loaded
                        response = team.run(enhanced_message)
                    else:
                        # Use the response from print_response
                        response = response_obj
                elif user_id and hasattr(team, 'members') and len(team.members) == 1:
                    # Single agent team - try agent's print_response
                    single_agent = team.members[0]
                    if hasattr(single_agent, 'db') and single_agent.db and hasattr(single_agent, 'print_response'):
                        response_obj = single_agent.print_response(
                            enhanced_message,
                            stream=False,
                            user_id=user_id
                        )
                        if response_obj is None:
                            response = single_agent.run(enhanced_message)
                        else:
                            response = response_obj
                    else:
                        response = team.run(enhanced_message)
                else:
                    # No user_id or memory not enabled - use team.run()
                    response = team.run(enhanced_message)
            finally:
                sys.stdout = old_stdout
            raw_log = buf.getvalue()

            # Return both content and raw log for persistence upstream
            return {"content": response.content, "raw_log": raw_log}
            
        except Exception as e:
            return {"content": f"Error processing message: {str(e)}", "raw_log": ""}
    
    def get_persona_team_info(self, db: Session, persona_id: int) -> Dict[str, Any]:
        """Get information about a persona's team"""
        persona = db.query(Persona).filter(Persona.id == persona_id).first()
        if not persona or not persona.agents:
            return {
                "persona_id": persona_id,
                "total_agents": 0,
                "team_leader": None,
                "specialists": [],
                "assistants": []
            }
        
        agents = db.query(AgentModel).filter(
            AgentModel.id.in_(persona.agents),
            AgentModel.is_active == True
        ).all()
        
        team_info = {
            "persona_id": persona_id,
            "total_agents": len(agents),
            "team_leader": None,
            "specialists": [],
            "assistants": []
        }
        
        for agent in agents:
            agent_info = {
                "id": agent.id,
                "name": agent.name,
                "role": agent.role,
                "model_provider": agent.model_provider,
                "model_id": agent.model_id,
                "tools": agent.tools or []
            }
            
            if agent.role == "team_leader":
                team_info["team_leader"] = agent_info
            elif agent.role == "specialist":
                team_info["specialists"].append(agent_info)
            elif agent.role == "assistant":
                team_info["assistants"].append(agent_info)
        
        return team_info
    
    def get_user_memories(self, user_id: str) -> List[Dict[str, Any]]:
        """Get memories for a specific user"""
        if not self.agno_db:
            return []
        
        try:
            # Create a temporary agent to access memory methods
            # We need an agent instance to call get_user_memories
            temp_model = OpenAIChat(id="gpt-4o-mini", api_key=self.openai_api_key)
            temp_agent = AgnoAgent(
                name="memory_reader",
                model=temp_model,
                db=self.agno_db,
                enable_agentic_memory=True
            )
            memories = temp_agent.get_user_memories(user_id=user_id)
            return memories if memories else []
        except Exception as e:
            print(f"Error getting user memories: {e}")
            return []
    
    def create_agent_with_memory(
        self,
        name: str,
        model_provider: str = "openai",
        model_id: str = "gpt-4o",
        instructions: Optional[List[str]] = None,
        tool_names: Optional[List[str]] = None
    ) -> AgnoAgent:
        """Create a standalone agent with agentic memory enabled"""
        # Get model
        if model_provider.lower() == "openai":
            model = OpenAIChat(id=model_id, api_key=self.openai_api_key)
        elif model_provider.lower() == "groq":
            model = Groq(id=model_id, api_key=self.groq_api_key)
        else:
            raise ValueError(f"Unknown model_provider: {model_provider}")
        
        # Get tools
        tools = get_tools(tool_names or [])
        
        # Create agent with memory
        agent_kwargs = {
            "name": name,
            "model": model,
            "tools": tools,
            "instructions": instructions or [],
            "debug_mode": True,
        }
        
        # Enable agentic memory if database is available
        if self.agno_db is not None:
            agent_kwargs["db"] = self.agno_db
            agent_kwargs["enable_agentic_memory"] = True
        
        return AgnoAgent(**agent_kwargs)


# Global instance
agno_team_service = AgnoTeamService()
