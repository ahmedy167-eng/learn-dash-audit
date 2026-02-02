-- Enable realtime for ca_projects table so students receive live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.ca_projects;