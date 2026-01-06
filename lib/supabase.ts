import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://egtttatimmnyxoivqcoi.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVndHR0YXRpbW1ueXhvaXZxY29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5OTQ4NjEsImV4cCI6MjA3MjU3MDg2MX0.JleNsgQr4LfSikOqnQKRnPlBCzg2zlEiPPbLSDG9xmE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
