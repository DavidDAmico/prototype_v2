from flask import Blueprint, request, jsonify
from src.models import db, Case, CaseRound, Project, User, ProjectUser, Criterion, Technology, Evaluation

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

@cases_bp.route('/', methods=['POST'])
def create_case():
        
    data = request.get_json()
    project_id = data.get('project_id')
    case_type = data.get('case_type')
    show_results = data.get('show_results', False)
    criteria_names = data.get('criteria', [])  # List of criterion names
    technology_names = data.get('technologies', [])  # List of technology names

    if not project_id or not case_type:
        return jsonify({"message": "project_id and case_type are required"}), 400

    # Validate project exists
    project = Project.query.get(project_id)
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

    try:
        # Create new case
        new_case = Case(
            project_id=project_id,
            case_type=case_type,
            show_results=show_results
        )
        db.session.add(new_case)
        db.session.flush()  # Get the case ID before committing

        # Create and associate criteria
        for name in criteria_names:
            if name.strip():  # Skip empty names
                criterion = Criterion(
                    project_id=project_id,
                    name=name.strip()
                )
                db.session.add(criterion)
                db.session.flush()  # Get the criterion ID
                new_case.criteria.append(criterion)

        # Create and associate technologies
        for name in technology_names:
            if name.strip():  # Skip empty names
                technology = Technology(
                    project_id=project_id,
                    name=name.strip()
                )
                db.session.add(technology)
                db.session.flush()  # Get the technology ID
                new_case.technologies.append(technology)

        db.session.commit()
        return jsonify({
            "message": "Case created successfully",
            "case_id": new_case.id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error creating case: {str(e)}"}), 500

@cases_bp.route('/<int:case_id>', methods=['GET'])
def get_case(case_id):
    """Get a specific case with its criteria, technologies, and rounds."""
    case = Case.query.get(case_id)
    if not case:
        return jsonify({"message": "Case not found"}), 404

    # Get case-specific criteria and technologies
    criteria = [
        {
            "id": c.id,
            "name": c.name,
            "evaluations": [
                {
                    "user_id": e.user_id,
                    "score": float(e.score),
                    "created_at": e.created_at.isoformat()
                }
                for e in Evaluation.query.filter_by(criterion_id=c.id).all()
            ]
        }
        for c in case.criteria
    ]

    technologies = [
        {
            "id": t.id,
            "name": t.name
        }
        for t in case.technologies
    ]

    rounds = [
        {
            "id": r.id,
            "round_number": r.round_number,
            "is_completed": r.is_completed
        }
        for r in case.rounds
    ]

    return jsonify({
        "id": case.id,
        "project_id": case.project_id,
        "case_type": case.case_type,
        "show_results": case.show_results,
        "created_at": case.created_at.isoformat(),
        "criteria": criteria,
        "technologies": technologies,
        "rounds": rounds
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

@cases_bp.route('/<int:case_id>/evaluate', methods=['POST'])
def evaluate_case(case_id):
    data = request.get_json()
    user_id = data.get('user_id')
    round_id = data.get('round_id')
    evaluations = data.get('evaluations', [])  # List of {criterion_id, score}

    if not user_id or not round_id or not evaluations:
        return jsonify({"message": "user_id, round_id and evaluations are required"}), 400

    case_round = CaseRound.query.get(round_id)
    if not case_round or case_round.case_id != case_id:
        return jsonify({"message": "Invalid round_id"}), 400

    # Save evaluations
    for eval_data in evaluations:
        criterion_id = eval_data.get('criterion_id')
        score = eval_data.get('score')
        
        if not criterion_id or score is None:
            continue
            
        # Check if evaluation already exists
        existing_eval = Evaluation.query.filter_by(
            case_round_id=round_id,
            user_id=user_id,
            criterion_id=criterion_id
        ).first()
        
        if existing_eval:
            existing_eval.score = score
        else:
            new_eval = Evaluation(
                case_round_id=round_id,
                user_id=user_id,
                criterion_id=criterion_id,
                score=score
            )
            db.session.add(new_eval)

    db.session.commit()
    return jsonify({"message": "Evaluations saved successfully"}), 200

@cases_bp.route('/<int:case_id>/evaluate-tech-criteria', methods=['POST'])
def evaluate_tech_criteria(case_id):
    data = request.get_json()
    user_id = data.get('user_id')
    round_id = data.get('round_id')
    tech_criteria_matrix = data.get('tech_criteria_matrix', {})  # Format: {tech_id: {criterion_id: score}}

    if not user_id or not round_id or not tech_criteria_matrix:
        return jsonify({"message": "user_id, round_id and tech_criteria_matrix are required"}), 400

    case_round = CaseRound.query.get(round_id)
    if not case_round or case_round.case_id != case_id:
        return jsonify({"message": "Invalid round_id"}), 400

    try:
        # Save each technology-criterion evaluation
        for tech_id, criteria_scores in tech_criteria_matrix.items():
            tech_id = int(tech_id)  # Convert to integer
            for criterion_id, score in criteria_scores.items():
                criterion_id = int(criterion_id)  # Convert to integer
                # Check if evaluation already exists
                existing_eval = Evaluation.query.filter_by(
                    case_round_id=round_id,
                    user_id=user_id,
                    criterion_id=criterion_id,
                    technology_id=tech_id
                ).first()

                if existing_eval:
                    existing_eval.score = score
                else:
                    new_eval = Evaluation(
                        case_round_id=round_id,
                        user_id=user_id,
                        criterion_id=criterion_id,
                        technology_id=tech_id,
                        score=score
                    )
                    db.session.add(new_eval)

        db.session.commit()
        return jsonify({"message": "Technology-criteria evaluations saved successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error saving evaluations: {str(e)}"}), 500

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
