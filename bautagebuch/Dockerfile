# Bautagebuch – wird aus dem Hauptordner der Bauplattform gebaut (docker compose build), damit shared/bpcore mit hinein kommt.
FROM python:3.12-slim
# Sicherheitskorrekturen des Betriebssystems bei jedem Bau einspielen (siehe .github/workflows/sicherheit.yml)
WORKDIR /app
# pg_dump / pg_restore (Version passend zu postgres:15) für die Datenbankversionen
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends postgresql-client && rm -rf /var/lib/apt/lists/*
COPY bautagebuch/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY bautagebuch/app.py .
COPY bautagebuch/core ./core
COPY bautagebuch/modules ./modules
COPY bautagebuch/pg_migrations ./pg_migrations
COPY bautagebuch/static ./static
COPY bautagebuch/tools ./tools
COPY shared/bpcore ./bpcore
COPY VERSION ./VERSION
ENV DATA_DIR=/data PYTHONUNBUFFERED=1
VOLUME /data
EXPOSE 8000
HEALTHCHECK --interval=20s --timeout=5s --start-period=60s --retries=5 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/api/platform',timeout=4)"
CMD ["gunicorn", "-b", "0.0.0.0:8000", "-w", "2", "--timeout", "60", "app:app"]
