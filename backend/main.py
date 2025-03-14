import os
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config.config import config
from src.models import db, TokenBlacklist  # TokenBlacklist importiert für die Blocklist-Callback

def create_app():
    app = Flask(__name__)

    # Lade die Konfiguration (hier z. B. "development")
    env_config = config.get("development")
    app.config.from_object(env_config)

    # Zusätzliche Sicherheitskonfigurationen für JWT (verwende Umgebungsvariablen!)
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "supersecretkey")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 900         # 15 Minuten
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = 86400        # 1 Tag

    # Konfiguration für Cookie-basierte Token (sicherer als LocalStorage!)
    app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
    # In der Entwicklung ggf. auf False setzen, in Produktion unbedingt True (HTTPS erforderlich)
    app.config["JWT_COOKIE_SECURE"] = True 
    app.config["JWT_ACCESS_COOKIE_NAME"] = "access_token_cookie"
    app.config["JWT_REFRESH_COOKIE_NAME"] = "refresh_token_cookie"
    # CSRF-Schutz für Cookies – hier aktivieren
    app.config["JWT_COOKIE_CSRF_PROTECT"] = True

    # SQLAlchemy mit der Flask-App verbinden
    db.init_app(app)

    # Initialisiere JWTManager
    jwt = JWTManager(app)

    # Callback für Token-Blacklist (Token werden hier geprüft, wenn sie in der DB stehen)
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        token = TokenBlacklist.query.filter_by(jti=jti).first()
        return token is not None

    # CORS konfigurieren – nur das Frontend (localhost:3000) wird zugelassen
    CORS(app, supports_credentials=True, resources={r"/*": {"origins": "http://localhost:3000"}})

    # Blueprint-Registrierung (API-Routen)
    from src.routes.auth import auth_bp
    from src.routes.projects import projects_bp
    from src.routes.cases import cases_bp
    from src.routes.admin import admin_bp  # Admin-Blueprint importieren

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(projects_bp, url_prefix='/projects')
    app.register_blueprint(cases_bp, url_prefix='/cases')
    app.register_blueprint(admin_bp, url_prefix='/admin')  # Admin-Endpoints unter /admin

    # Erstelle die Datenbank-Tabellen beim Start
    with app.app_context():
        db.create_all()

    return app

app = create_app()

if __name__ == '__main__':
    # In Produktion: debug=False und ggf. einen Production-Server verwenden
    app.run(host='0.0.0.0', port=9000, debug=True)
