# Bauzeitenplan (Gantt-App) – Python-Server mit der gemeinsamen Datenbank der Bauplattform
FROM python:3.12-slim
WORKDIR /app
# Sicherheitskorrekturen des Betriebssystems bei jedem Bau einspielen (siehe .github/workflows/sicherheit.yml)
# + cairo und Schriften für „Drucken → PDF“ (SVG-Druckseiten → PDF mit cairosvg); Lato wie in allen PDFs der Plattform
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends libcairo2 fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
COPY shared/bpcore/fonts/Lato-*.ttf /usr/local/share/fonts/
COPY gantt/fonts.conf /etc/fonts/local.conf
RUN fc-cache -f
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
CMD ["gunicorn", "-b", "0.0.0.0:8082", "-w", "2", "--threads", "4", "--timeout", "300", "app:app"]
