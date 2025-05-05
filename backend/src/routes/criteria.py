from flask import Blueprint, request, jsonify
from src.models import db, Criterion, Project

criteria_bp = Blueprint('criteria', __name__)

@criteria_bp.route('/', methods=['GET'])
def get_all_criteria():
    project_id = request.args.get('project_id')
    if project_id:
        criteria = Criterion.query.filter_by(project_id=project_id).all()
    else:
        criteria = Criterion.query.all()
    return jsonify([{
        "id": c.id,
        "project_id": c.project_id,
        "name": c.name
    } for c in criteria]), 200

@criteria_bp.route('/create', methods=['POST'])
def create_criterion():
    data = request.get_json()
    
    if not data.get('project_id') or not data.get('name'):
        return jsonify({"message": "project_id and name are required"}), 400
        
    project = Project.query.get(data['project_id'])
    if not project:
        return jsonify({"message": "Project not found"}), 404
        
    new_criterion = Criterion(
        project_id=data['project_id'],
        name=data['name']
    )
    db.session.add(new_criterion)
    db.session.commit()
    
    return jsonify({
        "message": "Criterion created",
        "id": new_criterion.id,
        "project_id": new_criterion.project_id,
        "name": new_criterion.name
    }), 201

@criteria_bp.route('/<int:criterion_id>', methods=['PUT'])
def update_criterion(criterion_id):
    criterion = Criterion.query.get(criterion_id)
    if not criterion:
        return jsonify({"message": "Criterion not found"}), 404
        
    data = request.get_json()
    if 'name' in data:
        criterion.name = data['name']
    
    db.session.commit()
    return jsonify({
        "message": "Criterion updated",
        "id": criterion.id,
        "project_id": criterion.project_id,
        "name": criterion.name
    }), 200

@criteria_bp.route('/<int:criterion_id>', methods=['DELETE'])
def delete_criterion(criterion_id):
    criterion = Criterion.query.get(criterion_id)
    if not criterion:
        return jsonify({"message": "Criterion not found"}), 404
        
    db.session.delete(criterion)
    db.session.commit()
    return jsonify({"message": "Criterion deleted"}), 200
