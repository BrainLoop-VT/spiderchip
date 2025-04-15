#!/bin/bash

TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_DIR="prisma/migrations/${TIMESTAMP}_update_level_attributes"

mkdir -p "$MIGRATION_DIR"

cat > "$MIGRATION_DIR/migration.sql" << 'EOL'
-- Update levels table to add comments describing the input_data structure
COMMENT ON COLUMN "public"."levels"."input_data" IS 'JSON structure containing:
- slot_count: number (number of variable slots available)
- slot_names: string[] (names of the variable slots)
- objects: Array<{name: string, type: string}> (available objects)
- test_cases: Array<{
    input: number[],
    expected_output: number[],
    description: string
  }> (test cases for validation)
- solution_code: string (reference solution)
- target_line_count: number (expected solution length)
- bonus_solution_code?: string (optional optimized solution)
- bonus_line_count?: number (optional optimized length target)
- hints: string[] (array of hint messages)
- Pre-description: string (description of the problem before the input data)

-- Create a trigger to validate input_data structure
CREATE OR REPLACE FUNCTION validate_level_input_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate required fields
  IF NOT (
    NEW.input_data ? 'slot_count' AND
    NEW.input_data ? 'slot_names' AND
    NEW.input_data ? 'test_cases' AND
    NEW.input_data ? 'solution_code' AND
    NEW.input_data ? 'target_line_count' AND
    NEW.input_data ? 'hints'
  ) THEN
    RAISE EXCEPTION 'input_data must contain all required fields';
  END IF;

  -- Validate types
  IF NOT (
    jsonb_typeof(NEW.input_data->'slot_count') = 'number' AND
    jsonb_typeof(NEW.input_data->'slot_names') = 'array' AND
    jsonb_typeof(NEW.input_data->'test_cases') = 'array' AND
    jsonb_typeof(NEW.input_data->'solution_code') = 'string' AND
    jsonb_typeof(NEW.input_data->'target_line_count') = 'number' AND
    jsonb_typeof(NEW.input_data->'hints') = 'array'
  ) THEN
    RAISE EXCEPTION 'input_data fields must be of correct type';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_level_input_data_trigger
  BEFORE INSERT OR UPDATE ON "public"."levels"
  FOR EACH ROW
  EXECUTE FUNCTION validate_level_input_data();
EOL

cat > "$MIGRATION_DIR/migration.meta.json" << EOL
{
  "version": "5",
  "dialect": "postgresql",
  "id": "${TIMESTAMP}_update_level_attributes",
  "checksum": "$(sha1sum "$MIGRATION_DIR/migration.sql" | awk '{print $1}')",
  "operations": [],
  "length": 1
}
EOL

echo "Created level attributes migration in $MIGRATION_DIR"
echo "Now run: npx prisma migrate resolve --applied ${TIMESTAMP}_update_level_attributes"