# Supabase Setup

Day 1 needs a Supabase project with Auth enabled and the first database table.

1. Create a new Supabase project.
2. Enable Email/Password under Authentication > Providers.
3. Run `supabase/schema.sql` in the SQL editor.
4. Copy `mobile/.env.example` to `mobile/.env`.
5. Fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

The mobile app already has a Supabase client at `src/lib/supabase.ts`.
