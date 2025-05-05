-- Initialize Schema
CREATE SCHEMA IF NOT EXISTS public;

-- Drop existing tables in correct order
DROP TABLE IF EXISTS token_blacklist;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS case_criteria;
DROP TABLE IF EXISTS case_technologies;
DROP TABLE IF EXISTS case_rounds;
DROP TABLE IF EXISTS cases;
DROP TABLE IF EXISTS technologies;
DROP TABLE IF EXISTS criteria;
DROP TABLE IF EXISTS project_users;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) CHECK (role IN ('master', 'user')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    master_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create project_users table (Many-to-Many relationship)
CREATE TABLE project_users (
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

-- Create criteria table
CREATE TABLE criteria (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

-- Create technologies table
CREATE TABLE technologies (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

-- Create cases table
CREATE TABLE cases (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    case_type VARCHAR(10) CHECK (case_type IN ('internal', 'external')) NOT NULL,
    show_results BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create case_criteria table (Many-to-Many relationship)
CREATE TABLE case_criteria (
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
    criterion_id INTEGER REFERENCES criteria(id) ON DELETE CASCADE,
    PRIMARY KEY (case_id, criterion_id)
);

-- Create case_technologies table (Many-to-Many relationship)
CREATE TABLE case_technologies (
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
    technology_id INTEGER REFERENCES technologies(id) ON DELETE CASCADE,
    PRIMARY KEY (case_id, technology_id)
);

-- Create case_rounds table
CREATE TABLE case_rounds (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES cases(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE
);

-- Create evaluations table
CREATE TABLE evaluations (
    id SERIAL PRIMARY KEY,
    case_round_id INT REFERENCES case_rounds(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    criterion_id INT REFERENCES criteria(id) ON DELETE CASCADE,
    technology_id INT REFERENCES technologies(id) ON DELETE CASCADE,
    score DECIMAL(5,2) CHECK (score BETWEEN 0 AND 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create token_blacklist table
CREATE TABLE token_blacklist (
    id SERIAL PRIMARY KEY,
    jti VARCHAR(36) NOT NULL UNIQUE,
    token_type VARCHAR(10) NOT NULL CHECK (token_type IN ('access', 'refresh')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX evaluations_technology_id_idx ON evaluations(technology_id);
CREATE INDEX case_criteria_case_id_idx ON case_criteria(case_id);
CREATE INDEX case_criteria_criterion_id_idx ON case_criteria(criterion_id);
CREATE INDEX case_technologies_case_id_idx ON case_technologies(case_id);
CREATE INDEX case_technologies_technology_id_idx ON case_technologies(technology_id);
CREATE INDEX case_rounds_case_id_idx ON case_rounds(case_id);
CREATE INDEX evaluations_case_round_id_idx ON evaluations(case_round_id);
CREATE INDEX evaluations_user_id_idx ON evaluations(user_id);
CREATE INDEX evaluations_criterion_id_idx ON evaluations(criterion_id);
