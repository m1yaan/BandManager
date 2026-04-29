import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Band = {
  id: string;
  name: string;
  foundation_year: number | null;
  country: string;
  rating: number | null;
  created_by: string;
  created_at: string;
};

export type Singer = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type Song = {
  id: string;
  title: string;
  composer: string;
  lyricist: string;
  creation_year: number | null;
  created_by: string;
  created_at: string;
};

export type Tour = {
  id: string;
  program_name: string;
  city: string;
  start_date: string | null;
  end_date: string | null;
  avg_ticket_price: number;
  band_id: string;
  created_by: string;
  created_at: string;
};
