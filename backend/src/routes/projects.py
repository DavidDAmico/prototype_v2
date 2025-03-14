from flask import Blueprint, request, jsonify
from src.models import db, Project, ProjectUser

projects_bp = Blueprint('projects', __name__)

@projects_bp.route('/', methods=['GET'])
def get_projects():
    projects = Project.query.all()
    return jsonify([{"id": p.id, "name": p.name, "description": p.description} for p in projects]), 200

@projects_bp.route('/create', methods=['POST'])
def create_project():
    data = request.get_json()
    new_project = Project(name=data['name'], description=data.get('description'), master_id=data['master_id'])
    db.session.add(new_project)
    db.session.commit()
    return jsonify({"message": "Project created", "id": new_project.id}), 201

@projects_bp.route('/<int:project_id>/add_user', methods=['POST'])
def add_user_to_project(project_id):
    data = request.get_json()
    new_entry = ProjectUser(project_id=project_id, user_id=data['user_id'])
    db.session.add(new_entry)
    db.session.commit()
    return jsonify({"message": "User added to project"}), 201
