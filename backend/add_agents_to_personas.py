#!/usr/bin/env python3
"""
Script to add an agent to existing personas
"""
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Persona, Agent, PersonaAgent
from services.agno_team_service import agno_team_service

def add_agent_to_existing_personas():
    """Add agents to personas that don't have any"""
    db = SessionLocal()
    try:
        # Get all personas
        personas = db.query(Persona).filter(Persona.is_active == True).all()
        
        print(f"Found {len(personas)} active personas")
        
        for persona in personas:
            print(f"\nChecking persona: {persona.name} (ID: {persona.id})")
            
            # Check if persona already has any agent
            existing_agent = db.query(PersonaAgent).join(Agent).filter(
                PersonaAgent.persona_id == persona.id,
                Agent.is_active == True,
                PersonaAgent.is_active == True
            ).first()
            
            if existing_agent:
                print(f"  ✓ Already has agent: {existing_agent.agent.name}")
            else:
                print(f"  ✗ No agent found. Creating one...")
                
                # Create agent
                agent = agno_team_service.create_agent_for_persona(
                    db=db,
                    persona=persona,
                    agent_name=f"{persona.name} Assistant",
                    agent_role="assistant",
                    instructions=f"You are an assistant for {persona.name}. {persona.instructions or 'Help users with their requests.'}",
                    tool_names=["youtube", "web_search"]
                )
                
                print(f"  ✓ Created agent: {agent.name}")
        
        print(f"\n✅ Agent creation completed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_agent_to_existing_personas()
