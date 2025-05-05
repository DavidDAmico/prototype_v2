# Verwende eine stabile PostgreSQL-Version
FROM postgres:16

# Aktualisiere Paketlisten und installiere plpython3u & benötigte Pakete
RUN apt-get update && apt-get install -y \
    postgresql-plpython3-16 python3-requests \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Kopiere SQL-Initialisierungsdateien in das PostgreSQL-Init-Verzeichnis
COPY db_tables/*.sql /docker-entrypoint-initdb.d/
