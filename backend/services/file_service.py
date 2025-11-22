import os
from minio import Minio
from minio.error import S3Error
from typing import Optional, BinaryIO
import uuid
from datetime import datetime

class FileService:
    def __init__(self):
        # Configuration - you can change these based on your choice
        self.endpoint = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
        self.access_key = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
        self.secret_key = os.getenv('MINIO_SECRET_KEY', 'minioadmin123')
        self.secure = os.getenv('MINIO_SECURE', 'false').lower() == 'true'
        
        # Initialize MinIO client
        self.client = Minio(
            self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure
        )
        
        # Bucket name for chat files
        self.bucket_name = 'chat-files'
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                print(f"Created bucket: {self.bucket_name}")
        except (S3Error, Exception) as e:
            # Handle both S3 errors and connection errors gracefully
            # This allows the app to start even if MinIO is not available
            print(f"Warning: Could not connect to MinIO or create bucket '{self.bucket_name}': {e}")
            print("The application will start, but file operations may fail until MinIO is available.")
    
    def upload_file(self, file_data: BinaryIO, filename: str, content_type: str) -> dict:
        """Upload file to MinIO and return file info"""
        try:
            # Generate unique object name
            file_id = str(uuid.uuid4())
            file_extension = os.path.splitext(filename)[1]
            object_name = f"{file_id}{file_extension}"
            
            # Get file size
            file_data.seek(0, 2)  # Seek to end
            file_size = file_data.tell()
            file_data.seek(0)  # Reset to beginning
            
            # Upload file
            self.client.put_object(
                self.bucket_name,
                object_name,
                file_data,
                file_size,
                content_type=content_type
            )
            
            return {
                'file_id': file_id,
                'filename': filename,
                'object_name': object_name,
                'file_size': file_size,
                'content_type': content_type,
                'bucket_name': self.bucket_name,
                'uploaded_at': datetime.utcnow().isoformat()
            }
            
        except S3Error as e:
            print(f"Error uploading file: {e}")
            raise Exception(f"Failed to upload file: {str(e)}")
    
    def get_download_url(self, object_name: str, expires_in_seconds: int = 3600) -> str:
        """Generate presigned URL for file download"""
        try:
            return self.client.presigned_get_object(
                self.bucket_name,
                object_name,
                expires=expires_in_seconds
            )
        except S3Error as e:
            print(f"Error generating download URL: {e}")
            raise Exception(f"Failed to generate download URL: {str(e)}")
    
    def delete_file(self, object_name: str) -> bool:
        """Delete file from MinIO"""
        try:
            self.client.remove_object(self.bucket_name, object_name)
            return True
        except S3Error as e:
            print(f"Error deleting file: {e}")
            return False

# Global file service instance
file_service = FileService()

