from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
)
from src.models import db, User, TokenBlacklist
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

# ✅ Benutzer-Registrierung (Register-Endpoint)
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get("username")  # Email wird als Username verwendet
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email und Passwort sind erforderlich"}), 400

    # Validate email format
    if not "@" in email or not "." in email:
        return jsonify({"error": "Ungültige E-Mail-Adresse"}), 400

    # Prüfen, ob E-Mail bereits existiert
    existing_user = User.query.filter(
        (User.username == email) | (User.email == email)
    ).first()
    if existing_user:
        return jsonify({"error": "E-Mail bereits vergeben"}), 409

    hashed_password = generate_password_hash(password)
    role = data.get("role", "user")
    if role not in ["user", "master"]:
        return jsonify({"error": "Ungültige Rolle"}), 400

    custom_fields = data.get("customFields", [])

    new_user = User(
        username=email,  # Email als Username
        email=email,     # Email als Email
        password_hash=hashed_password,
        role=role,
        custom_fields=custom_fields
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": f"Benutzer {new_user.email} erfolgreich registriert!",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "role": new_user.role,
            "customFields": new_user.custom_fields or []
        }
    }), 201

# ✅ Login-Endpoint – setzt Access- und Refresh-Token als HttpOnly-Cookies
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('username')  # Email wird als Username verwendet
    user = User.query.filter((User.username == email) | (User.email == email)).first()
    if not user or not check_password_hash(user.password_hash, data.get('password')):
        return jsonify({"error": "Invalid credentials"}), 401

    access_token = create_access_token(identity={"user_id": user.id, "role": user.role})
    refresh_token = create_refresh_token(identity={"user_id": user.id, "role": user.role})

    response = jsonify({
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "customFields": user.custom_fields or []
        }
    })
    
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)
    
    return response, 200

# ✅ Token-Refresh über das HttpOnly Refresh-Cookie
@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    new_access_token = create_access_token(identity=identity)
    response = jsonify({"message": "Token refreshed"})
    set_access_cookies(response, new_access_token)
    return response, 200

# ✅ Logout-Endpoint (löscht beide Cookies und setzt den Token auf Blacklist)
@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        jti = get_jwt()["jti"]
        token_type = get_jwt()["type"]
        db.session.add(TokenBlacklist(jti=jti, token_type=token_type))
        db.session.commit()

        response = jsonify({"message": "Successfully logged out"})
        # Entferne die gesetzten JWT-Cookies
        unset_jwt_cookies(response)
        return response, 200
    except Exception as e:
        return jsonify({"error": f"Logout failed: {str(e)}"}), 500

# ✅ Geschützte Route (Nur eingeloggte Nutzer, Token wird nun aus Cookies gelesen)
@auth_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user = get_jwt_identity()
    return jsonify({"message": "This is a protected route", "user": current_user}), 200

# ✅ Nur für Master zugänglich
@auth_bp.route('/master-only', methods=['GET'])
@jwt_required()
def master_only():
    current_user = get_jwt_identity()
    if current_user["role"] != "master":
        return jsonify({"error": "Access forbidden"}), 403
    return jsonify({"message": "Welcome, Master!", "user": current_user}), 200

# ✅ Endpoint, um alle registrierten Nutzer abzurufen (nur für Master)
@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    current_user = get_jwt_identity()
    if current_user["role"] != "master":
        return jsonify({"error": "Access forbidden"}), 403
    users = User.query.all()
    return jsonify({
        "users": [{
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "customFields": user.custom_fields or []
        } for user in users]
    }), 200

# ✅ Endpoint, um Details eines einzelnen Nutzers abzurufen (nur für Master)
@auth_bp.route('/user/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    current_user = get_jwt_identity()
    if current_user["role"] != "master":
        return jsonify({"error": "Access forbidden"}), 403
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "customFields": user.custom_fields or []
        }
    }), 200
