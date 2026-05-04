create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text,
  raw_text text,
  total_amount numeric(12, 2),
  tax_amount numeric(12, 2),
  tax_rate numeric(5, 2),
  tax_breakdown jsonb not null default '[]'::jsonb,
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

alter table public.receipts
add column if not exists tax_amount numeric(12, 2);

alter table public.receipts
add column if not exists tax_rate numeric(5, 2);

alter table public.receipts
add column if not exists tax_breakdown jsonb not null default '[]'::jsonb;

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

create table if not exists public.monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null check (year >= 2000 and year <= 2100),
  month integer not null check (month >= 1 and month <= 12),
  total_amount numeric(12, 2) not null default 0,
  receipt_count integer not null default 0,
  category_totals jsonb not null default '{}'::jsonb,
  category_counts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, year, month)
);

create table if not exists public.yearly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null check (year >= 2000 and year <= 2100),
  total_amount numeric(12, 2) not null default 0,
  receipt_count integer not null default 0,
  category_totals jsonb not null default '{}'::jsonb,
  category_counts jsonb not null default '{}'::jsonb,
  monthly_totals jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, year)
);

alter table public.monthly_summaries
add column if not exists category_counts jsonb not null default '{}'::jsonb;

alter table public.yearly_summaries
add column if not exists category_counts jsonb not null default '{}'::jsonb;

alter table public.monthly_summaries enable row level security;
alter table public.yearly_summaries enable row level security;

