-- Erstelle Schema (falls noch nicht vorhanden)
CREATE SCHEMA IF NOT EXISTS public;

-- ✅ Bestehende Tabellen in der korrekten Reihenfolge löschen
DROP TABLE IF EXISTS token_blacklist;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS case_rounds;
DROP TABLE IF EXISTS cases;
DROP TABLE IF EXISTS technologies;
DROP TABLE IF EXISTS criteria;
DROP TABLE IF EXISTS project_users;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

-- Erstelle die users-Tabelle
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,  -- Länge an models.py angepasst
    password_hash TEXT NOT NULL,
    role VARCHAR(10) CHECK (role IN ('master', 'user')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Erstelle die projects-Tabelle
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    master_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Erstelle die project_users-Tabelle (Many-to-Many-Beziehung)
CREATE TABLE project_users (
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

-- Erstelle die criteria-Tabelle
CREATE TABLE criteria (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

-- Erstelle die technologies-Tabelle
CREATE TABLE technologies (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

-- Erstelle die cases-Tabelle
CREATE TABLE cases (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    case_type VARCHAR(10) CHECK (case_type IN ('internal', 'external')) NOT NULL,
    show_results BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Erstelle die case_rounds-Tabelle
CREATE TABLE case_rounds (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE
);

-- Erstelle die evaluations-Tabelle
CREATE TABLE evaluations (
    id SERIAL PRIMARY KEY,
    case_round_id INT REFERENCES case_rounds(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    criterion_id INT REFERENCES criteria(id) ON DELETE CASCADE,
    technology_id INT REFERENCES technologies(id) ON DELETE CASCADE,
    score DECIMAL(5,2) CHECK (score BETWEEN 0 AND 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ Erstelle die token_blacklist-Tabelle
CREATE TABLE token_blacklist (
    id SERIAL PRIMARY KEY,
    jti VARCHAR(36) NOT NULL UNIQUE,
    token_type VARCHAR(10) NOT NULL CHECK (token_type IN ('access', 'refresh')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
