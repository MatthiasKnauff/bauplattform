# Verteiler, Startseite (gemeinsame Anmeldung), Verwaltung und die Plattform-Apps (Adressen, Baukosten, Baudaten …) – ein Image, je App ein Container (siehe docker-compose.yml)
FROM python:3.12-slim
# Sicherheitskorrekturen des Betriebssystems bei jedem Bau einspielen (siehe .github/workflows/sicherheit.yml)
WORKDIR /app
# Texterkennung für gescannte Rechnungen und Aufmaße (AVA)
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-deu && rm -rf /var/lib/apt/lists/*
COPY plattform/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY plattform/common.py plattform/portal.py plattform/admin.py plattform/adressen.py plattform/baukosten.py plattform/aufgaben.py plattform/plaene.py plattform/ava.py plattform/ava_lesen.py plattform/katalog.py plattform/kommunikation.py plattform/baudaten.py plattform/router.py plattform/orca_import.py plattform/orca_lesen.py plattform/orca_jet3.py ./
COPY plattform/static ./static
COPY plattform/vendor ./vendor
COPY shared/bpcore ./bpcore
COPY VERSION ./VERSION
ENV PYTHONUNBUFFERED=1 APP_MODULE=portal APP_PORT=8090
EXPOSE 8090 8091 8093 8094 8095 8096 8097 8098 8099 8100
HEALTHCHECK --interval=20s --timeout=5s --start-period=90s --retries=5 \
  CMD python -c "import os,urllib.request;urllib.request.urlopen('http://127.0.0.1:'+os.environ['APP_PORT']+'/api/health',timeout=4)"
CMD ["sh", "-c", "exec gunicorn -b 0.0.0.0:${APP_PORT} -w 2 --threads ${APP_THREADS:-4} --timeout ${APP_TIMEOUT:-300} ${APP_MODULE}:app"]
