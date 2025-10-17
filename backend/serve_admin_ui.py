#!/usr/bin/env python3
"""
Admin UI Server for ManishGPT
Serves the admin dashboard HTML file
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

# Create FastAPI app for serving admin UI
admin_app = FastAPI(title="ManishGPT Admin UI")

# Serve the admin UI HTML file
@admin_app.get("/")
async def serve_admin_ui():
    """Serve the admin dashboard HTML file"""
    admin_ui_path = Path(__file__).parent / "admin_ui.html"
    if admin_ui_path.exists():
        return FileResponse(admin_ui_path)
    else:
        return {"error": "Admin UI file not found"}

@admin_app.get("/admin")
async def serve_admin_ui_alt():
    """Alternative route for admin UI"""
    return await serve_admin_ui()

if __name__ == "__main__":
    print("🚀 Starting ManishGPT Admin UI Server...")
    print("📱 Admin Dashboard: http://localhost:8001")
    print("🔧 Make sure your main API server is running on http://localhost:8000")
    print("=" * 60)
    
    uvicorn.run(
        admin_app, 
        host="0.0.0.0", 
        port=8001, 
        log_level="info"
    )
