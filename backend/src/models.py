from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)  # Eindeutige Email
    password_hash = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(10), nullable=False)  # 'master' oder 'user'
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    # Beziehung zu Projekten
    projects = db.relationship("Project", back_populates="master")

    def __repr__(self):
        return f"<User {self.username}>"

class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    master_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    # Beziehung zum Master-User
    master = db.relationship("User", back_populates="projects")

class ProjectUser(db.Model):
    __tablename__ = 'project_users'
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)

class Criterion(db.Model):
    __tablename__ = 'criteria'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)

class Technology(db.Model):
    __tablename__ = 'technologies'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)

class Case(db.Model):
    __tablename__ = 'cases'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    case_type = db.Column(db.String(10), nullable=False)  # 'internal' oder 'external'
    show_results = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    # Beziehung zu CaseRounds
    rounds = db.relationship("CaseRound", back_populates="case")
    
    # Beziehungen zu Kriterien und Technologien
    criteria = db.relationship('Criterion', secondary='case_criteria')
    technologies = db.relationship('Technology', secondary='case_technologies')

# Association tables for case-specific relationships
case_criteria = db.Table('case_criteria',
    db.Column('case_id', db.Integer, db.ForeignKey('cases.id'), primary_key=True),
    db.Column('criterion_id', db.Integer, db.ForeignKey('criteria.id'), primary_key=True)
)

case_technologies = db.Table('case_technologies',
    db.Column('case_id', db.Integer, db.ForeignKey('cases.id'), primary_key=True),
    db.Column('technology_id', db.Integer, db.ForeignKey('technologies.id'), primary_key=True)
)

class CaseRound(db.Model):
    __tablename__ = 'case_rounds'
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.id'), nullable=False)
    round_number = db.Column(db.Integer, nullable=False)
    is_completed = db.Column(db.Boolean, default=False)

    # Beziehung zum Case
    case = db.relationship("Case", back_populates="rounds")

class Evaluation(db.Model):
    __tablename__ = 'evaluations'
    id = db.Column(db.Integer, primary_key=True)
    case_round_id = db.Column(db.Integer, db.ForeignKey('case_rounds.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    criterion_id = db.Column(db.Integer, db.ForeignKey('criteria.id'), nullable=False)
    technology_id = db.Column(db.Integer, db.ForeignKey('technologies.id'), nullable=True)  # Nullable for regular criterion evaluations
    score = db.Column(db.Numeric(5,2), nullable=False)  # Bewertung zwischen 0 und 10
    created_at = db.Column(db.DateTime, server_default=db.func.now())

# Neue Tabelle für die Token-Blacklist (persistente Speicherung)
class TokenBlacklist(db.Model):
    __tablename__ = 'token_blacklist'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), unique=True, nullable=False)  # JWT Identifier
    token_type = db.Column(db.String(10), nullable=False)  # "access" oder "refresh"
    created_at = db.Column(db.DateTime, default=db.func.now(), nullable=False)

    def __init__(self, jti, token_type):
        self.jti = jti
        self.token_type = token_type

    def __repr__(self):
        return f"<TokenBlacklist {self.jti}>"
