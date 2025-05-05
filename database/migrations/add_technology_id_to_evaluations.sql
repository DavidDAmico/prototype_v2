-- Add technology_id column to evaluations table
ALTER TABLE evaluations 
ADD COLUMN technology_id INTEGER REFERENCES technologies(id) ON DELETE CASCADE;

-- Add index for technology_id
CREATE INDEX evaluations_technology_id_idx ON evaluations(technology_id);
