from flask import Blueprint, request, jsonify
from src.models import db, Case, CaseRound, User, Criterion, Technology, Evaluation, case_users, RoundAnalysis
import numpy as np
from sqlalchemy import and_
from sqlalchemy.sql import func

cases_bp = Blueprint('cases', __name__)

# Hilfsfunktion zur Berechnung der Distanz zwischen zwei Fuzzy-Vektoren
def calculate_fuzzy_distance(vector1, vector2):
    """
    Berechnet die Distanz zwischen zwei Fuzzy-Vektoren nach der Formel:
    d(A, B) = sqrt((a1-a2)² + (b1-b2)² + (c1-c2)²) / sqrt(3)
    """
    a_diff = vector1[0] - vector2[0]
    b_diff = vector1[1] - vector2[1]
    c_diff = vector1[2] - vector2[2]
    
    # Euklidische Distanz geteilt durch sqrt(3) für Normalisierung
    distance = np.sqrt(a_diff**2 + b_diff**2 + c_diff**2) / np.sqrt(3)
    return distance

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
    case_name = data.get('name')  # Name des Cases
    
    # Grenzwerte für die Rundenanalyse
    threshold_distance_mean = data.get('threshold_distance_mean', 0.166667)  # Standardwert 1/6
    threshold_criteria_percent = data.get('threshold_criteria_percent', 75.0)  # Standardwert 75%
    threshold_tech_percent = data.get('threshold_tech_percent', 75.0)  # Standardwert 75%

    print(f"DEBUG: Received case creation request with data: {data}")
    print(f"DEBUG: Assigned user ID: {assigned_user_id}")
    print(f"DEBUG: Selected users: {selected_users}")
    print(f"DEBUG: Case name: {case_name}")
    print(f"DEBUG: Thresholds: {threshold_distance_mean}, {threshold_criteria_percent}, {threshold_tech_percent}")

    if not case_type:
        return jsonify({"message": "case_type is required"}), 400

    try:
        # Create new case
        new_case = Case(
            project_id=project_id,  # Für Abwärtskompatibilität beibehalten
            case_type=case_type,
            show_results=show_results,
            assigned_user_id=assigned_user_id,  # Hauptverantwortlicher Benutzer
            name=case_name,  # Name des Cases
            threshold_distance_mean=threshold_distance_mean,
            threshold_criteria_percent=threshold_criteria_percent,
            threshold_tech_percent=threshold_tech_percent,
            current_round=1  # Neue Cases starten immer mit Runde 1
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

        # Hole alle Kriterien für diesen Case
        criteria = []
        for criterion in case.criteria:
            criteria.append({
                "id": criterion.id,
                "name": criterion.name,
                "rating": criterion.rating
            })

        # Hole alle Technologien für diesen Case
        technologies = []
        for technology in case.technologies:
            technologies.append({
                "id": technology.id,
                "name": technology.name
            })

        # Hole alle Runden für diesen Case
        rounds = []
        for round_obj in case.rounds:
            rounds.append({
                "id": round_obj.id,
                "round_number": round_obj.round_number,
                "created_at": round_obj.created_at.isoformat() if round_obj.created_at else None
            })

        # Hole alle zugewiesenen Benutzer und deren Bewertungsstatus
        users = []
        for user in case.users:
            # Prüfe, ob der Benutzer Bewertungen für diesen Case abgegeben hat
            evaluations = Evaluation.query.filter_by(case_id=case_id, user_id=user.id).all()
            has_evaluated = len(evaluations) > 0
            
            users.append({
                "user_id": user.id,
                "username": user.username,
                "has_evaluated": has_evaluated
            })

        # Füge auch den assigned_user hinzu, falls er nicht bereits in der Liste ist
        if case.assigned_user_id and case.assigned_user_id not in [u["user_id"] for u in users]:
            assigned_user = User.query.get(case.assigned_user_id)
            if assigned_user:
                evaluations = Evaluation.query.filter_by(case_id=case_id, user_id=assigned_user.id).all()
                has_evaluated = len(evaluations) > 0
                
                users.append({
                    "user_id": assigned_user.id,
                    "username": assigned_user.username,
                    "has_evaluated": has_evaluated
                })

        response = jsonify({
            "id": case.id,
            "project_id": case.project_id,
            "case_type": case.case_type,
            "show_results": case.show_results,
            "created_at": case.created_at.isoformat() if case.created_at else None,
            "name": case.name if case.name else f"Case {case.id}",  # Fallback, falls kein Name gesetzt ist
            "criteria": criteria,
            "technologies": technologies,
            "rounds": rounds,
            "users": users,
            "current_round": case.current_round  # Aktuelle Runde hinzufügen
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

        # Prüfen, ob ein bestimmter Benutzer und eine bestimmte Runde angefordert wurden
        user_id = request.args.get('user_id', None)
        round_number = request.args.get('round', None)
        
        # Basis-Query für alle Evaluationen dieses Cases
        query = Evaluation.query.filter_by(case_id=case_id)
        
        # Wenn ein Benutzer angegeben wurde, nur dessen Bewertungen abrufen
        if user_id:
            query = query.filter_by(user_id=user_id)
            
        # Wenn eine Runde angegeben wurde, nur Bewertungen dieser Runde abrufen
        if round_number:
            query = query.filter_by(round=round_number)
        
        # Alle passenden Evaluationen abrufen
        evaluations = query.all()
        
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
                    "created_at": eval.created_at.isoformat() if eval.created_at else None,
                    "needs_reevaluation": eval.needs_reevaluation
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
                    "created_at": eval.created_at.isoformat() if eval.created_at else None,
                    "needs_reevaluation": eval.needs_reevaluation
                })

        return jsonify({
            "criteriaEvaluations": criteria_evaluations,
            "techMatrixEvaluations": tech_matrix_evaluations
        }), 200
    except Exception as e:
        print(f"Error in get_case_evaluations: {str(e)}")
        return jsonify({"message": f"Error fetching evaluations: {str(e)}"}), 500

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
            
            # Speichere den Fuzzy-Vektor, wenn vorhanden
            fuzzy_vector = eval_data.get('fuzzy_vector')
            if fuzzy_vector:
                new_eval.fuzzy_vector_a = fuzzy_vector.get('a', 0.0)
                new_eval.fuzzy_vector_b = fuzzy_vector.get('b', 0.0)
                new_eval.fuzzy_vector_c = fuzzy_vector.get('c', 0.0)
            
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

    # Filtere Cases, die bereits abgeschlossen sind (letzte Rundenanalyse bestanden)
    active_cases = []
    for case in cases:
        # Letzte Rundenanalyse für diesen Case abrufen
        latest_analysis = RoundAnalysis.query.filter_by(case_id=case.id).order_by(RoundAnalysis.round_number.desc()).first()
        
        # Case ist aktiv, wenn keine Analyse vorhanden ist oder die letzte Analyse nicht bestanden wurde
        if not latest_analysis or not latest_analysis.passed_analysis:
            active_cases.append(case)

    print(f"DEBUG: Found {len(active_cases)} active cases for user {user_id}")
    for case in active_cases:
        print(f"DEBUG: Active Case {case.id} - Assigned User: {case.assigned_user_id}")
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
            "is_directly_assigned": user_id in [u.id for u in c.users],
            "name": c.name if c.name else f"Case {c.id}",  # Name des Cases hinzufügen
            "current_round": c.current_round  # Aktuelle Runde hinzufügen
        } for c in active_cases
    ]), 200

