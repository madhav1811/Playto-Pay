#!/bin/bash

# Run migrations
python manage.py migrate --noinput

# Run seed script
python seed.py

# Start Celery worker in background
# -P solo is used for limited resource environments
celery -A core worker -l info -P solo &

# Start Gunicorn server
gunicorn core.wsgi --bind 0.0.0.0:$PORT
