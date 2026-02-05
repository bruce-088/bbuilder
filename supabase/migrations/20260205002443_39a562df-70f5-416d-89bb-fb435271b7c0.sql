-- Create lead_contacts table
CREATE TABLE public.lead_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_idea_id UUID REFERENCES public.business_ideas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  stage TEXT NOT NULL DEFAULT 'captured',
  source TEXT NOT NULL DEFAULT 'manual',
  estimated_value NUMERIC DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_contact_at TIMESTAMP WITH TIME ZONE
);

-- Create lead_activities table
CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL REFERENCES public.lead_contacts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_contacts
CREATE POLICY "Users can view their own leads"
ON public.lead_contacts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own leads"
ON public.lead_contacts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads"
ON public.lead_contacts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leads"
ON public.lead_contacts FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for lead_activities
CREATE POLICY "Users can view their own lead activities"
ON public.lead_activities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lead activities"
ON public.lead_activities FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lead activities"
ON public.lead_activities FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lead activities"
ON public.lead_activities FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at on lead_contacts
CREATE TRIGGER update_lead_contacts_updated_at
BEFORE UPDATE ON public.lead_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;

-- Add indexes for common queries
CREATE INDEX idx_lead_contacts_user_id ON public.lead_contacts(user_id);
CREATE INDEX idx_lead_contacts_stage ON public.lead_contacts(stage);
CREATE INDEX idx_lead_contacts_source ON public.lead_contacts(source);
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_user_id ON public.lead_activities(user_id);