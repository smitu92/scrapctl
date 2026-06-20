# 1. Use a "slim" image to save RAM and disk space
FROM python:3.10-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy requirements first (this makes builds faster)
COPY requirements.txt .

# 4. Install dependencies without saving cache files (saves space)
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of your code
COPY . .

# 6. Expose the port your FastAPI is using
EXPOSE 4322

# 7. Run with exactly 1 worker because of your 0.1 CPU limit!
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4322", "--workers", "1"]
