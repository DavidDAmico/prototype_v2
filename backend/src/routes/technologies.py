from flask import Blueprint, request, jsonify
from src.models import db, Technology, Project

technologies_bp = Blueprint('technologies', __name__)

@technologies_bp.route('/', methods=['GET'])
def get_all_technologies():
    project_id = request.args.get('project_id')
    if project_id:
        technologies = Technology.query.filter_by(project_id=project_id).all()
    else:
        technologies = Technology.query.all()
    return jsonify([{
        "id": t.id,
        "project_id": t.project_id,
        "name": t.name
    } for t in technologies]), 200

@technologies_bp.route('/create', methods=['POST'])
def create_technology():
    data = request.get_json()
    
    if not data.get('project_id') or not data.get('name'):
        return jsonify({"message": "project_id and name are required"}), 400
        
    project = Project.query.get(data['project_id'])
    if not project:
        return jsonify({"message": "Project not found"}), 404
        
    new_technology = Technology(
        project_id=data['project_id'],
        name=data['name']
    )
    db.session.add(new_technology)
    db.session.commit()
    
    return jsonify({
        "message": "Technology created",
        "id": new_technology.id,
        "project_id": new_technology.project_id,
        "name": new_technology.name
    }), 201

@technologies_bp.route('/<int:technology_id>', methods=['PUT'])
def update_technology(technology_id):
    technology = Technology.query.get(technology_id)
    if not technology:
        return jsonify({"message": "Technology not found"}), 404
        
    data = request.get_json()
    if 'name' in data:
        technology.name = data['name']
    
    db.session.commit()
    return jsonify({
        "message": "Technology updated",
        "id": technology.id,
        "project_id": technology.project_id,
        "name": technology.name
    }), 200

@technologies_bp.route('/<int:technology_id>', methods=['DELETE'])
def delete_technology(technology_id):
    technology = Technology.query.get(technology_id)
    if not technology:
        return jsonify({"message": "Technology not found"}), 404
        
    db.session.delete(technology)
    db.session.commit()
    return jsonify({"message": "Technology deleted"}), 200
