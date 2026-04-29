FROM python:3.11
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y binutils libproj-dev gdal-bin

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Make script executable
RUN chmod +x start.sh

# Environment variables for production
ENV DEBUG=False
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

EXPOSE 8000

CMD ["bash", "start.sh"]
