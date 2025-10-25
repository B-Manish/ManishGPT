import os
import requests
import json
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ModelService:
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.groq_api_key = os.getenv('GROQ_API_KEY')
        
    def get_openai_models(self) -> List[Dict]:
        """Fetch available models from OpenAI API"""
        if not self.openai_api_key:
            print("Warning: OPENAI_API_KEY not found, using fallback models")
            return self._get_openai_fallback_models()
        
        try:
            headers = {
                'Authorization': f'Bearer {self.openai_api_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                'https://api.openai.com/v1/models',
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                models_data = response.json()
                available_models = []
                
                # Filter for chat models only
                chat_models = [
                    'gpt-4o',
                    'gpt-4o-mini', 
                    'gpt-4-turbo',
                    'gpt-4-turbo-preview',
                    'gpt-3.5-turbo',
                    'gpt-3.5-turbo-16k'
                ]
                
                for model in models_data.get('data', []):
                    model_id = model.get('id', '')
                    if any(chat_model in model_id for chat_model in chat_models):
                        available_models.append({
                            'id': model_id,
                            'name': self._format_model_name(model_id),
                            'available': True,
                            'provider': 'openai'
                        })
                
                return available_models
            else:
                print(f"OpenAI API error: {response.status_code}")
                return self._get_openai_fallback_models()
                
        except Exception as e:
            print(f"Error fetching OpenAI models: {e}")
            return self._get_openai_fallback_models()
    
    def get_groq_models(self) -> List[Dict]:
        """Fetch available models from Groq API"""
        if not self.groq_api_key:
            print("Warning: GROQ_API_KEY not found, using fallback models")
            return self._get_groq_fallback_models()
        
        try:
            headers = {
                'Authorization': f'Bearer {self.groq_api_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                'https://api.groq.com/openai/v1/models',
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                models_data = response.json()
                available_models = []
                
                for model in models_data.get('data', []):
                    model_id = model.get('id', '')
                    available_models.append({
                        'id': model_id,
                        'name': self._format_model_name(model_id),
                        'available': True,
                        'provider': 'groq'
                    })
                
                return available_models
            else:
                print(f"Groq API error: {response.status_code}")
                return self._get_groq_fallback_models()
                
        except Exception as e:
            print(f"Error fetching Groq models: {e}")
            return self._get_groq_fallback_models()
    
    def get_all_models(self) -> Dict[str, Dict]:
        """Get all available models from all providers"""
        return {
            'openai': {
                'name': 'OpenAI',
                'api_key_configured': bool(self.openai_api_key),
                'models': self.get_openai_models()
            },
            'groq': {
                'name': 'Groq',
                'api_key_configured': bool(self.groq_api_key),
                'models': self.get_groq_models()
            }
        }
    
    def _format_model_name(self, model_id: str) -> str:
        """Format model ID into a readable name"""
        name_mapping = {
            'gpt-4o': 'GPT-4o',
            'gpt-4o-mini': 'GPT-4o Mini',
            'gpt-4-turbo': 'GPT-4 Turbo',
            'gpt-4-turbo-preview': 'GPT-4 Turbo Preview',
            'gpt-3.5-turbo': 'GPT-3.5 Turbo',
            'gpt-3.5-turbo-16k': 'GPT-3.5 Turbo 16K',
            'llama-3.3-70b-versatile': 'Llama 3.3 70B Versatile',
            'llama-3.1-8b-instant': 'Llama 3.1 8B Instant',
            'llama-3.1-70b-versatile': 'Llama 3.1 70B Versatile',
            'mixtral-8x7b-32768': 'Mixtral 8x7B',
            'gemma-7b-it': 'Gemma 7B IT',
            'gemma-2-9b-it': 'Gemma 2 9B IT'
        }
        
        return name_mapping.get(model_id, model_id.replace('-', ' ').title())
    
    def _get_openai_fallback_models(self) -> List[Dict]:
        """Fallback OpenAI models when API is unavailable"""
        return [
            {'id': 'gpt-4o', 'name': 'GPT-4o', 'available': True, 'provider': 'openai'},
            {'id': 'gpt-4o-mini', 'name': 'GPT-4o Mini', 'available': True, 'provider': 'openai'},
            {'id': 'gpt-4-turbo', 'name': 'GPT-4 Turbo', 'available': True, 'provider': 'openai'},
            {'id': 'gpt-3.5-turbo', 'name': 'GPT-3.5 Turbo', 'available': True, 'provider': 'openai'}
        ]
    
    def _get_groq_fallback_models(self) -> List[Dict]:
        """Fallback Groq models when API is unavailable"""
        return [
            {'id': 'llama-3.3-70b-versatile', 'name': 'Llama 3.3 70B Versatile', 'available': True, 'provider': 'groq'},
            {'id': 'llama-3.1-8b-instant', 'name': 'Llama 3.1 8B Instant', 'available': True, 'provider': 'groq'},
            {'id': 'llama-3.1-70b-versatile', 'name': 'Llama 3.1 70B Versatile', 'available': True, 'provider': 'groq'},
            {'id': 'mixtral-8x7b-32768', 'name': 'Mixtral 8x7B', 'available': True, 'provider': 'groq'},
            {'id': 'gemma-7b-it', 'name': 'Gemma 7B IT', 'available': True, 'provider': 'groq'},
            {'id': 'gemma-2-9b-it', 'name': 'Gemma 2 9B IT', 'available': True, 'provider': 'groq'}
        ]
    
    def validate_model(self, provider: str, model_id: str) -> bool:
        """Validate if a model is available for a provider"""
        all_models = self.get_all_models()
        provider_models = all_models.get(provider, {}).get('models', [])
        
        return any(model['id'] == model_id for model in provider_models)

# Global instance
model_service = ModelService()
