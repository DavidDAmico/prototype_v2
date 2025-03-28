from flask import Blueprint, request, jsonify
from src.models import db, Case, CaseRound, User, Criterion, Technology, Evaluation, case_users

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
    project_id = data.get('project_id', 1)  # Default-Wert 1 für Abwärtskompatibilität
    case_type = data.get('case_type')
    show_results = data.get('show_results', False)
    criteria_names = data.get('criteria', [])  # List of criterion names
    technology_names = data.get('technologies', [])  # List of technology names
    assigned_user_id = data.get('assigned_user_id')  # ID des zugewiesenen Benutzers
    selected_users = data.get('selected_users', [])  # Liste aller ausgewählten Benutzer-IDs

    print(f"DEBUG: Received case creation request with data: {data}")
    print(f"DEBUG: Assigned user ID: {assigned_user_id}")
    print(f"DEBUG: Selected users: {selected_users}")

    if not case_type:
        return jsonify({"message": "case_type is required"}), 400

    try:
        # Create new case
        new_case = Case(
            project_id=project_id,  # Für Abwärtskompatibilität beibehalten
            case_type=case_type,
            show_results=show_results,
            assigned_user_id=assigned_user_id  # Hauptverantwortlicher Benutzer
        )
        db.session.add(new_case)
        db.session.flush()  # Get the case ID before committing

        # Create and associate criteria
        for name in criteria_names:
            if name.strip():  # Skip empty names
                criterion = Criterion(
                    project_id=project_id,  # Für Abwärtskompatibilität beibehalten
                    name=name.strip()
                )
                db.session.add(criterion)
                db.session.flush()  # Get the criterion ID
                new_case.criteria.append(criterion)

        # Create and associate technologies
        for name in technology_names:
            if name.strip():  # Skip empty names
                technology = Technology(
                    project_id=project_id,  # Für Abwärtskompatibilität beibehalten
                    name=name.strip()
                )
                db.session.add(technology)
                db.session.flush()  # Get the technology ID
                new_case.technologies.append(technology)

        # Alle ausgewählten Benutzer direkt dem Case zuweisen
        for user_id in selected_users:
            user = User.query.get(user_id)
            if user:
                print(f"DEBUG: Adding user {user_id} directly to case {new_case.id}")
                new_case.users.append(user)
            else:
                print(f"DEBUG: User {user_id} not found, skipping")

        db.session.commit()
        print(f"DEBUG: Successfully created case with ID {new_case.id}")
        print(f"DEBUG: Assigned users: {[u.id for u in new_case.users]}")
        
        return jsonify({
            "message": "Case created successfully",
            "case_id": new_case.id,
            "project_id": project_id,  # Für Abwärtskompatibilität beibehalten
            "assigned_user_id": assigned_user_id,
            "assigned_users": [u.id for u in new_case.users]
        }), 201

    except Exception as e:
        print(f"DEBUG: Error creating case: {str(e)}")
        db.session.rollback()
        return jsonify({"message": f"Error creating case: {str(e)}"}), 500

