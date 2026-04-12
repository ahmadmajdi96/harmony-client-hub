
CREATE TABLE public.project_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  role TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, client_id)
);

ALTER TABLE public.project_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to project_clients"
ON public.project_clients
FOR ALL
USING (true)
WITH CHECK (true);

-- Migrate existing project-client relationships
INSERT INTO public.project_clients (project_id, client_id, role)
SELECT id, client_id, 'primary'
FROM public.projects
WHERE client_id IS NOT NULL;