drop policy if exists "Users can read their own monthly summaries" on public.monthly_summaries;
create policy "Users can read their own monthly summaries"
on public.monthly_summaries
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their own yearly summaries" on public.yearly_summaries;
create policy "Users can read their own yearly summaries"
on public.yearly_summaries
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.refresh_spending_summaries(
  p_user_id uuid,
  p_year integer,
  p_month integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_total numeric(12, 2);
  v_month_count integer;
  v_month_category_totals jsonb;
  v_month_category_counts jsonb;
  v_year_total numeric(12, 2);
  v_year_count integer;
  v_year_category_totals jsonb;
  v_year_category_counts jsonb;
  v_year_monthly_totals jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not allowed to refresh spending summaries for this user.';
  end if;

  select
    coalesce(sum(coalesce(total_amount, 0)), 0)::numeric(12, 2),
    count(*)::integer
  into v_month_total, v_month_count
  from public.receipts
  where user_id = p_user_id
    and extract(year from coalesce(date, created_at::date))::integer = p_year
    and extract(month from coalesce(date, created_at::date))::integer = p_month;

  select coalesce(jsonb_object_agg(category, total_amount), '{}'::jsonb)
  into v_month_category_totals
  from (
    select
      coalesce(category, 'Other') as category,
      sum(coalesce(total_amount, 0))::numeric(12, 2) as total_amount
    from public.receipts
    where user_id = p_user_id
      and extract(year from coalesce(date, created_at::date))::integer = p_year
      and extract(month from coalesce(date, created_at::date))::integer = p_month
    group by coalesce(category, 'Other')
  ) category_summary;

  select coalesce(jsonb_object_agg(category, receipt_count), '{}'::jsonb)
  into v_month_category_counts
  from (
    select
      coalesce(category, 'Other') as category,
      count(*)::integer as receipt_count
    from public.receipts
    where user_id = p_user_id
      and extract(year from coalesce(date, created_at::date))::integer = p_year
      and extract(month from coalesce(date, created_at::date))::integer = p_month
    group by coalesce(category, 'Other')
  ) category_summary;

  insert into public.monthly_summaries (
    user_id,
    year,
    month,
    total_amount,
    receipt_count,
    category_totals,
    category_counts,
    updated_at
  )
  values (
    p_user_id,
    p_year,
    p_month,
    v_month_total,
    v_month_count,
    v_month_category_totals,
    v_month_category_counts,
    now()
  )
  on conflict (user_id, year, month)
  do update set
    total_amount = excluded.total_amount,
    receipt_count = excluded.receipt_count,
    category_totals = excluded.category_totals,
    category_counts = excluded.category_counts,
    updated_at = now();

  select
    coalesce(sum(coalesce(total_amount, 0)), 0)::numeric(12, 2),
    count(*)::integer
  into v_year_total, v_year_count
  from public.receipts
  where user_id = p_user_id
    and extract(year from coalesce(date, created_at::date))::integer = p_year;

  select coalesce(jsonb_object_agg(category, total_amount), '{}'::jsonb)
  into v_year_category_totals
  from (
    select
      coalesce(category, 'Other') as category,
      sum(coalesce(total_amount, 0))::numeric(12, 2) as total_amount
    from public.receipts
    where user_id = p_user_id
      and extract(year from coalesce(date, created_at::date))::integer = p_year
    group by coalesce(category, 'Other')
  ) category_summary;

  select coalesce(jsonb_object_agg(category, receipt_count), '{}'::jsonb)
  into v_year_category_counts
  from (
    select
      coalesce(category, 'Other') as category,
      count(*)::integer as receipt_count
    from public.receipts
    where user_id = p_user_id
      and extract(year from coalesce(date, created_at::date))::integer = p_year
    group by coalesce(category, 'Other')
  ) category_summary;

  select coalesce(jsonb_object_agg(month, total_amount), '{}'::jsonb)
  into v_year_monthly_totals
  from (
    select
      extract(month from coalesce(date, created_at::date))::integer::text as month,
      sum(coalesce(total_amount, 0))::numeric(12, 2) as total_amount
    from public.receipts
    where user_id = p_user_id
      and extract(year from coalesce(date, created_at::date))::integer = p_year
    group by extract(month from coalesce(date, created_at::date))::integer
  ) month_summary;

  insert into public.yearly_summaries (
    user_id,
    year,
    total_amount,
    receipt_count,
    category_totals,
    category_counts,
    monthly_totals,
    updated_at
  )
  values (
    p_user_id,
    p_year,
    v_year_total,
    v_year_count,
    v_year_category_totals,
    v_year_category_counts,
    v_year_monthly_totals,
    now()
  )
  on conflict (user_id, year)
  do update set
    total_amount = excluded.total_amount,
    receipt_count = excluded.receipt_count,
    category_totals = excluded.category_totals,
    category_counts = excluded.category_counts,
    monthly_totals = excluded.monthly_totals,
    updated_at = now();
end;
$$;

grant execute on function public.refresh_spending_summaries(uuid, integer, integer) to authenticated;

insert into public.monthly_summaries (
  user_id,
  year,
  month,
  total_amount,
  receipt_count,
  category_totals,
  category_counts,
  updated_at
)
select
  month_base.user_id,
  month_base.year,
  month_base.month,
  month_base.total_amount,
  month_base.receipt_count,
  coalesce(category_base.category_totals, '{}'::jsonb),
  coalesce(category_count_base.category_counts, '{}'::jsonb),
  now()
from (
  select
    user_id,
    extract(year from coalesce(date, created_at::date))::integer as year,
    extract(month from coalesce(date, created_at::date))::integer as month,
    sum(coalesce(total_amount, 0))::numeric(12, 2) as total_amount,
    count(*)::integer as receipt_count
  from public.receipts
  group by user_id, year, month
) month_base
left join (
  select
    user_id,
    year,
    month,
    jsonb_object_agg(category, total_amount) as category_totals
  from (
    select
      user_id,
      extract(year from coalesce(date, created_at::date))::integer as year,
      extract(month from coalesce(date, created_at::date))::integer as month,
      coalesce(category, 'Other') as category,
      sum(coalesce(total_amount, 0))::numeric(12, 2) as total_amount
    from public.receipts
    group by user_id, year, month, coalesce(category, 'Other')
  ) category_rows
  group by user_id, year, month
) category_base
on category_base.user_id = month_base.user_id
and category_base.year = month_base.year
and category_base.month = month_base.month
left join (
  select
    user_id,
    year,
    month,
    jsonb_object_agg(category, receipt_count) as category_counts
  from (
    select
      user_id,
      extract(year from coalesce(date, created_at::date))::integer as year,
      extract(month from coalesce(date, created_at::date))::integer as month,
      coalesce(category, 'Other') as category,
      count(*)::integer as receipt_count
    from public.receipts
    group by user_id, year, month, coalesce(category, 'Other')
  ) category_rows
  group by user_id, year, month
) category_count_base
on category_count_base.user_id = month_base.user_id
and category_count_base.year = month_base.year
and category_count_base.month = month_base.month
on conflict (user_id, year, month)
do update set
  total_amount = excluded.total_amount,
  receipt_count = excluded.receipt_count,
  category_totals = excluded.category_totals,
  category_counts = excluded.category_counts,
  updated_at = now();

insert into public.yearly_summaries (
  user_id,
  year,
  total_amount,
  receipt_count,
  category_totals,
  category_counts,
  monthly_totals,
  updated_at
)
select
  year_base.user_id,
  year_base.year,
  year_base.total_amount,
  year_base.receipt_count,
  coalesce(category_base.category_totals, '{}'::jsonb),
  coalesce(category_count_base.category_counts, '{}'::jsonb),
  coalesce(month_base.monthly_totals, '{}'::jsonb),
  now()
from (
  select
    user_id,
    extract(year from coalesce(date, created_at::date))::integer as year,
    sum(coalesce(total_amount, 0))::numeric(12, 2) as total_amount,
    count(*)::integer as receipt_count
  from public.receipts
  group by user_id, year
) year_base
left join (
  select
    user_id,
    year,
    jsonb_object_agg(category, total_amount) as category_totals
  from (
    select
      user_id,
      extract(year from coalesce(date, created_at::date))::integer as year,
      coalesce(category, 'Other') as category,
      sum(coalesce(total_amount, 0))::numeric(12, 2) as total_amount
    from public.receipts
    group by user_id, year, coalesce(category, 'Other')
  ) category_rows
  group by user_id, year
) category_base
on category_base.user_id = year_base.user_id
and category_base.year = year_base.year
left join (
  select
    user_id,
    year,
    jsonb_object_agg(category, receipt_count) as category_counts
  from (
    select
      user_id,
      extract(year from coalesce(date, created_at::date))::integer as year,
      coalesce(category, 'Other') as category,
      count(*)::integer as receipt_count
    from public.receipts
    group by user_id, year, coalesce(category, 'Other')
  ) category_rows
  group by user_id, year
) category_count_base
on category_count_base.user_id = year_base.user_id
and category_count_base.year = year_base.year
left join (
  select
    user_id,
    year,
    jsonb_object_agg(month, total_amount) as monthly_totals
  from (
    select
      user_id,
      extract(year from coalesce(date, created_at::date))::integer as year,
      extract(month from coalesce(date, created_at::date))::integer::text as month,
      sum(coalesce(total_amount, 0))::numeric(12, 2) as total_amount
    from public.receipts
    group by user_id, year, month
  ) month_rows
  group by user_id, year
) month_base
on month_base.user_id = year_base.user_id
and month_base.year = year_base.year
on conflict (user_id, year)
do update set
  total_amount = excluded.total_amount,
  receipt_count = excluded.receipt_count,
  category_totals = excluded.category_totals,
  category_counts = excluded.category_counts,
  monthly_totals = excluded.monthly_totals,
  updated_at = now();

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
