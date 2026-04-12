CREATE TABLE public.references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_type TEXT NOT NULL,
  company TEXT NOT NULL,
  client TEXT NOT NULL,
  client_short TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_short TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  activity TEXT NOT NULL,
  year TEXT NOT NULL,
  month TEXT NOT NULL,
  sequence TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT '00',
  reference TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to references"
ON public.references
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);