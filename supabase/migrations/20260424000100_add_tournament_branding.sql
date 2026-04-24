alter table public.tournaments
  add column if not exists brand_name text,
  add column if not exists logo_url text;

update public.tournaments
set brand_name = coalesce(brand_name, 'Papi Fútbol')
where brand_name is null;
