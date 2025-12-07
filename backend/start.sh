#!/bin/bash
set -e

# Wait for database to be ready
echo "Waiting for database..."
python -c '
import socket
import time
import sys

host = "db"
port = 5432
timeout = 30
start_time = time.time()

while True:
    try:
        sock = socket.create_connection((host, port), timeout=2)
        sock.close()
        print("Database is ready!")
        break
    except Exception as e:
        if time.time() - start_time > timeout:
            print(f"Timed out waiting for {host}:{port}")
            sys.exit(1)
        print("Waiting for database...")
        time.sleep(2)
'


# Run migrations
echo "Running database migrations..."
alembic upgrade head

# Start the application
echo "Starting application..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
