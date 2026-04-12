
-- Create sequence for employee references
CREATE SEQUENCE IF NOT EXISTS public.employee_ref_seq START 1;

-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- Auto-generate reference numbers
CREATE OR REPLACE FUNCTION public.generate_employee_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := 'EMP-' || LPAD(nextval('public.employee_ref_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_employee_reference
  BEFORE INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.generate_employee_reference();

-- Auto-update updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Junction: employees <-> projects
CREATE TABLE public.employee_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, project_id)
);

ALTER TABLE public.employee_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to employee_projects" ON public.employee_projects FOR ALL USING (true) WITH CHECK (true);

-- Junction: tasks <-> employees (many-to-many)
CREATE TABLE public.task_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, employee_id)
);

ALTER TABLE public.task_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to task_employees" ON public.task_employees FOR ALL USING (true) WITH CHECK (true);

-- Activity logging for employees
CREATE OR REPLACE FUNCTION public.log_employee_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, new_values)
    VALUES ('employee', NEW.id, NEW.name, 'created', 'Employee "' || NEW.name || '" was created', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, old_values, new_values)
    VALUES ('employee', NEW.id, NEW.name, 'updated', 'Employee "' || NEW.name || '" was updated', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, entity_name, action, description, old_values)
    VALUES ('employee', OLD.id, OLD.name, 'deleted', 'Employee "' || OLD.name || '" was deleted', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER log_employee_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.log_employee_changes();
