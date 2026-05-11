FROM python:3.13.11

# Fix Python printing
ENV PYTHONUNBUFFERED=1

# Install Tesseract and necessary dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-amh \
    tesseract-ocr-eng \
    libgl1 \
    libglib2.0-0 \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    zlib1g-dev \
    python3-pil \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app/backend

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["sh", "-c", "\
        python manage.py migrate && \
        gunicorn backend.wsgi:application \
        --timeout 600 \
        --bind 0.0.0.0:8000" \
    ]