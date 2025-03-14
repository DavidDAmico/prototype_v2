# Verwende ein schlankes Python-Image
FROM python:3.11-slim

# Setze das Arbeitsverzeichnis im Container
WORKDIR /app

# Kopiere requirements.txt und installiere Abhängigkeiten zuerst (optimierte Cache-Nutzung)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Kopiere den config-Ordner separat (WICHTIG!)
COPY config /app/config

# Kopiere den gesamten restlichen Code ins Image
COPY . /app

# Stelle sicher, dass der config-Ordner als Python-Modul erkannt wird
RUN touch /app/config/__init__.py

# Setze die Umgebungsvariablen für Flask
ENV FLASK_APP=main.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Exponiere den Port (intern 5000, wird mit -p gemappt)
EXPOSE 9000

# Starte die Flask-App
CMD ["flask", "run", "--host=0.0.0.0", "--port=9000"]
