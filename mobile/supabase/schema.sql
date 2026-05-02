create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text,
  raw_text text,
  total_amount numeric(12, 2),
  date date,
  merchant text,
  category text,
  confidence numeric(5, 2),
  created_at timestamptz not null default now()
);

alter table public.receipts
add column if not exists category text;

alter table public.receipts
add column if not exists confidence numeric(5, 2);

alter table public.receipts enable row level security;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

insert into public.categories (name, icon)
values
  ('Market', 'shopping-basket'),
  ('Food', 'utensils'),
  ('Transport', 'car'),
  ('Bills', 'receipt-text'),
  ('Health', 'heart-pulse'),
  ('Other', 'circle-help')
on conflict (name) do update set icon = excluded.icon;

drop policy if exists "Users can read their own receipts" on public.receipts;
create policy "Users can read their own receipts"
on public.receipts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own receipts" on public.receipts;
create policy "Users can insert their own receipts"
on public.receipts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own receipts" on public.receipts;
create policy "Users can update their own receipts"
on public.receipts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own receipts" on public.receipts;
create policy "Users can delete their own receipts"
on public.receipts
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read categories" on public.categories;
create policy "Authenticated users can read categories"
on public.categories
for select
to authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('receipt-images', 'receipt-images', true)
on conflict (id) do nothing;

drop policy if exists "Users can read receipt images" on storage.objects;
create policy "Users can read receipt images"
on storage.objects
for select
to authenticated
using (bucket_id = 'receipt-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload receipt images" on storage.objects;
create policy "Users can upload receipt images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'receipt-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update receipt images" on storage.objects;
create policy "Users can update receipt images"
on storage.objects
for update
to authenticated
using (bucket_id = 'receipt-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'receipt-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete receipt images" on storage.objects;
create policy "Users can delete receipt images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'receipt-images' and (storage.foldername(name))[1] = auth.uid()::text);
