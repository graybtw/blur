const SUPABASE_URL = "https://svvgovbyzirdsjdcznyn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2dmdvdmJ5emlyZHNqZGN6bnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NTM0NTIsImV4cCI6MjEwMDMyOTQ1Mn0.a6pVVVEhcAZT1NEziDHBE1L5N5svq7OhP_ofhcFishU";

window.sb = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log("SB CREATED", window.sb);