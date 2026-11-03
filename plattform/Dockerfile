# Startseite (gemeinsame Anmeldung), Verwaltung, Adressen und Baukosten – ein Image, vier Container (siehe docker-compose.yml)
FROM python:3.12-slim
WORKDIR /app
COPY plattform/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY plattform/common.py plattform/portal.py plattform/admin.py plattform/adressen.py plattform/baukosten.py ./
COPY plattform/static ./static
COPY shared/bpcore ./bpcore
COPY VERSION ./VERSION
ENV PYTHONUNBUFFERED=1 APP_MODULE=portal APP_PORT=8090
EXPOSE 8090 8091 8093 8094
HEALTHCHECK --interval=20s --timeout=5s --start-period=90s --retries=5 \
  CMD python -c "import os,urllib.request;urllib.request.urlopen('http://127.0.0.1:'+os.environ['APP_PORT']+'/api/health',timeout=4)"
CMD ["sh", "-c", "exec gunicorn -b 0.0.0.0:${APP_PORT} -w 2 --threads 4 --timeout 60 ${APP_MODULE}:app"]
