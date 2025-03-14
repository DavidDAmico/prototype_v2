from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash
from src.models import db, User, Case
# (Importiere ggf. weitere Models, wie CaseRound etc., falls benötigt)

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# ------------------------------
# Benutzerverwaltung
# ------------------------------

@admin_bp.route('/create-user', methods=['POST'])
@jwt_required()
def admin_create_user():
    current_user = get_jwt_identity()
    if current_user["role"] != "master":
        return jsonify({"error": "Access forbidden"}), 403

    data = request.get_json()
    # Prüfe erforderliche Felder
    if not data.get("username") or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Username, Email und Passwort sind erforderlich"}), 400

    # Prüfe, ob der Benutzer bereits existiert
    existing_user = User.query.filter(
        (User.username == data["username"]) | (User.email == data["email"])
    ).first()
    if existing_user:
        return jsonify({"error": "Benutzername oder E-Mail bereits vergeben"}), 409

    hashed_password = generate_password_hash(data["password"])
    role = data.get("role", "user")
    if role not in ["user", "master"]:
        return jsonify({"error": "Ungültige Rolle"}), 400

    new_user = User(
        username=data["username"],
        email=data["email"],
        password_hash=hashed_password,
        role=role
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": f"User {new_user.username} created", "id": new_user.id}), 201

@admin_bp.route('/edit-user', methods=['PUT'])
@jwt_required()
def admin_edit_user():
    current_user = get_jwt_identity()
    if current_user["role"] != "master":
        return jsonify({"error": "Access forbidden"}), 403

    data = request.get_json()
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Update erlaubter Felder
    if "username" in data:
        user.username = data["username"]
    if "email" in data:
        user.email = data["email"]
    if "role" in data and data["role"] in ["user", "master"]:
        user.role = data["role"]

    # Neues Passwort aktualisieren, falls übergeben (Logik aus der Change Password Route)
    new_password = data.get("new_password")
    if new_password:
        user.password_hash = generate_password_hash(new_password)
    
    db.session.commit()
    return jsonify({"message": "User updated successfully"}), 200


@admin_bp.route('/delete-user/<int:user_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_user(user_id):
    current_user = get_jwt_identity()
    if current_user["role"] != "master":
        return jsonify({"error": "Access forbidden"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted successfully"}), 200

# ------------------------------
# Caseverwaltung
# ------------------------------

# Hinweis: Der Endpoint für "Case erstellen" existiert bereits unter /cases/create.
# Für weitere Admin-Funktionen ergänzen wir nun Edit, Statusänderung und Löschen.

@admin_bp.route('/edit-case/<int:case_id>', methods=['PUT'])
@jwt_required()
def admin_edit_case(case_id):
    current_user = get_jwt_identity()
    if current_user["role"] != "master":
        return jsonify({"error": "Access forbidden"}), 403

    data = request.get_json()
    case = Case.query.get(case_id)
    if not case:
        return jsonify({"error": "Case not found"}), 404

    # Beispiel: Aktualisiere Falltyp und show_results (ggf. weitere Felder ergänzen)
    if "case_type" in data:
        case.case_type = data["case_type"]
    if "show_results" in data:
        case.show_results = data["show_results"]

    db.session.commit()
    return jsonify({"message": "Case updated successfully"}), 200

@admin_bp.route('/case-status/<int:case_id>', methods=['PUT'])
@jwt_required()
def admin_update_case_status(case_id):
    current_user = get_jwt_identity()
    if current_user["role"] != "master":
        return jsonify({"error": "Access forbidden"}), 403

    data = request.get_json()
    # Erwarte z. B. data["status"] als "open" oder "closed"
    status = data.get("status")
    if status not in ["open", "closed"]:
        return jsonify({"error": "Invalid status"}), 400

    case = Case.query.get(case_id)
    if not case:
        return jsonify({"error": "Case not found"}), 404

    # Für dieses Beispiel interpretieren wir "open" als Ergebnisse anzeigen (editierbar)
    # und "closed" als abgeschlossenen Fall (nicht editierbar)
    case.show_results = True if status == "open" else False
    db.session.commit()
    return jsonify({"message": "Case status updated successfully"}), 200

@admin_bp.route('/delete-case/<int:case_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_case(case_id):
    current_user = get_jwt_identity()
    if current_user["role"] != "master":
        return jsonify({"error": "Access forbidden"}), 403

    case = Case.query.get(case_id)
    if not case:
        return jsonify({"error": "Case not found"}), 404

    db.session.delete(case)
    db.session.commit()
    return jsonify({"message": "Case deleted successfully"}), 200
