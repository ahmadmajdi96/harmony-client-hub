
-- Add reference_number columns
ALTER TABLE public.clients ADD COLUMN reference_number TEXT UNIQUE;
ALTER TABLE public.projects ADD COLUMN reference_number TEXT UNIQUE;

-- Create sequences for reference numbers
CREATE SEQUENCE public.client_ref_seq START 1;
CREATE SEQUENCE public.project_ref_seq START 1;

-- Function to auto-generate client reference
CREATE OR REPLACE FUNCTION public.generate_client_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := 'CLT-' || LPAD(nextval('public.client_ref_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to auto-generate project reference
CREATE OR REPLACE FUNCTION public.generate_project_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := 'PRJ-' || LPAD(nextval('public.project_ref_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for auto-generating reference numbers
CREATE TRIGGER generate_client_ref BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.generate_client_reference();
CREATE TRIGGER generate_project_ref BEFORE INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.generate_project_reference();

-- Backfill existing rows
UPDATE public.clients SET reference_number = 'CLT-' || LPAD(nextval('public.client_ref_seq')::text, 4, '0') WHERE reference_number IS NULL;
UPDATE public.projects SET reference_number = 'PRJ-' || LPAD(nextval('public.project_ref_seq')::text, 4, '0') WHERE reference_number IS NULL;

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  contact_person TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence and trigger for supplier references
CREATE SEQUENCE public.supplier_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_supplier_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := 'SUP-' || LPAD(nextval('public.supplier_ref_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_supplier_ref BEFORE INSERT ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.generate_supplier_reference();

-- Create project_suppliers junction table
CREATE TABLE public.project_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  role TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, supplier_id)
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_suppliers ENABLE ROW LEVEL SECURITY;

-- Open access policies
CREATE POLICY "Allow all access to suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to project_suppliers" ON public.project_suppliers FOR ALL USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_project_suppliers_project_id ON public.project_suppliers(project_id);
CREATE INDEX idx_project_suppliers_supplier_id ON public.project_suppliers(supplier_id);
