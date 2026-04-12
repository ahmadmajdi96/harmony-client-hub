
-- Create activity_log table
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  action TEXT NOT NULL,
  description TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Allow all access (no auth yet)
CREATE POLICY "Allow all access to activity_log"
  ON public.activity_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster querying
CREATE INDEX idx_activity_log_entity ON public.activity_log (entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON public.activity_log (created_at DESC);

-- Trigger function for projects
CREATE OR REPLACE FUNCTION public.log_project_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, new_values)
    VALUES ('project', NEW.id, NEW.name, 'created', 'Project "' || NEW.name || '" was created', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, old_values, new_values)
    VALUES ('project', NEW.id, NEW.name, 'updated', 'Project "' || NEW.name || '" was updated', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, old_values)
    VALUES ('project', OLD.id, OLD.name, 'deleted', 'Project "' || OLD.name || '" was deleted', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function for clients
CREATE OR REPLACE FUNCTION public.log_client_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, new_values)
    VALUES ('client', NEW.id, NEW.name, 'created', 'Client "' || NEW.name || '" was created', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, old_values, new_values)
    VALUES ('client', NEW.id, NEW.name, 'updated', 'Client "' || NEW.name || '" was updated', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, old_values)
    VALUES ('client', OLD.id, OLD.name, 'deleted', 'Client "' || OLD.name || '" was deleted', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function for suppliers
CREATE OR REPLACE FUNCTION public.log_supplier_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, new_values)
    VALUES ('supplier', NEW.id, NEW.name, 'created', 'Supplier "' || NEW.name || '" was created', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, old_values, new_values)
    VALUES ('supplier', NEW.id, NEW.name, 'updated', 'Supplier "' || NEW.name || '" was updated', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, old_values)
    VALUES ('supplier', OLD.id, OLD.name, 'deleted', 'Supplier "' || OLD.name || '" was deleted', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function for tasks
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, new_values)
    VALUES ('task', NEW.id, NEW.title, 'created', 'Task "' || NEW.title || '" was created', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, old_values, new_values)
    VALUES ('task', NEW.id, NEW.title, 'updated', 'Task "' || NEW.title || '" was updated', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, old_values)
    VALUES ('task', OLD.id, OLD.title, 'deleted', 'Task "' || OLD.title || '" was deleted', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function for files
CREATE OR REPLACE FUNCTION public.log_file_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, new_values)
    VALUES ('file', NEW.id, NEW.file_name, 'created', 'File "' || NEW.file_name || '" was uploaded', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, old_values)
    VALUES ('file', OLD.id, OLD.file_name, 'deleted', 'File "' || OLD.file_name || '" was deleted', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach triggers
CREATE TRIGGER log_project_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_project_changes();

CREATE TRIGGER log_client_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_client_changes();

CREATE TRIGGER log_supplier_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.log_supplier_changes();

CREATE TRIGGER log_task_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_changes();

CREATE TRIGGER log_file_changes_trigger
  AFTER INSERT OR DELETE ON public.project_files
  FOR EACH ROW EXECUTE FUNCTION public.log_file_changes();
