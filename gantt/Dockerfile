# Bauzeitenplan (Gantt-App) – Python-Server mit der gemeinsamen Datenbank der Bauplattform
FROM python:3.12-slim
WORKDIR /app
COPY gantt/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY gantt/app.py .
COPY gantt/public ./public
COPY gantt/samples ./samples
COPY shared/bpcore ./bpcore
COPY VERSION ./VERSION
ENV PYTHONUNBUFFERED=1 LEGACY_DIR=/legacy
EXPOSE 8082
HEALTHCHECK --interval=20s --timeout=5s --start-period=90s --retries=5 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8082/api/health',timeout=4)"
CMD ["gunicorn", "-b", "0.0.0.0:8082", "-w", "2", "--threads", "4", "--timeout", "90", "app:app"]
