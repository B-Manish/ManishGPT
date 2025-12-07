# backend/Dockerfile
FROM python:3.11-slim

# Inside container
WORKDIR /app

# Install dependencies
COPY . .
RUN pip install --no-cache-dir .

# Expose port FastAPI will listen on
EXPOSE 8000

# Start FastAPI (change main:app if your entry is different)
# Start with migration script
CMD ["./start.sh"]
