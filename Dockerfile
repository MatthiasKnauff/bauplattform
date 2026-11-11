# Bauplattform – EIN Image für alle Apps (Bautagebuch, Bauzeitenplan, Verteiler, Startseite, Verwaltung und die Plattform-Apps).
# Je App ein Container; welche App ein Container ist, sagt die Umgebungsvariable APP (siehe apps.py und start.py).
# Gebaut wird aus dem Hauptordner:  docker build -t bauplattform .
FROM python:3.12-slim
WORKDIR /app
# Sicherheitskorrekturen des Betriebssystems bei jedem Bau einspielen (siehe .github/workflows/sicherheit.yml)
#  · tesseract: Texterkennung für gescannte Rechnungen und Aufmaße (AVA)
#  · postgresql-client: pg_dump / pg_restore für die Datenbankversionen (Bautagebuch)
#  · cairo, fontconfig, Schriften: „Drucken → PDF“ im Bauzeitenplan (SVG-Druckseiten → PDF); Lato wie in allen PDFs der Plattform
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
      tesseract-ocr tesseract-ocr-deu postgresql-client libcairo2 fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
COPY shared/bpcore/fonts/Lato-*.ttf /usr/local/share/fonts/
COPY gantt/fonts.conf /etc/fonts/local.conf
RUN fc-cache -f
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Kern (Server) und Baukasten (Oberfläche) – für alle Apps derselbe
COPY shared/bpcore ./bpcore
# die Apps: je ein Ordner mit Seite und Server-Teil
COPY plattform/*.py ./plattform/
COPY plattform/static ./plattform/static
COPY plattform/vendor ./plattform/vendor
COPY gantt/app.py gantt/links.py ./gantt/
COPY gantt/public ./gantt/public
COPY gantt/samples ./gantt/samples
COPY bautagebuch/*.py ./bautagebuch/
COPY bautagebuch/core ./bautagebuch/core
COPY bautagebuch/modules ./bautagebuch/modules
COPY bautagebuch/static ./bautagebuch/static
COPY bautagebuch/tools ./bautagebuch/tools
COPY apps.py start.py VERSION ./
ENV PYTHONUNBUFFERED=1 PYTHONPATH=/app DATA_DIR=/data LEGACY_DIR=/legacy
EXPOSE 8000 8082 8090 8091 8093 8094 8095 8096 8097 8098 8099 8100 8101
HEALTHCHECK --interval=20s --timeout=5s --start-period=90s --retries=5 CMD python /app/start.py --gesund
# Arbeitsordner: der der Plattform-Apps (so finden auch ältere Stack-Dateien und „docker compose exec <app> python …“ ihre Module);
# start.py wechselt beim Start in den Ordner der jeweiligen App.
WORKDIR /app/plattform
CMD ["python", "/app/start.py"]
