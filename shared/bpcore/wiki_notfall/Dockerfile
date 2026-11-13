# Wiki-Notfallleser der Bauplattform – nur Python, keine weiteren Pakete.
# Bauen:   docker build -t wiki-notfall .
# Starten: docker run --rm -p 127.0.0.1:8080:8080 -v "/pfad/zur/Freigabe/Bauportal:/bauportal:ro" wiki-notfall
FROM python:3.12-slim
WORKDIR /app
COPY wiki_lesen.py .
ENV HOST=0.0.0.0 PORT=8080 BAUPORTAL=/bauportal PYTHONUNBUFFERED=1
EXPOSE 8080
CMD ["python", "/app/wiki_lesen.py"]
