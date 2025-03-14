from flask import Blueprint, request, jsonify
from src.models import db, Case, CaseRound, Project, User, ProjectUser

cases_bp = Blueprint('cases', __name__)

@cases_bp.route('/', methods=['GET'])
def get_all_cases():
    cases = Case.query.all()
    return jsonify([
        {
            "id": c.id,
            "project_id": c.project_id,
            "case_type": c.case_type,
            "show_results": c.show_results,
            "created_at": c.created_at.isoformat() if c.created_at else None
        } for c in cases
    ]), 200

@cases_bp.route('/round1', methods=['GET'])
def get_round1_cases():
    """
    Gibt alle Fälle zurück, die noch nicht in Runde 2 sind.
    Das heißt: Es existiert kein zugehöriger CaseRound mit round_number == 2.
    """
    cases = Case.query.all()
    round1_cases = [c for c in cases if not any(r.round_number == 2 for r in c.rounds)]
    return jsonify([
        {
            "id": c.id,
            "project_id": c.project_id,
            "case_type": c.case_type,
            "show_results": c.show_results,
            "created_at": c.created_at.isoformat() if c.created_at else None
        } for c in round1_cases
    ]), 200

@cases_bp.route('/create', methods=['POST'])
def create_case():
    data = request.get_json()

    # Überprüfe, ob eine Projekt-ID im Payload enthalten ist
    project_id = data.get('project_id')
    # Erwartet eine Liste von User-IDs, die zugewiesen werden sollen
    assigned_user_ids = data.get('assigned_users', [])
    
    if not project_id:
        return jsonify({"message": "project_id is required"}), 400

    project = Project.query.get(project_id)
    
    # Falls das Projekt nicht existiert, erstelle ein Standardprojekt
    if not project:
        default_master_id = 1  # Standard-Master-Benutzer
        project = Project(
            name="Default Project",
            description="Automatisch erstellt, da kein Projekt mit der angegebenen ID existierte.",
            master_id=default_master_id
        )
        db.session.add(project)
        db.session.commit()
        project_id = project.id

    # Erstelle den neuen Case
    new_case = Case(
        project_id=project_id,
        case_type=data['case_type'],
        show_results=data.get('show_results', False)
    )
    db.session.add(new_case)
    db.session.commit()

    # Sicherstellen, dass alle relevanten User in project_users eingetragen sind

    # Hole die bereits zugeordneten User für dieses Projekt
    project_users = ProjectUser.query.filter_by(project_id=project_id).all()
    existing_user_ids = {pu.user_id for pu in project_users}

    # Falls der Master des Projekts nicht in project_users ist, füge ihn hinzu
    if project.master_id not in existing_user_ids:
        db.session.add(ProjectUser(project_id=project_id, user_id=project.master_id))
        existing_user_ids.add(project.master_id)

    # Füge alle zugewiesenen User hinzu, sofern sie noch nicht eingetragen sind
    for user_id in assigned_user_ids:
        if user_id not in existing_user_ids:
            user = User.query.get(user_id)
            if user:
                db.session.add(ProjectUser(project_id=project_id, user_id=user_id))
                existing_user_ids.add(user_id)

    db.session.commit()

    return jsonify({"message": "Case created", "id": new_case.id}), 201

@cases_bp.route('/<int:case_id>', methods=['GET'])
def get_case(case_id):
    case = Case.query.get(case_id)
    if not case:
        return jsonify({"message": "Case not found"}), 404
    return jsonify({
        "id": case.id,
        "project_id": case.project_id,
        "case_type": case.case_type,
        "show_results": case.show_results,
        "created_at": case.created_at.isoformat() if case.created_at else None,
        "rounds": [
            {"id": r.id, "round_number": r.round_number, "is_completed": r.is_completed}
            for r in case.rounds
        ]
    }), 200

