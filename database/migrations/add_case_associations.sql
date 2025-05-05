-- Create case_criteria table
CREATE TABLE case_criteria (
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
    criterion_id INTEGER REFERENCES criteria(id) ON DELETE CASCADE,
    PRIMARY KEY (case_id, criterion_id)
);

-- Create case_technologies table
CREATE TABLE case_technologies (
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
    technology_id INTEGER REFERENCES technologies(id) ON DELETE CASCADE,
    PRIMARY KEY (case_id, technology_id)
);