@cases_bp.route('/history/<int:user_id>', methods=['GET'])
def get_case_history(user_id):
    """
    Gibt alle abgeschlossenen Cases zurück, d.h. jene, bei denen die letzte Rundenanalyse bestanden wurde
    und keine weiteren Bewertungen mehr erforderlich sind.
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

    # Ein Case gilt als abgeschlossen, wenn die letzte Rundenanalyse bestanden wurde
    completed_cases = []
    for case in cases:
        # Letzte Rundenanalyse für diesen Case abrufen
        latest_analysis = RoundAnalysis.query.filter_by(case_id=case.id).order_by(RoundAnalysis.round_number.desc()).first()
        
        # Case ist abgeschlossen, wenn die letzte Analyse bestanden wurde
        if latest_analysis and latest_analysis.passed_analysis:
            completed_cases.append(case)
    
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
            "is_directly_assigned": user_id in [u.id for u in c.users],
            "name": c.name if c.name else f"Case {c.id}",  # Name des Cases hinzufügen
            "current_round": c.current_round  # Aktuelle Runde hinzufügen
        } for c in completed_cases
    ]), 200

@cases_bp.route('/admin/overview', methods=['GET'])
def get_cases_overview():
    """
    Gibt eine detaillierte Übersicht über alle Cases zurück, einschließlich Informationen darüber,
    welche Benutzer die Bewertung abgeschlossen haben, welche noch dabei sind und welche noch nicht begonnen haben.
    Diese Route ist nur für Master-Benutzer zugänglich.
    """
    try:
        # Alle Cases abrufen
        cases = Case.query.all()
        
        # Ergebnis-Array vorbereiten
        result = []
        
        for case in cases:
            # Alle diesem Case zugewiesenen Benutzer
            assigned_users = case.users
            assigned_user_ids = [u.id for u in assigned_users]
            
            # Informationen über die Bewertungen für diesen Case sammeln
            user_evaluation_status = []
            
            for user in assigned_users:
                # Alle Bewertungen dieses Benutzers für diesen Case direkt abrufen
                evaluations = Evaluation.query.filter_by(
                    case_id=case.id,
                    user_id=user.id,
                    round=case.current_round  # Nach aktueller Runde filtern
                ).all()
                
                # Debug-Ausgabe
                print(f"DEBUG: Case {case.id}, User {user.id}, Current Round {case.current_round}, Evaluations count: {len(evaluations)}")
                
                # Anzahl der Kriterien und Technologien für diesen Case
                criteria_count = len(case.criteria)
                tech_count = len(case.technologies)
                
                # Gesamtzahl der möglichen Bewertungen (Kriterien + Kriterien*Technologien)
                total_possible_evaluations = criteria_count + (criteria_count * tech_count)
                
                # Zähle Kriterien- und Technologie-Matrix-Bewertungen separat
                criteria_evaluations = [e for e in evaluations if e.technology_id is None]
                tech_matrix_evaluations = [e for e in evaluations if e.technology_id is not None]
                
                # Bewertungsstatus bestimmen
                if len(evaluations) == 0:
                    status = "not_started"
                elif len(evaluations) < total_possible_evaluations:
                    status = "in_progress"
                else:
                    status = "completed"
                
                user_evaluation_status.append({
                    "user_id": user.id,
                    "username": user.username,
                    "status": status,
                    "evaluations_completed": len(evaluations),
                    "total_evaluations": total_possible_evaluations,
                    "criteria_completed": len(criteria_evaluations),
                    "criteria_total": criteria_count,
                    "tech_matrix_completed": len(tech_matrix_evaluations),
                    "tech_matrix_total": criteria_count * tech_count
                })
            
            # Case-Informationen mit Bewertungsstatus zusammenführen
            case_info = {
                "id": case.id,
                "name": case.name if case.name else f"Case {case.id}",
                "case_type": case.case_type,
                "created_at": case.created_at.isoformat() if case.created_at else None,
                "criteria_count": len(case.criteria),
                "technologies_count": len(case.technologies),
                "current_round": case.current_round,  # Aktuelle Runde hinzufügen
                "assigned_users": user_evaluation_status
            }
            
            result.append(case_info)
        
        return jsonify(result), 200
    except Exception as e:
        print(f"Error in get_cases_overview: {str(e)}")
        return jsonify({"message": f"Error fetching cases overview: {str(e)}"}), 500

@cases_bp.route('/<int:case_id>/analyze-round', methods=['POST'])
def analyze_round(case_id):
    """
    Analysiert die Bewertungen einer Runde für einen Case und entscheidet, ob eine weitere Runde erforderlich ist.
    Berechnet die Distanz zum Mittelwert basierend auf Fuzzy-Vektoren.
    Wenn die Distanz kleiner als der Threshold ist, wird die Runde als bestanden markiert.
    Andernfalls wird eine neue Runde erstellt und die Bewertungen, die nicht im grünen Bereich sind,
    werden für die Neubewertung markiert.
    """
    try:
        # Case abrufen
        case = Case.query.get(case_id)
        if not case:
            return jsonify({"message": "Case not found"}), 404
        
        # Aktuelle Runde bestimmen
        current_round = case.current_round
        
        # Grenzwert für die Distanz zum Mittelwert aus dem Case abrufen
        threshold_distance_mean = case.threshold_distance_mean
        
        # Alle Benutzer für diesen Case abrufen
        users = case.users
        
        # Alle Kriterien und Technologien für diesen Case abrufen
        criteria = case.criteria
        technologies = case.technologies
        
        # Prüfen, ob alle erforderlichen Bewertungen für die aktuelle Runde vorliegen
        # In Runde 1 müssen alle Bewertungen vorliegen
        # In höheren Runden müssen nur die Bewertungen vorliegen, die neu bewertet werden müssen
        if current_round == 1:
            # In Runde 1 müssen alle Bewertungen vorliegen
            total_expected_evaluations = len(users) * (len(criteria) + len(criteria) * len(technologies))
            actual_evaluations = Evaluation.query.filter_by(case_id=case_id, round=current_round).count()
            
            if actual_evaluations < total_expected_evaluations:
                return jsonify({
                    "message": "Cannot analyze round: Not all users have completed their evaluations",
                    "completed_evaluations": actual_evaluations,
                    "total_expected_evaluations": total_expected_evaluations
                }), 400
        else:
            # In höheren Runden müssen nur die Bewertungen vorliegen, die neu bewertet werden müssen
            # Wir prüfen, ob für jede Bewertung, die neu bewertet werden muss, eine Bewertung in der aktuellen Runde vorliegt
            
            # Alle Bewertungen aus der vorherigen Runde, die neu bewertet werden müssen
            previous_round = current_round - 1
            needs_reevaluation = Evaluation.query.filter_by(
                case_id=case_id, 
                round=previous_round, 
                needs_reevaluation=True
            ).all()
            
            # Für jede Bewertung, die neu bewertet werden muss, prüfen, ob eine Bewertung in der aktuellen Runde vorliegt
            missing_evaluations = []
            
            for eval_to_redo in needs_reevaluation:
                # Prüfen, ob eine Bewertung in der aktuellen Runde vorliegt
                current_eval = Evaluation.query.filter_by(
                    case_id=case_id,
                    user_id=eval_to_redo.user_id,
                    criterion_id=eval_to_redo.criterion_id,
                    technology_id=eval_to_redo.technology_id,
                    round=current_round
                ).first()
                
                if not current_eval:
                    missing_evaluations.append({
                        "user_id": eval_to_redo.user_id,
                        "criterion_id": eval_to_redo.criterion_id,
                        "technology_id": eval_to_redo.technology_id
                    })
            
            if missing_evaluations:
                return jsonify({
                    "message": "Cannot analyze round: Not all users have completed their evaluations",
                    "missing_evaluations": missing_evaluations,
                    "total_missing": len(missing_evaluations)
                }), 400
        
        # Statistiken initialisieren
        criteria_ok_count = 0
        criteria_total_count = len(criteria) * len(users)
        tech_ok_count = 0
        tech_total_count = len(criteria) * len(technologies) * len(users)
        
        # Für jeden Benutzer die Bewertungen analysieren
        for user in users:
            # Kriterien-Bewertungen analysieren
            for criterion in criteria:
                # Bewertungen aller Benutzer für dieses Kriterium abrufen (aktuelle Runde)
                all_criterion_evals = Evaluation.query.filter_by(
                    case_id=case_id,
                    criterion_id=criterion.id,
                    technology_id=None,
                    round=current_round
                ).all()
                
                # Wenn wir in einer höheren Runde sind, auch die Bewertungen aus der vorherigen Runde berücksichtigen,
                # die nicht neu bewertet werden mussten
                if current_round > 1:
                    previous_criterion_evals = Evaluation.query.filter_by(
                        case_id=case_id,
                        criterion_id=criterion.id,
                        technology_id=None,
                        round=current_round-1,
                        needs_reevaluation=False
                    ).all()
                    
                    # Diese Bewertungen zur Liste der aktuellen Bewertungen hinzufügen
                    all_criterion_evals.extend(previous_criterion_evals)
                
                if len(all_criterion_evals) > 0:
                    # Mittelwert der Fuzzy-Vektoren berechnen
                    mean_vector_a = float(np.mean([eval.fuzzy_vector_a for eval in all_criterion_evals]))
                    mean_vector_b = float(np.mean([eval.fuzzy_vector_b for eval in all_criterion_evals]))
                    mean_vector_c = float(np.mean([eval.fuzzy_vector_c for eval in all_criterion_evals]))
                    mean_vector = (mean_vector_a, mean_vector_b, mean_vector_c)
                    
                    # Gesamtdistanz für dieses Kriterium berechnen
                    criterion_total_distance = 0
                    for evaluation in all_criterion_evals:
                        user_vector = (float(evaluation.fuzzy_vector_a), float(evaluation.fuzzy_vector_b), float(evaluation.fuzzy_vector_c))
                        distance = float(calculate_fuzzy_distance(user_vector, mean_vector))
                        criterion_total_distance += distance
                    
                    # Durchschnittliche Distanz für dieses Kriterium berechnen
                    criterion_mean_distance = criterion_total_distance / len(all_criterion_evals)
                    
                    # Prüfen, ob die durchschnittliche Distanz im grünen Bereich ist
                    if criterion_mean_distance <= threshold_distance_mean:
                        criteria_ok_count += 1
                    
                    # Für jeden Benutzer prüfen, ob seine Bewertung neu bewertet werden muss
                    for user_eval in all_criterion_evals:
                        if user_eval.round == current_round:  # Nur Bewertungen der aktuellen Runde markieren
                            user_vector = (float(user_eval.fuzzy_vector_a), float(user_eval.fuzzy_vector_b), float(user_eval.fuzzy_vector_c))
                            distance = float(calculate_fuzzy_distance(user_vector, mean_vector))
                            
                            # Bewertung für die nächste Runde markieren
                            user_eval.needs_reevaluation = distance > threshold_distance_mean
            
            # Technologie-Matrix-Bewertungen analysieren
            for technology in technologies:
                for criterion in criteria:
                    # Bewertungen aller Benutzer für diese Technologie-Kriterium-Kombination abrufen (aktuelle Runde)
                    all_tech_evals = Evaluation.query.filter_by(
                        case_id=case_id,
                        criterion_id=criterion.id,
                        technology_id=technology.id,
                        round=current_round
                    ).all()
                    
                    # Wenn wir in einer höheren Runde sind, auch die Bewertungen aus der vorherigen Runde berücksichtigen,
                    # die nicht neu bewertet werden mussten
                    if current_round > 1:
                        previous_tech_evals = Evaluation.query.filter_by(
                            case_id=case_id,
                            criterion_id=criterion.id,
                            technology_id=technology.id,
                            round=current_round-1,
                            needs_reevaluation=False
                        ).all()
                        
                        # Diese Bewertungen zur Liste der aktuellen Bewertungen hinzufügen
                        all_tech_evals.extend(previous_tech_evals)
                    
                    if len(all_tech_evals) > 0:
                        # Mittelwert der Fuzzy-Vektoren berechnen
                        mean_vector_a = float(np.mean([eval.fuzzy_vector_a for eval in all_tech_evals]))
                        mean_vector_b = float(np.mean([eval.fuzzy_vector_b for eval in all_tech_evals]))
                        mean_vector_c = float(np.mean([eval.fuzzy_vector_c for eval in all_tech_evals]))
                        mean_vector = (mean_vector_a, mean_vector_b, mean_vector_c)
                        
                        # Gesamtdistanz für diese Technologie-Kriterium-Kombination berechnen
                        tech_criterion_total_distance = 0
                        for evaluation in all_tech_evals:
                            user_vector = (float(evaluation.fuzzy_vector_a), float(evaluation.fuzzy_vector_b), float(evaluation.fuzzy_vector_c))
                            distance = float(calculate_fuzzy_distance(user_vector, mean_vector))
                            tech_criterion_total_distance += distance
                        
                        # Durchschnittliche Distanz für diese Technologie-Kriterium-Kombination berechnen
                        tech_criterion_mean_distance = tech_criterion_total_distance / len(all_tech_evals)
                        
                        # Prüfen, ob die durchschnittliche Distanz im grünen Bereich ist
                        if tech_criterion_mean_distance <= threshold_distance_mean:
                            tech_ok_count += 1
                        
                        # Für jeden Benutzer prüfen, ob seine Bewertung neu bewertet werden muss
                        for user_eval in all_tech_evals:
                            if user_eval.round == current_round:  # Nur Bewertungen der aktuellen Runde markieren
                                user_vector = (float(user_eval.fuzzy_vector_a), float(user_eval.fuzzy_vector_b), float(user_eval.fuzzy_vector_c))
                                distance = float(calculate_fuzzy_distance(user_vector, mean_vector))
                                
                                # Bewertung für die nächste Runde markieren
                                user_eval.needs_reevaluation = distance > threshold_distance_mean
        
        # Prozentsätze berechnen
        criteria_ok_percent = (criteria_ok_count / criteria_total_count * 100) if criteria_total_count > 0 else 0
        tech_ok_percent = (tech_ok_count / tech_total_count * 100) if tech_total_count > 0 else 0
        
        # Prüfen, ob alle Werte im grünen Bereich sind
        criteria_passed = criteria_ok_percent >= case.threshold_criteria_percent
        tech_passed = tech_ok_percent >= case.threshold_tech_percent
        
        # Tatsächliche durchschnittliche Distanz zum Mittelwert berechnen
        # Wir verwenden die berechneten Distanzen aus den Fuzzy-Vektoren
        
        # Alle Bewertungen für die aktuelle Runde sammeln
        all_current_evaluations = Evaluation.query.filter_by(case_id=case_id, round=current_round).all()
        
        # Distanz zum Mittelwert für jede Bewertung berechnen
        total_distance = 0
        total_evaluations = 0
        
        # Separate Werte für Kriterien und Technologie-Matrix
        criteria_total_distance = 0
        criteria_total_evaluations = 0
        tech_total_distance = 0
        tech_total_evaluations = 0
        
        # Für jede Kriterium-Technologie-Kombination die Distanz zum Mittelwert berechnen
        for criterion in criteria:
            # Kriterien-Bewertungen
            criterion_evals = [e for e in all_current_evaluations if e.criterion_id == criterion.id and e.technology_id is None]
            
            if criterion_evals:
                # Mittelwert der Fuzzy-Vektoren berechnen
                mean_vector_a = float(np.mean([eval.fuzzy_vector_a for eval in criterion_evals]))
                mean_vector_b = float(np.mean([eval.fuzzy_vector_b for eval in criterion_evals]))
                mean_vector_c = float(np.mean([eval.fuzzy_vector_c for eval in criterion_evals]))
                mean_vector = (mean_vector_a, mean_vector_b, mean_vector_c)
                
                # Distanz jeder Bewertung zum Mittelwert berechnen
                for evaluation in criterion_evals:
                    user_vector = (float(evaluation.fuzzy_vector_a), float(evaluation.fuzzy_vector_b), float(evaluation.fuzzy_vector_c))
                    distance = float(calculate_fuzzy_distance(user_vector, mean_vector))
                    total_distance += distance
                    total_evaluations += 1
                    criteria_total_distance += distance
                    criteria_total_evaluations += 1
            
            # Technologie-Kriterium-Bewertungen
            for technology in technologies:
                tech_criterion_evals = [e for e in all_current_evaluations if e.criterion_id == criterion.id and e.technology_id == technology.id]
                
                if tech_criterion_evals:
                    # Mittelwert der Fuzzy-Vektoren berechnen
                    mean_vector_a = float(np.mean([eval.fuzzy_vector_a for eval in tech_criterion_evals]))
                    mean_vector_b = float(np.mean([eval.fuzzy_vector_b for eval in tech_criterion_evals]))
                    mean_vector_c = float(np.mean([eval.fuzzy_vector_c for eval in tech_criterion_evals]))
                    mean_vector = (mean_vector_a, mean_vector_b, mean_vector_c)
                    
                    # Distanz jeder Bewertung zum Mittelwert berechnen
                    for evaluation in tech_criterion_evals:
                        user_vector = (float(evaluation.fuzzy_vector_a), float(evaluation.fuzzy_vector_b), float(evaluation.fuzzy_vector_c))
                        distance = float(calculate_fuzzy_distance(user_vector, mean_vector))
                        total_distance += distance
                        total_evaluations += 1
                        tech_total_distance += distance
                        tech_total_evaluations += 1
        
        # Durchschnittliche Distanz berechnen
        mean_distance_value = float(total_distance / total_evaluations) if total_evaluations > 0 else 0.0
        
        # Separate durchschnittliche Distanzen für Kriterien und Technologie-Matrix berechnen
        criteria_mean_distance_value = float(criteria_total_distance / criteria_total_evaluations) if criteria_total_evaluations > 0 else 0.0
        tech_mean_distance_value = float(tech_total_distance / tech_total_evaluations) if tech_total_evaluations > 0 else 0.0
        
        # Prüfen, ob die durchschnittlichen Distanzen im grünen Bereich sind
        mean_distance_ok = bool(mean_distance_value <= case.threshold_distance_mean)
        criteria_mean_distance_ok = bool(criteria_mean_distance_value <= case.threshold_distance_mean)
        tech_mean_distance_ok = bool(tech_mean_distance_value <= case.threshold_distance_mean)
        
        # Gesamtergebnis - Alle drei Kriterien berücksichtigen
        passed_analysis = mean_distance_ok and criteria_passed and tech_passed
        
        # Analyseergebnis speichern
        analysis = RoundAnalysis(
            case_id=case_id,
            round_number=current_round,
            criteria_ok_percent=criteria_ok_percent,
            criteria_total_count=criteria_total_count,
            criteria_ok_count=criteria_ok_count,
            criteria_passed=criteria_passed,
            tech_ok_percent=tech_ok_percent,
            tech_total_count=tech_total_count,
            tech_ok_count=tech_ok_count,
            tech_passed=tech_passed,
            mean_distance_ok=mean_distance_ok,
            mean_distance_value=mean_distance_value,
            criteria_mean_distance_value=criteria_mean_distance_value,
            criteria_mean_distance_ok=criteria_mean_distance_ok,
            tech_mean_distance_value=tech_mean_distance_value,
            tech_mean_distance_ok=tech_mean_distance_ok,
            passed_analysis=passed_analysis
        )
        db.session.add(analysis)
        
        # Wenn die Analyse nicht bestanden wurde, eine neue Runde erstellen
        if not passed_analysis:
            # Runde erhöhen
            case.current_round += 1
            new_round_number = case.current_round
            
            # Neue CaseRound erstellen
            new_round = CaseRound(
                case_id=case_id,
                round_number=new_round_number,
                is_completed=False
            )
            db.session.add(new_round)
        
        db.session.commit()
        
        # Ergebnis zurückgeben
        return jsonify({
            "case_id": case_id,
            "round_number": current_round,
            "criteria_ok_percent": criteria_ok_percent,
            "criteria_passed": criteria_passed,
            "tech_ok_percent": tech_ok_percent,
            "tech_passed": tech_passed,
            "mean_distance_ok": mean_distance_ok,
            "mean_distance_value": mean_distance_value,
            "criteria_mean_distance_value": criteria_mean_distance_value,
            "criteria_mean_distance_ok": criteria_mean_distance_ok,
            "tech_mean_distance_value": tech_mean_distance_value,
            "tech_mean_distance_ok": tech_mean_distance_ok,
            "passed_analysis": passed_analysis,
            "next_round": None if passed_analysis else case.current_round
        }), 200
    
    except Exception as e:
        print(f"Error in analyze_round: {str(e)}")
        db.session.rollback()
        return jsonify({"message": f"Error analyzing round: {str(e)}"}), 500

@cases_bp.route('/<int:case_id>/round-analysis', methods=['GET'])
def get_round_analysis(case_id):
    """
    Gibt die Analyseergebnisse für alle Runden eines Cases zurück.
    """
    try:
        # Case abrufen
        case = Case.query.get(case_id)
        if not case:
            return jsonify({"message": "Case not found"}), 404
        
        # Alle Analysen für diesen Case abrufen
        analyses = RoundAnalysis.query.filter_by(case_id=case_id).order_by(RoundAnalysis.round_number).all()
        
        # Ergebnis formatieren
        result = []
        for analysis in analyses:
            result.append({
                "id": analysis.id,
                "case_id": analysis.case_id,
                "round_number": analysis.round_number,
                "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
                "criteria_ok_percent": analysis.criteria_ok_percent,
                "criteria_total_count": analysis.criteria_total_count,
                "criteria_ok_count": analysis.criteria_ok_count,
                "criteria_passed": analysis.criteria_passed,
                "tech_ok_percent": analysis.tech_ok_percent,
                "tech_total_count": analysis.tech_total_count,
                "tech_ok_count": analysis.tech_ok_count,
                "tech_passed": analysis.tech_passed,
                "mean_distance_ok": analysis.mean_distance_ok,
                "mean_distance_value": analysis.mean_distance_value,
                "criteria_mean_distance_value": analysis.criteria_mean_distance_value,
                "criteria_mean_distance_ok": analysis.criteria_mean_distance_ok,
                "tech_mean_distance_value": analysis.tech_mean_distance_value,
                "tech_mean_distance_ok": analysis.tech_mean_distance_ok,
                "passed_analysis": analysis.passed_analysis
            })
        
        return jsonify(result), 200
    
    except Exception as e:
        print(f"Error in get_round_analysis: {str(e)}")
        return jsonify({"message": f"Error fetching round analysis: {str(e)}"}), 500

@cases_bp.route('/<int:case_id>/reevaluations/<int:user_id>', methods=['GET'])
def get_user_reevaluations(case_id, user_id):
    """
    Gibt alle Bewertungen zurück, die ein Benutzer in der nächsten Runde neu bewerten muss.
    """
    try:
        # Case abrufen
        case = Case.query.get(case_id)
        if not case:
            return jsonify({"message": "Case not found"}), 404
        
        # Aktuelle Runde bestimmen
        current_round = case.current_round
        
        # Bewertungen aus der vorherigen Runde abrufen, die neu bewertet werden müssen
        previous_round = current_round - 1
        reevaluations = Evaluation.query.filter_by(
            case_id=case_id,
            user_id=user_id,
            round=previous_round,
            needs_reevaluation=True
        ).all()
        
        # Bewertungen in JSON umwandeln
        result = []
        for eval in reevaluations:
            result.append({
                "id": eval.id,
                "case_id": eval.case_id,
                "round": eval.round,
                "user_id": eval.user_id,
                "criterion_id": eval.criterion_id,
                "technology_id": eval.technology_id,
                "score": eval.score,
                "fuzzy_vector_a": float(eval.fuzzy_vector_a) if eval.fuzzy_vector_a is not None else None,
                "fuzzy_vector_b": float(eval.fuzzy_vector_b) if eval.fuzzy_vector_b is not None else None,
                "fuzzy_vector_c": float(eval.fuzzy_vector_c) if eval.fuzzy_vector_c is not None else None,
                "needs_reevaluation": eval.needs_reevaluation
            })
        
        return jsonify(result), 200
    
    except Exception as e:
        print(f"Error in get_user_reevaluations: {str(e)}")
        return jsonify({"message": f"Error fetching reevaluations: {str(e)}"}), 500

@cases_bp.route('/<int:case_id>/update-thresholds', methods=['PUT'])
def update_thresholds(case_id):
    """
    Aktualisiert die Grenzwerte für die Rundenanalyse eines Cases.
    """
    try:
        # Case abrufen
        case = Case.query.get(case_id)
        if not case:
            return jsonify({"message": "Case not found"}), 404
        
        data = request.get_json()
        
        # Grenzwerte aktualisieren, falls vorhanden
        if 'threshold_distance_mean' in data:
            case.threshold_distance_mean = data['threshold_distance_mean']
        
        if 'threshold_criteria_percent' in data:
            case.threshold_criteria_percent = data['threshold_criteria_percent']
        
        if 'threshold_tech_percent' in data:
            case.threshold_tech_percent = data['threshold_tech_percent']
        
        db.session.commit()
        
        return jsonify({
            "id": case.id,
            "threshold_distance_mean": case.threshold_distance_mean,
            "threshold_criteria_percent": case.threshold_criteria_percent,
            "threshold_tech_percent": case.threshold_tech_percent
        }), 200
    
    except Exception as e:
        print(f"Error in update_thresholds: {str(e)}")
        db.session.rollback()
        return jsonify({"message": f"Error updating thresholds: {str(e)}"}), 500

@cases_bp.route('/<int:case_id>/reevaluations/<int:user_id>', methods=['GET'])
def get_reevaluations(case_id, user_id):
    """
    Gibt die Bewertungen zurück, die in der aktuellen Runde neu bewertet werden müssen.
    """
    try:
        # Case abrufen
        case = Case.query.get(case_id)
        if not case:
            return jsonify({"message": "Case not found"}), 404
        
        # Aktuelle Runde bestimmen
        current_round = case.current_round
        
        # Wenn wir in Runde 1 sind, gibt es keine Neubewertungen
        if current_round <= 1:
            return jsonify([]), 200
        
        # Bewertungen aus der vorherigen Runde abrufen, die neu bewertet werden müssen
        previous_round = current_round - 1
        reevaluations = Evaluation.query.filter_by(
            case_id=case_id,
            user_id=user_id,
            round=previous_round,
            needs_reevaluation=True
        ).all()
        
        # Bewertungen in JSON umwandeln
        result = []
        for eval in reevaluations:
            result.append({
                "id": eval.id,
                "case_id": eval.case_id,
                "user_id": eval.user_id,
                "criterion_id": eval.criterion_id,
                "technology_id": eval.technology_id,
                "round": eval.round,
                "score": eval.score,
                "fuzzy_vector_a": float(eval.fuzzy_vector_a) if eval.fuzzy_vector_a is not None else None,
                "fuzzy_vector_b": float(eval.fuzzy_vector_b) if eval.fuzzy_vector_b is not None else None,
                "fuzzy_vector_c": float(eval.fuzzy_vector_c) if eval.fuzzy_vector_c is not None else None,
                "needs_reevaluation": eval.needs_reevaluation
            })
        
        return jsonify(result), 200
    except Exception as e:
        print(f"Error in get_reevaluations: {str(e)}")
        return jsonify({"message": f"Error fetching reevaluations: {str(e)}"}), 500
