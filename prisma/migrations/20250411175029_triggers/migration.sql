CREATE OR REPLACE FUNCTION validate_parent_patient_role()
RETURNS TRIGGER AS $$
DECLARE
  parent_record_type TEXT;
  patient_record_type TEXT;
BEGIN
  SELECT "recordType" INTO parent_record_type FROM "User" WHERE id = NEW."parentId";
  SELECT "recordType" INTO patient_record_type FROM "User" WHERE id = NEW."patientId";

  IF parent_record_type IS NULL OR patient_record_type IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado para um dos IDs.';
  END IF;

  IF parent_record_type != 'PARENT' THEN
    RAISE EXCEPTION 'O usuário com id % não é um PARENT.', NEW."parentId";
  END IF;

  IF patient_record_type != 'PATIENT' THEN
    RAISE EXCEPTION 'O usuário com id % não é um PATIENT.', NEW."patientId";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_parent_patient_roles
BEFORE INSERT OR UPDATE ON "ParentPatientRelationship"
FOR EACH ROW
EXECUTE FUNCTION validate_parent_patient_role();