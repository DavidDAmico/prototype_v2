import os

class Config:
    DBNAME = os.getenv("DBNAME", "prototypeDB")
    DBUSER = os.getenv("DBUSER", "admin")
    DBPASS = os.getenv("DBPASS", "asdf1234")
    DBHOST = os.getenv("DBHOST", "PT_db")

    SQLALCHEMY_DATABASE_URI = f"postgresql://{DBUSER}:{DBPASS}@{DBHOST}/{DBNAME}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'supersecretkey')

    # Konvertiere 'DEBUG' Umgebungsvariable in ein boolesches Flag
    DEBUG = os.getenv('DEBUG', 'True').lower() in ['true', '1', 'yes']

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

# Automatische Auswahl basierend auf FLASK_ENV (Default: Development)
FLASK_ENV = os.getenv("FLASK_ENV", "development")
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig
}

CurrentConfig = config[FLASK_ENV]
