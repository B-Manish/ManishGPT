"""
File Processing Tool for Agno
Handles PDF, DOCX, TXT, and other document processing
"""
from typing import Dict, Any, List
from agno.tools import Toolkit
import os
import mimetypes
from services.file_service import file_service
import PyPDF2
import io
from docx import Document
import json


class FileProcessingTool(Toolkit):
    """Tool for processing uploaded files"""
    
    def __init__(self):
        super().__init__()
        self.name = "file_processing"
        self.description = "Process and analyze uploaded files including PDFs, Word documents, and text files"
    
    def process_file(self, file_id: str) -> str:
        """
        Process an uploaded file and extract its content
        
        Args:
            file_id: The ID of the uploaded file
            
        Returns:
            Extracted content from the file
        """
        try:
            # Get file info from database (we'll need to import this)
            from models import FileModel
            from database import get_db
            
            db = next(get_db())
            file_record = db.query(FileModel).filter(FileModel.id == file_id).first()
            
            if not file_record:
                return f"File with ID {file_id} not found"
            
            # Get file content from MinIO
            download_url = file_service.get_download_url(file_record.object_name)
            
            # Download file content
            import requests
            response = requests.get(download_url)
            if response.status_code != 200:
                return f"Failed to download file: {response.status_code}"
            
            file_content = response.content
            content_type = file_record.content_type.lower()
            
            # Process based on file type
            if content_type == 'application/pdf':
                return self._process_pdf(file_content, file_record.filename)
            elif content_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']:
                return self._process_docx(file_content, file_record.filename)
            elif content_type == 'text/plain':
                return self._process_txt(file_content, file_record.filename)
            else:
                return f"Unsupported file type: {content_type}. Supported types: PDF, DOCX, TXT"
                
        except Exception as e:
            return f"Error processing file: {str(e)}"
    
    def _process_pdf(self, file_content: bytes, filename: str) -> str:
        """Process PDF file and extract text"""
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text_content = ""
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                text_content += f"\n--- Page {page_num + 1} ---\n"
                text_content += page_text
            
            return f"PDF Content from '{filename}':\n{text_content}"
            
        except Exception as e:
            return f"Error processing PDF '{filename}': {str(e)}"
    
    def _process_docx(self, file_content: bytes, filename: str) -> str:
        """Process DOCX file and extract text"""
        try:
            doc_file = io.BytesIO(file_content)
            doc = Document(doc_file)
            
            text_content = ""
            for paragraph in doc.paragraphs:
                text_content += paragraph.text + "\n"
            
            return f"Word Document Content from '{filename}':\n{text_content}"
            
        except Exception as e:
            return f"Error processing DOCX '{filename}': {str(e)}"
    
    def _process_txt(self, file_content: bytes, filename: str) -> str:
        """Process TXT file and extract text"""
        try:
            text_content = file_content.decode('utf-8')
            return f"Text File Content from '{filename}':\n{text_content}"
            
        except Exception as e:
            return f"Error processing TXT '{filename}': {str(e)}"
    
    def list_uploaded_files(self, conversation_id: int) -> str:
        """
        List all files uploaded in a conversation
        
        Args:
            conversation_id: The conversation ID
            
        Returns:
            List of uploaded files
        """
        try:
            from models import MessageFile, FileModel
            from database import get_db
            
            db = next(get_db())
            
            # Get all files associated with messages in this conversation
            message_files = db.query(MessageFile).join(MessageFile.file).filter(
                MessageFile.message.has(conversation_id=conversation_id)
            ).all()
            
            if not message_files:
                return "No files uploaded in this conversation"
            
            file_list = "Uploaded Files:\n"
            for msg_file in message_files:
                file_record = msg_file.file
                file_list += f"- {file_record.filename} (ID: {file_record.id})\n"
            
            return file_list
            
        except Exception as e:
            return f"Error listing files: {str(e)}"
    
    def get_tools(self) -> List[Dict[str, Any]]:
        """Return the tools provided by this toolkit"""
        return [
            {
                "name": "process_file",
                "description": "Process and extract content from uploaded files (PDF, DOCX, TXT)",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_id": {
                            "type": "string",
                            "description": "The ID of the uploaded file to process"
                        }
                    },
                    "required": ["file_id"]
                }
            },
            {
                "name": "list_uploaded_files",
                "description": "List all files uploaded in the current conversation",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "conversation_id": {
                            "type": "integer",
                            "description": "The conversation ID"
                        }
                    },
                    "required": ["conversation_id"]
                }
            }
        ]
