"""
AgnoTeamService - Manages Agno agents and teams for personas
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from agno.agent import Agent as AgnoAgent
from agno.models.openai import OpenAIChat
from agno.models.groq import Groq
from dotenv import load_dotenv
import os
import json

from models import Persona, Agent as AgentModel, Tool, AgentTool, PersonaAgent
from tools.registry import get_tools

load_dotenv("config.env")


class AgnoTeamService:
    """Service to manage Agno agents and teams for personas"""
    
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.groq_api_key = os.getenv("GROQ_API_KEY")
    
    def create_agent_from_model(self, agent_model: AgentModel) -> AgnoAgent:
        """Create an Agno Agent from database Agent model"""
        # Get model
        if agent_model.model_provider.lower() == "openai":
            model = OpenAIChat(id=agent_model.model_id, api_key=self.openai_api_key)
        elif agent_model.model_provider.lower() == "groq":
            model = Groq(id=agent_model.model_id, api_key=self.groq_api_key)
        else:
            raise ValueError(f"Unknown model_provider: {agent_model.model_provider}")
        
        # Get tools for this agent
        tool_names = []
        for agent_tool in agent_model.agent_tools:
            if agent_tool.is_active and agent_tool.tool.is_active:
                tool_names.append(agent_tool.tool.name)
        
        tools = get_tools(tool_names)
        
        # Create Agno Agent
        return AgnoAgent(
            name=agent_model.name,
            model=model,
            tools=tools,
            instructions=[agent_model.instructions],
            debug_mode=True,
            debug_level=2,
        )
    
    def get_persona_team_leader(self, db: Session, persona_id: int) -> Optional[AgnoAgent]:
        """Get any active agent for a persona (previously called team leader)"""
        # Get any active agent through junction table
        persona_agent = db.query(PersonaAgent).join(AgentModel).filter(
            PersonaAgent.persona_id == persona_id,
            PersonaAgent.is_active == True,
            AgentModel.is_active == True
        ).first()
        
        if not persona_agent:
            return None
        
        return self.create_agent_from_model(persona_agent.agent)
    
    def get_persona_agents(self, db: Session, persona_id: int) -> List[AgnoAgent]:
        """Get all active agents for a persona"""
        # Get agents through the junction table
        persona_agents = db.query(PersonaAgent).filter(
            PersonaAgent.persona_id == persona_id,
            PersonaAgent.is_active == True
        ).all()
        
        agents = []
        for persona_agent in persona_agents:
            agent_model = persona_agent.agent
            if agent_model.is_active:
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
        
        # Attach agent to persona through junction table
        persona_agent = PersonaAgent(
            persona_id=persona.id,
            agent_id=agent_model.id,
            is_active=True
        )
        
        db.add(persona_agent)
        db.commit()
        
        # Add tools if specified
        if tool_names:
            self.add_tools_to_agent(db, agent_model.id, tool_names)
        
        return agent_model
    
    def add_tools_to_agent(self, db: Session, agent_id: int, tool_names: List[str]):
        """Add tools to an agent"""
        for tool_name in tool_names:
            tool = db.query(Tool).filter(Tool.name == tool_name).first()
            if tool:
                agent_tool = AgentTool(
                    agent_id=agent_id,
                    tool_id=tool.id,
                    is_active=True
                )
                db.add(agent_tool)
        
        db.commit()
    
    def process_message_with_persona(
        self, 
        db: Session, 
        persona_id: int, 
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Process a message using the persona's agent"""
        # Get the persona
        persona = db.query(Persona).filter(Persona.id == persona_id).first()
        if not persona:
            return "Sorry, this persona doesn't exist."
        
        # Get any active agent for this persona
        agent = self.get_persona_team_leader(db, persona_id)
        
        if not agent:
            return "Sorry, this persona doesn't have any active agents configured."
        
        try:
            # Process the message directly
            response = agent.run(message)
            return response.content
            
        except Exception as e:
            return f"Error processing message: {str(e)}"
    
    def get_persona_team_info(self, db: Session, persona_id: int) -> Dict[str, Any]:
        """Get information about a persona's team"""
        agents = db.query(AgentModel).filter(
            AgentModel.persona_id == persona_id,
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
                "tools": [at.tool.name for at in agent.agent_tools if at.is_active]
            }
            
            if agent.role == "team_leader":
                team_info["team_leader"] = agent_info
            elif agent.role == "specialist":
                team_info["specialists"].append(agent_info)
            elif agent.role == "assistant":
                team_info["assistants"].append(agent_info)
        
        return team_info


# Global instance
agno_team_service = AgnoTeamService()
