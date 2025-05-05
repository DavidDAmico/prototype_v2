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
    custom_fields = db.Column(db.JSON, nullable=True)  # Für zusätzliche Informationen

    # Beziehung zu Projekten
    projects = db.relationship("Project", back_populates="master")
    
    # Beziehungen zu Cases (über case_users)
    cases = db.relationship('Case', secondary='case_users', back_populates='users')

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
    project_id = db.Column(db.Integer, nullable=True)  # Behalten für Abwärtskompatibilität, aber nicht mehr als ForeignKey
    name = db.Column(db.String(255))
    rating = db.Column(db.Integer)  # Likert-Skala 1-5
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Beziehungen
    cases = db.relationship('Case', secondary='case_criteria', back_populates='criteria')
    evaluations = db.relationship('Evaluation', back_populates='criterion')

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'name': self.name,
            'rating': self.rating,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Technology(db.Model):
    __tablename__ = 'technologies'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, nullable=True)  # Behalten für Abwärtskompatibilität, aber nicht mehr als ForeignKey
    name = db.Column(db.String(100), nullable=False)

class Case(db.Model):
    __tablename__ = 'cases'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, nullable=True)  # Behalten für Abwärtskompatibilität, aber nicht mehr als ForeignKey
    case_type = db.Column(db.String(10), nullable=False)  # 'internal' oder 'external'
    show_results = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    assigned_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    name = db.Column(db.String(100), nullable=True)  # Name des Cases
    # Grenzwerte für die Rundenanalyse
    threshold_distance_mean = db.Column(db.Float, default=0.166667)  # Standardwert 1/6
    threshold_criteria_percent = db.Column(db.Float, default=75.0)  # Standardwert 75%
    threshold_tech_percent = db.Column(db.Float, default=75.0)  # Standardwert 75%
    current_round = db.Column(db.Integer, default=1)  # Aktuelle Runde des Cases

    # Beziehung zu CaseRounds
    rounds = db.relationship("CaseRound", back_populates="case")
    
    # Beziehungen zu Kriterien und Technologien
    criteria = db.relationship('Criterion', secondary='case_criteria', back_populates='cases')
    technologies = db.relationship('Technology', secondary='case_technologies')
    users = db.relationship('User', secondary='case_users', back_populates='cases')
    
    # Beziehung zum zugewiesenen Benutzer
    assigned_user = db.relationship("User", foreign_keys=[assigned_user_id])

    # Beziehung zu RoundAnalysis
    analysis = db.relationship("RoundAnalysis", backref="case_ref")

# Association tables for case-specific relationships
case_criteria = db.Table('case_criteria',
    db.Column('case_id', db.Integer, db.ForeignKey('cases.id'), primary_key=True),
    db.Column('criterion_id', db.Integer, db.ForeignKey('criteria.id'), primary_key=True)
)

case_technologies = db.Table('case_technologies',
    db.Column('case_id', db.Integer, db.ForeignKey('cases.id'), primary_key=True),
    db.Column('technology_id', db.Integer, db.ForeignKey('technologies.id'), primary_key=True)
)

# Neue Tabelle für die direkte Zuordnung von Benutzern zu Cases
case_users = db.Table('case_users',
    db.Column('case_id', db.Integer, db.ForeignKey('cases.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True)
)

class CaseRound(db.Model):
    __tablename__ = 'case_rounds'
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.id'), nullable=False)
    round_number = db.Column(db.Integer, nullable=False)
    is_completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    # Beziehung zum Case
    case = db.relationship("Case", back_populates="rounds")

class Evaluation(db.Model):
    __tablename__ = 'evaluations'
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.id'), nullable=False)
    round = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    criterion_id = db.Column(db.Integer, db.ForeignKey('criteria.id'), nullable=False)
    technology_id = db.Column(db.Integer, db.ForeignKey('technologies.id'), nullable=True)  # Nullable for regular criterion evaluations
    score = db.Column(db.Numeric(5,2), nullable=False)  # Bewertung zwischen 0 und 10
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    needs_reevaluation = db.Column(db.Boolean, default=False)  # Flag für Neubewertung in der nächsten Runde
    
    # Fuzzy-Vektor für die Berechnung des "Distance to Mean"
    fuzzy_vector_a = db.Column(db.Float, default=0.0)  # a-Wert des Fuzzy-Vektors
    fuzzy_vector_b = db.Column(db.Float, default=0.0)  # b-Wert des Fuzzy-Vektors
    fuzzy_vector_c = db.Column(db.Float, default=0.0)  # c-Wert des Fuzzy-Vektors

    # Beziehung zum Kriterium
    criterion = db.relationship("Criterion", back_populates="evaluations")

class RoundAnalysis(db.Model):
    """Analyseergebnis einer Runde."""
    __tablename__ = 'round_analysis'

    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.id'), nullable=False)
    round_number = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Prozentsätze und Anzahlen
    criteria_ok_percent = db.Column(db.Float, nullable=False)
    criteria_total_count = db.Column(db.Integer, nullable=False)
    criteria_ok_count = db.Column(db.Integer, nullable=False)
    criteria_passed = db.Column(db.Boolean, nullable=False, default=False)
    
    tech_ok_percent = db.Column(db.Float, nullable=False)
    tech_total_count = db.Column(db.Integer, nullable=False)
    tech_ok_count = db.Column(db.Integer, nullable=False)
    tech_passed = db.Column(db.Boolean, nullable=False, default=False)
    
    # Distanz zum Mittelwert
    mean_distance_ok = db.Column(db.Boolean, nullable=False)
    mean_distance_value = db.Column(db.Float, nullable=False)
    
    # Separate Distanzwerte für Kriterien und Technologie-Matrix
    criteria_mean_distance_value = db.Column(db.Float, nullable=True)
    criteria_mean_distance_ok = db.Column(db.Boolean, nullable=True)
    
    tech_mean_distance_value = db.Column(db.Float, nullable=True)
    tech_mean_distance_ok = db.Column(db.Boolean, nullable=True)
    
    # Gesamtergebnis
    passed_analysis = db.Column(db.Boolean, nullable=False)

    def __repr__(self):
        return f"<RoundAnalysis Case {self.case_id} Round {self.round_number}>"

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
