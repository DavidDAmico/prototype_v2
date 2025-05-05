import os
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config.config import config
from src.models import db, TokenBlacklist, User
from werkzeug.security import generate_password_hash
from flask_migrate import Migrate

def create_master_user(app):
    with app.app_context():
        # Check if master user already exists
        master_user = User.query.filter_by(username="master@example.com").first()
        if not master_user:
            # Create master user
            hashed_password = generate_password_hash("master")
            master_user = User(
                username="master@example.com",
                email="master@example.com",
                password_hash=hashed_password,
                role="master"
            )
            db.session.add(master_user)
            db.session.commit()
            print("Master user created successfully")
        else:
            print("Master user already exists")

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

    # CORS konfigurieren – Frontend und Backend URLs zulassen
    CORS(app, 
         supports_credentials=True, 
         resources={
             r"/*": {
                 "origins": ["http://localhost:3000", "http://localhost:9000"],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-CSRF-TOKEN"],
                 "expose_headers": ["Content-Type", "Authorization"],
                 "allow_credentials": True
             }
         })

    # SQLAlchemy mit der Flask-App verbinden
    db.init_app(app)
    
    # Flask-Migrate initialisieren
    migrate = Migrate(app, db)

    # Initialisiere JWTManager
    jwt = JWTManager(app)

    # Callback für Token-Blacklist (Token werden hier geprüft, wenn sie in der DB stehen)
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        token = TokenBlacklist.query.filter_by(jti=jti).first()
        return token is not None

    # Blueprint-Registrierung (API-Routen)
    from src.routes.auth import auth_bp
    from src.routes.cases import cases_bp
    from src.routes.admin import admin_bp  
    from src.routes.criteria import criteria_bp
    from src.routes.technologies import technologies_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(cases_bp, url_prefix='/cases')  
    app.register_blueprint(admin_bp, url_prefix='/admin')  
    app.register_blueprint(criteria_bp, url_prefix='/criteria')
    app.register_blueprint(technologies_bp, url_prefix='/technologies')

    # Disable strict slashes to prevent automatic redirects
    app.url_map.strict_slashes = False

    # Erstelle die Datenbank-Tabellen beim Start
    with app.app_context():
        db.create_all()
        # Create master user after database initialization
        create_master_user(app)

    return app

app = create_app()

if __name__ == '__main__':
    # In Produktion: debug=False und ggf. einen Production-Server verwenden
    app.run(host='0.0.0.0', port=9000, debug=True)
