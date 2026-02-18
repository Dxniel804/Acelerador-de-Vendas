#!/bin/bash

# Exit on error
set -e

# Run migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Start Gunicorn
exec gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT
