#!/usr/bin/env python3
"""
Custom Gmail Tool for ManishGPT
Comprehensive Gmail integration with search, read, and management capabilities
"""

import os
import base64
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from typing import List, Dict, Any, Optional
from agno.tools import Toolkit
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GmailTool(Toolkit):
    """Custom Gmail integration tool for ManishGPT"""
    
    def __init__(self):
        # Load environment variables
        load_dotenv()
        
        self.scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify'
        ]
        
        # Gmail API setup
        self.service = None
        self.credentials = None
        
        # Load credentials from environment variables
        client_id = os.getenv('GMAIL_CLIENT_ID')
        client_secret = os.getenv('GMAIL_CLIENT_SECRET')
        project_id = os.getenv('GMAIL_PROJECT_ID')
        
        if not client_id or not client_secret:
            logger.error("Gmail credentials not found in environment variables")
            logger.error("Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in your .env file")
            self.user_credentials = None
        else:
            self.user_credentials = {
                "installed": {
                    "client_id": client_id,
                    "project_id": project_id,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_secret": client_secret,
                    "redirect_uris": ["http://localhost"]
                }
            }
            logger.info("Gmail credentials loaded from environment variables")
        
        # Define tools list
        tools = [
            self.search_emails,
            self.read_email,
            self.send_email,
        ]
        
        super().__init__(name="gmail", tools=tools)
    
    def _save_token(self, creds):
        """Save credentials to token file"""
        try:
            token_file = 'gmail_token.json'
            with open(token_file, 'w') as token:
                token.write(creds.to_json())
            logger.info(f"Token saved to {token_file}")
        except Exception as e:
            logger.error(f"Error saving token: {e}")
    
    def _load_token(self):
        """Load credentials from token file"""
        try:
            token_file = 'gmail_token.json'
            if os.path.exists(token_file):
                creds = Credentials.from_authorized_user_file(token_file, self.scopes)
                logger.info(f"Token loaded from {token_file}")
                return creds
        except Exception as e:
            logger.error(f"Error loading token: {e}")
        return None
    
    def authenticate(self) -> bool:
        """Authenticate with Gmail API with token persistence"""
        try:
            # First try to load existing token from file
            if not self.credentials:
                self.credentials = self._load_token()
            
            # Check if we already have valid credentials
            if self.credentials and self.credentials.valid:
                logger.info("Using existing valid credentials")
                self.service = build('gmail', 'v1', credentials=self.credentials)
                return True
            
            # Check if we have expired credentials that can be refreshed
            if self.credentials and self.credentials.expired and self.credentials.refresh_token:
                logger.info("Refreshing expired credentials")
                self.credentials.refresh(Request())
                self.service = build('gmail', 'v1', credentials=self.credentials)
                self._save_token(self.credentials)  # Save refreshed token
                logger.info("Credentials refreshed successfully")
                return True
            
            # Use user-provided credentials first, then fall back to environment
            if self.user_credentials:
                creds_info = self.user_credentials
                logger.info("Using user-provided Gmail credentials")
            else:
                # Load credentials from environment
                creds_json = os.getenv('GMAIL_CREDENTIALS_JSON')
                if not creds_json:
                    logger.error("Gmail credentials not found")
                    logger.error("Please provide credentials using set_credentials() method")
                    logger.error("Or set GMAIL_CREDENTIALS_JSON environment variable")
                    logger.error("Get credentials from: https://console.cloud.google.com/")
                    return False
                    
                # Parse credentials
                creds_info = json.loads(creds_json)
                logger.info("Using environment Gmail credentials")
                
            flow = InstalledAppFlow.from_client_config(
                creds_info, 
                self.scopes
            )
            
            # Run local server for auth
            creds = flow.run_local_server(port=0)
            
            # Build service
            self.service = build('gmail', 'v1', credentials=creds)
            self.credentials = creds
            
            # Save token for future use
            self._save_token(creds)
            
            logger.info("Gmail authentication successful")
            logger.info(f"Authenticated as: {self._get_user_email()}")
            return True
            
        except Exception as e:
            logger.error(f"Gmail auth failed: {e}")
            return False
    
    def _get_user_email(self) -> str:
        """Get authenticated user's email"""
        try:
            if self.service:
                profile = self.service.users().getProfile(userId='me').execute()
                return profile.get('emailAddress', 'Unknown')
        except Exception as e:
            logger.error(f"Error getting user email: {e}")
        return 'Unknown'
    
    def search_emails(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Search Gmail with custom query"""
        if not self.service:
            if not self.authenticate():
                return []
                
        try:
            # Search Gmail
            results = self.service.users().messages().list(
                userId='me',
                q=query,
                maxResults=max_results
            ).execute()
            
            messages = results.get('messages', [])
            
            # Get full message details
            detailed_messages = []
            for msg in messages:
                try:
                    message = self.service.users().messages().get(
                        userId='me', 
                        id=msg['id']
                    ).execute()
                    
                    detailed_messages.append({
                        'id': msg['id'],
                        'snippet': message.get('snippet', ''),
                        'subject': self._extract_subject(message),
                        'from': self._extract_sender(message),
                        'date': self._extract_date(message),
                        'labels': message.get('labelIds', [])
                    })
                except HttpError as e:
                    logger.error(f"Error getting message {msg['id']}: {e}")
                    continue

            print("gg messages", detailed_messages)        
            return detailed_messages
            
        except HttpError as e:
            logger.error(f"Gmail search error: {e}")
            return []
    
    def read_email(self, message_id: str) -> Dict[str, Any]:
        """Read specific Gmail message"""
        if not self.service:
            if not self.authenticate():
                return {}
                
        try:
            message = self.service.users().messages().get(
                userId='me',
                id=message_id
            ).execute()
            
            # Get headers
            headers = {}
            for header in message['payload'].get('headers', []):
                headers[header['name']] = header['value']
                
            # Extract body
            body = self._extract_body(message['payload'])
            
            return {
                'id': message['id'],
                'subject': headers.get('Subject', ''),
                'from': headers.get('From', ''),
                'date': headers.get('Date', ''),
                'body': body,
                'labels': message.get('labelIds', [])
            }
        except HttpError as e:
            logger.error(f"Gmail read error: {e}")
            return {}
    
    def send_email(self, to: str, subject: str, body: str, 
                  cc: Optional[str] = None, bcc: Optional[str] = None) -> bool:
        """Send Gmail"""
        if not self.service:
            if not self.authenticate():
                return False
                
        try:
            # Create message
            message = MIMEText(body)
            message['to'] = to
            message['subject'] = subject
            if cc:
                message['cc'] = cc
            if bcc:
                message['bcc'] = bcc
                
            # Encode message
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            # Send
            self.service.users().messages().send(
                userId='me',
                body={'raw': raw}
            ).execute()
            
            logger.info(f"Email sent to {to}")
            return True
            
        except HttpError as e:
            logger.error(f"Send error: {e}")
            return False
    
    def _extract_subject(self, message: Dict) -> str:
        """Extract email subject"""
        headers = message.get('payload', {}).get('headers', [])
        for header in headers:
            if header['name'] == 'Subject':
                return header['value']
        return ''
    
    def _extract_sender(self, message: Dict) -> str:
        """Extract sender email"""
        headers = message.get('payload', {}).get('headers', [])
        for header in headers:
            if header['name'] == 'From':
                return header['value']
        return ''
    
    def _extract_date(self, message: Dict) -> str:
        """Extract email date"""
        headers = message.get('payload', {}).get('headers', [])
        for header in headers:
            if header['name'] == 'Date':
                return header['value']
        return ''
    
    def _extract_body(self, payload: Dict) -> str:
        """Extract email body"""
        body = ""
        
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body'].get('data', '')
                    if data:
                        body += base64.urlsafe_b64decode(data).decode('utf-8')
                elif part['mimeType'] == 'text/html':
                    data = part['body'].get('data', '')
                    if data:
                        body += base64.urlsafe_b64decode(data).decode('utf-8')
        else:
            if payload.get('mimeType') == 'text/plain':
                data = payload['body'].get('data', '')
                if data:
                    body = base64.urlsafe_b64decode(data).decode('utf-8')
                    
        return body
    