@cases_bp.route('/<int:case_id>', methods=['PUT'])
def update_case(case_id):
    data = request.get_json()
    case = Case.query.get(case_id)
    if not case:
        return jsonify({"message": "Case not found"}), 404
    if 'case_type' in data:
        case.case_type = data['case_type']
    if 'show_results' in data:
        case.show_results = data['show_results']
    db.session.commit()
    return jsonify({"message": "Case updated"}), 200

@cases_bp.route('/<int:case_id>/add_round', methods=['POST'])
def add_case_round(case_id):
    data = request.get_json()
    round_number = data.get('round_number')
    if round_number is None:
        return jsonify({"message": "round_number is required"}), 400
    new_round = CaseRound(case_id=case_id, round_number=round_number)
    db.session.add(new_round)
    db.session.commit()
    return jsonify({"message": "New round added", "id": new_round.id}), 201

@cases_bp.route('/assigned/<int:user_id>', methods=['GET'])
def get_assigned_cases(user_id):
    """
    Gibt alle Cases zurück, die dem Benutzer zugewiesen sind.
    Unabhängig von der Rolle werden beide Quellen kombiniert:
      - Projekte, bei denen der User als Master geführt wird.
      - Projekte, in denen der User als Teilnehmer (ProjectUser) eingetragen ist.
    """
    user_obj = User.query.get(user_id)
    if not user_obj:
        return jsonify({"message": "User not found"}), 404

    print(f"DEBUG: User-ID {user_id} wird geprüft. Rolle: {user_obj.role}")

    # Projekte, bei denen der User als Master geführt wird
    master_projects = Project.query.filter_by(master_id=user_id).all()
    master_project_ids = [p.id for p in master_projects]

    # Projekte, in denen der User als Teilnehmer (über ProjectUser) eingetragen ist
    participant_assignments = ProjectUser.query.filter_by(user_id=user_id).all()
    participant_project_ids = [assignment.project_id for assignment in participant_assignments]

    # Beide Listen kombinieren (Duplikate entfernen)
    project_ids = list(set(master_project_ids + participant_project_ids))

    print(f"DEBUG: Master-Projekt-IDs für User {user_id}: {master_project_ids}")
    print(f"DEBUG: Teilnehmer-Projekt-IDs für User {user_id}: {participant_project_ids}")
    print(f"DEBUG: Gesamt-Projekt-IDs für User {user_id}: {project_ids}")

    if not project_ids:
        return jsonify([]), 200

    cases = Case.query.filter(Case.project_id.in_(project_ids)).all()
    
    print(f"DEBUG: Anzahl der gefundenen Cases für User {user_id}: {len(cases)}")

    return jsonify([
        {
            "id": c.id,
            "project_id": c.project_id,
            "case_type": c.case_type,
            "show_results": c.show_results,
            "created_at": c.created_at.isoformat() if c.created_at else None
        } for c in cases
    ]), 200

@cases_bp.route('/history/<int:user_id>', methods=['GET'])
def get_case_history(user_id):
    """
    Gibt alle abgeschlossenen Cases zurück, d.h. jene, bei denen es mindestens einen CaseRound mit round_number == 2 gibt.
    Die Zuweisung erfolgt analog wie bei get_assigned_cases.
    """
    user_obj = User.query.get(user_id)
    if not user_obj:
        return jsonify({"message": "User not found"}), 404

    if user_obj.role == "master":
        projects = Project.query.filter_by(master_id=user_id).all()
        project_ids = [p.id for p in projects]
    else:
        assignments = ProjectUser.query.filter_by(user_id=user_id).all()
        project_ids = [a.project_id for a in assignments]

    cases = Case.query.filter(Case.project_id.in_(project_ids)).all()
    completed_cases = [c for c in cases if any(r.round_number == 2 for r in c.rounds)]
    return jsonify([
        {
            "id": c.id,
            "project_id": c.project_id,
            "case_type": c.case_type,
            "show_results": c.show_results,
            "created_at": c.created_at.isoformat() if c.created_at else None
        } for c in completed_cases
    ]), 200