@cases_bp.route('/<int:case_id>', methods=['GET'])
def get_case(case_id):
    """Get a specific case with its criteria, technologies, and rounds."""
    try:
        case = Case.query.get(case_id)
        if not case:
            return jsonify({"message": "Case not found"}), 404

        # Get case-specific criteria and technologies
        criteria = [
            {
                "id": c.id,
                "name": c.name
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

        # Add CORS headers
        response = jsonify({
            "id": case.id,
            "project_id": case.project_id,
            "case_type": case.case_type,
            "show_results": case.show_results,
            "created_at": case.created_at.isoformat() if case.created_at else None,
            "criteria": criteria,
            "technologies": technologies,
            "rounds": rounds
        })
        
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        
        return response, 200
    except Exception as e:
        print(f"Error getting case: {str(e)}")
        return jsonify({"message": f"Error getting case: {str(e)}"}), 500

@cases_bp.route('/<int:case_id>', methods=['OPTIONS'])
def handle_options_case(case_id):
    response = jsonify({})
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Accept')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response, 200

@cases_bp.route('/<int:case_id>/evaluations', methods=['GET'])
def get_case_evaluations(case_id):
    """Get all evaluations for a specific case."""
    try:
        case = Case.query.get(case_id)
        if not case:
            return jsonify({"message": "Case not found"}), 404

        # Hole alle Evaluationen für diesen Case
        evaluations = Evaluation.query.filter_by(case_id=case_id).all()
        
        if not evaluations:
            # Wenn keine Evaluationen gefunden wurden, geben wir leere Arrays zurück (kein 404)
            return jsonify({
                "criteriaEvaluations": [],
                "techMatrixEvaluations": []
            }), 200

        # Teile die Evaluationen in Kriterien und Tech-Matrix auf
        criteria_evaluations = []
        tech_matrix_evaluations = []

        for eval in evaluations:
            if eval.technology_id is None:
                # Kriterien-Evaluation
                criteria_evaluations.append({
                    "id": eval.id,
                    "user_id": eval.user_id,
                    "criterion_id": eval.criterion_id,
                    "score": float(eval.score),
                    "case_id": eval.case_id,
                    "round": eval.round,
                    "created_at": eval.created_at.isoformat() if eval.created_at else None
                })
            else:
                # Tech-Matrix-Evaluation
                tech_matrix_evaluations.append({
                    "id": eval.id,
                    "user_id": eval.user_id,
                    "criterion_id": eval.criterion_id,
                    "technology_id": eval.technology_id,
                    "score": float(eval.score),
                    "case_id": eval.case_id,
                    "round": eval.round,
                    "created_at": eval.created_at.isoformat() if eval.created_at else None
                })

        return jsonify({
            "criteriaEvaluations": criteria_evaluations,
            "techMatrixEvaluations": tech_matrix_evaluations
        }), 200
    except Exception as e:
        print(f"Error getting evaluations: {str(e)}")
        return jsonify({"message": f"Error getting evaluations: {str(e)}"}), 500

@cases_bp.route('/<int:case_id>/evaluations', methods=['POST'])
def save_case_evaluations(case_id):
    """Save evaluations for a case."""
    try:
        case = Case.query.get(case_id)
        if not case:
            return jsonify({"message": "Case not found"}), 404

        data = request.get_json()
        
        if not data or 'evaluations' not in data:
            return jsonify({"message": "No evaluations provided"}), 400

        evaluations = data['evaluations']
        
        # Lösche bestehende Evaluationen für diesen Benutzer und diese Runde
        if evaluations and len(evaluations) > 0:
            user_id = evaluations[0].get('user_id')
            round_num = evaluations[0].get('round')
            
            if user_id and round_num:
                Evaluation.query.filter_by(
                    case_id=case_id,
                    user_id=user_id,
                    round=round_num
                ).delete()
                db.session.commit()
        
        # Speichere neue Evaluationen
        for eval_data in evaluations:
            new_eval = Evaluation(
                user_id=eval_data.get('user_id'),
                criterion_id=eval_data.get('criterion_id'),
                technology_id=eval_data.get('technology_id'),
                score=eval_data.get('score'),
                case_id=case_id,
                round=eval_data.get('round')
            )
            db.session.add(new_eval)
        
        db.session.commit()
        response = jsonify({"message": "Evaluations saved successfully"})
        # CORS-Header hinzufügen
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 201
    
    except Exception as e:
        db.session.rollback()
        print(f"Error saving evaluations: {str(e)}")
        return jsonify({"message": f"Error saving evaluations: {str(e)}"}), 500

@cases_bp.route('/<int:case_id>/evaluations', methods=['OPTIONS'])
def handle_options_evaluations(case_id):
    response = jsonify({})
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Accept')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response, 200

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

    print(f"DEBUG: Received tech matrix evaluation for case {case_id}")
    print(f"DEBUG: user_id={user_id}, round_id={round_id}")
    print(f"DEBUG: tech_criteria_matrix={tech_criteria_matrix}")

    if not user_id or not round_id or not tech_criteria_matrix:
        return jsonify({"message": "user_id, round_id and tech_criteria_matrix are required"}), 400

    case_round = CaseRound.query.get(round_id)
    if not case_round or case_round.case_id != case_id:
        return jsonify({"message": "Invalid round_id"}), 400

    try:
        # Save each technology-criterion evaluation
        for tech_id, criteria_scores in tech_criteria_matrix.items():
            tech_id = int(tech_id)
            for criterion_id, score in criteria_scores.items():
                criterion_id = int(criterion_id)
                # Check if evaluation already exists
                existing_eval = Evaluation.query.filter_by(
                    case_round_id=round_id,
                    user_id=user_id,
                    criterion_id=criterion_id,
                    technology_id=tech_id
                ).first()

                if existing_eval:
                    existing_eval.score = score
                    print(f"DEBUG: Updated tech evaluation - tech:{tech_id}, criterion:{criterion_id}, score:{score}")
                else:
                    new_eval = Evaluation(
                        case_round_id=round_id,
                        user_id=user_id,
                        criterion_id=criterion_id,
                        technology_id=tech_id,
                        score=score
                    )
                    db.session.add(new_eval)
                    print(f"DEBUG: Created tech evaluation - tech:{tech_id}, criterion:{criterion_id}, score:{score}")

        db.session.commit()
        print("DEBUG: Successfully saved all tech matrix evaluations")
        return jsonify({"message": "Technology-criteria evaluations saved successfully"}), 200

    except Exception as e:
        print(f"Error saving evaluations: {str(e)}")
        db.session.rollback()
        return jsonify({"message": f"Error saving evaluations: {str(e)}"}), 500

@cases_bp.route('/<int:case_id>/ratings', methods=['POST'])
def save_case_ratings(case_id):
    """
    Save ratings for a case's criteria
    """
    try:
        print(f"DEBUG: Received ratings request for case {case_id}")
        data = request.json
        ratings = data.get('ratings', {})
        user_id = data.get('user_id')
        round_id = data.get('round_id')

        print(f"DEBUG: Saving ratings with data: user_id={user_id}, round_id={round_id}, ratings={ratings}")

        if not user_id or not round_id:
            return jsonify({"message": "user_id and round_id are required"}), 400

        # Save evaluations for each criterion
        for criterion_id, score in ratings.items():
            criterion_id = int(criterion_id)
            # Check if evaluation already exists
            existing_eval = Evaluation.query.filter_by(
                case_round_id=round_id,
                user_id=user_id,
                criterion_id=criterion_id,
                technology_id=None  # Important: criteria ratings have no technology_id
            ).first()

            if existing_eval:
                existing_eval.score = score
                print(f"DEBUG: Updated existing evaluation for criterion {criterion_id}: {score}")
            else:
                new_eval = Evaluation(
                    case_round_id=round_id,
                    user_id=user_id,
                    criterion_id=criterion_id,
                    technology_id=None,  # Important: criteria ratings have no technology_id
                    score=score
                )
                db.session.add(new_eval)
                print(f"DEBUG: Created new evaluation for criterion {criterion_id}: {score}")

        db.session.commit()
        print("DEBUG: Successfully saved all ratings")
        return jsonify({"message": "Ratings saved successfully"}), 200

    except Exception as e:
        print(f"Error saving ratings: {str(e)}")
        db.session.rollback()
        return jsonify({"message": f"Error saving ratings: {str(e)}"}), 500

@cases_bp.route('/<int:case_id>/evaluations/<int:round_id>', methods=['GET'])
def get_round_evaluations(case_id, round_id):
    """
    Get all evaluations for a specific round of a case
    """
    try:
        print(f"DEBUG: Fetching evaluations for case {case_id}, round {round_id}")
        case = Case.query.get(case_id)
        if not case:
            return jsonify({"message": "Case not found"}), 404

        # Get the case round
        case_round = CaseRound.query.filter_by(case_id=case_id, id=round_id).first()
        if not case_round:
            return jsonify({"message": "Round not found"}), 404

        # Get all evaluations for this round
        evaluations = Evaluation.query.filter_by(case_round_id=round_id).all()
        
        # Convert evaluations to dict format
        eval_data = [{
            'id': e.id,
            'case_round_id': e.case_round_id,
            'user_id': e.user_id,
            'criterion_id': e.criterion_id,
            'technology_id': e.technology_id,
            'score': e.score
        } for e in evaluations]

        print(f"DEBUG: Found {len(eval_data)} evaluations for case {case_id}, round {round_id}")
        print(f"DEBUG: Evaluations data: {eval_data}")
        return jsonify(eval_data), 200

    except Exception as e:
        print(f"Error fetching evaluations: {str(e)}")
        return jsonify({"message": f"Error fetching evaluations: {str(e)}"}), 500

@cases_bp.route('/assigned/<int:user_id>', methods=['GET'])
def get_assigned_cases(user_id):
    """
    Gibt alle Cases zurück, die dem Benutzer zugewiesen sind.
    Ein Benutzer sieht NUR Cases, in denen er explizit in der case_users-Tabelle eingetragen ist
    oder wenn er der assigned_user_id entspricht.
    """
    user_obj = User.query.get(user_id)
    if not user_obj:
        return jsonify({"message": "User not found"}), 404

    print(f"DEBUG: User-ID {user_id} wird geprüft. Rolle: {user_obj.role}")

    # Benutzer sehen nur Cases, denen sie explizit zugewiesen wurden
    cases = Case.query.filter(
        db.or_(
            Case.assigned_user_id == user_id,
            Case.id.in_(
                db.session.query(case_users.c.case_id).filter(case_users.c.user_id == user_id)
            )
        )
    ).all()

    print(f"DEBUG: Found {len(cases)} cases for user {user_id}")
    for case in cases:
        print(f"DEBUG: Case {case.id} - Assigned User: {case.assigned_user_id}")
        # Prüfen, ob der Benutzer direkt dem Case zugewiesen ist
        is_directly_assigned = user_id in [u.id for u in case.users]
        print(f"DEBUG: User {user_id} is directly assigned to case {case.id}: {is_directly_assigned}")

    return jsonify([
        {
            "id": c.id,
            "project_id": c.project_id,  # Wird noch beibehalten für Abwärtskompatibilität
            "case_type": c.case_type,
            "show_results": c.show_results,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "assigned_user_id": c.assigned_user_id,
            "is_directly_assigned": user_id in [u.id for u in c.users]
        } for c in cases
    ]), 200

@cases_bp.route('/history/<int:user_id>', methods=['GET'])
def get_case_history(user_id):
    """
    Gibt alle abgeschlossenen Cases zurück, d.h. jene, bei denen es mindestens einen CaseRound mit round_number == 2 gibt.
    Ein Benutzer sieht NUR Cases, in denen er explizit in der case_users-Tabelle eingetragen ist
    oder wenn er der assigned_user_id entspricht.
    """
    user_obj = User.query.get(user_id)
    if not user_obj:
        return jsonify({"message": "User not found"}), 404

    print(f"DEBUG: User-ID {user_id} wird geprüft. Rolle: {user_obj.role}")

    # Benutzer sehen nur Cases, denen sie explizit zugewiesen wurden
    cases = Case.query.filter(
        db.or_(
            Case.assigned_user_id == user_id,
            Case.id.in_(
                db.session.query(case_users.c.case_id).filter(case_users.c.user_id == user_id)
            )
        )
    ).all()

    completed_cases = [c for c in cases if any(r.round_number == 2 for r in c.rounds)]
    
    print(f"DEBUG: Found {len(completed_cases)} completed cases for user {user_id}")
    for case in completed_cases:
        print(f"DEBUG: Completed Case {case.id} - Assigned User: {case.assigned_user_id}")
        # Prüfen, ob der Benutzer direkt dem Case zugewiesen ist
        is_directly_assigned = user_id in [u.id for u in case.users]
        print(f"DEBUG: User {user_id} is directly assigned to case {case.id}: {is_directly_assigned}")
    
    return jsonify([
        {
            "id": c.id,
            "project_id": c.project_id,  # Wird noch beibehalten für Abwärtskompatibilität
            "case_type": c.case_type,
            "show_results": c.show_results,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "assigned_user_id": c.assigned_user_id,
            "is_directly_assigned": user_id in [u.id for u in c.users]
        } for c in completed_cases
    ]), 200
