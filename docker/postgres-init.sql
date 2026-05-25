-- Local dev: create the verdepradera schema so migrations written for production
-- (Supabase/Render) also work against the Docker postgres container.
CREATE SCHEMA IF NOT EXISTS verdepradera;
