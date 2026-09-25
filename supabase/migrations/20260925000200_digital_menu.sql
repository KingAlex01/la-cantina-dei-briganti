-- Un catalogo attivo. Le traduzioni JSONB evitano join nella lettura pubblica.
create table public.menu_catalog (
  id boolean primary key default true check (id),
  source_language text not null check (source_language in ('it','en','es','fr','de')),
  updated_at timestamptz not null default now()
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  position integer not null unique check (position > 0),
  name jsonb not null default '{}'::jsonb check (jsonb_typeof(name) = 'object'),
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  position integer not null check (position > 0),
  name jsonb not null default '{}'::jsonb check (jsonb_typeof(name) = 'object'),
  description jsonb not null default '{}'::jsonb check (jsonb_typeof(description) = 'object'),
  price numeric(8,2) not null check (price >= 0 and price < 10000),
  allergen_codes smallint[] not null default '{}'
    check (allergen_codes <@ array[1,2,3,4,5,6]::smallint[]),
  created_at timestamptz not null default now(),
  unique (category_id, position)
);

create index menu_items_category_order on public.menu_items(category_id, position);

alter table public.menu_catalog enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;

revoke all on public.menu_catalog, public.menu_categories, public.menu_items
  from anon, authenticated, service_role;
grant select on public.menu_catalog, public.menu_categories, public.menu_items to anon, authenticated;
grant select, insert, update, delete on public.menu_catalog, public.menu_categories, public.menu_items to service_role;

create policy menu_catalog_public_read on public.menu_catalog for select to anon, authenticated using (true);
create policy menu_categories_public_read on public.menu_categories for select to anon, authenticated using (true);
create policy menu_items_public_read on public.menu_items for select to anon, authenticated using (true);

-- Un'unica transazione RPC: rifiuta traduzioni disallineate e rollback completo.
-- Solo il server con service_role può chiamarla dopo aver verificato lo staff.
create function public.import_menu(p_language text, p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text;
  v_row jsonb;
  v_category_id uuid;
  v_position integer;
  v_item_position integer;
  v_existing_price numeric(8,2);
  v_existing_allergens smallint[];
  v_expected_count integer;
  v_count integer := 0;
begin
  if p_language not in ('it','en','es','fr','de') or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Lingua o menu non valido';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(8675309);
  select source_language into v_source from public.menu_catalog where id = true;

  if v_source is null or v_source = p_language then
    delete from public.menu_categories where position > 0;
    insert into public.menu_catalog(id, source_language, updated_at)
      values (true, p_language, now())
      on conflict (id) do update set source_language = excluded.source_language, updated_at = now();
  else
    select count(*) into v_expected_count from public.menu_items;
    if v_expected_count <> jsonb_array_length(p_items) then
      raise exception 'Numero di piatti diverso dal menu di riferimento';
    end if;
  end if;

  for v_row in select value from jsonb_array_elements(p_items) loop
    v_position := (v_row->>'category_position')::integer;
    v_item_position := (v_row->>'position')::integer;
    if v_position is null or v_item_position is null or v_position < 1 or v_item_position < 1
       or nullif(btrim(v_row->>'category'), '') is null
       or nullif(btrim(v_row->>'name'), '') is null
       or (v_row->>'price')::numeric < 0 then
      raise exception 'Riga del menu non valida';
    end if;

    if v_source is null or v_source = p_language then
      insert into public.menu_categories(position, name)
        values (v_position, jsonb_build_object(p_language, v_row->>'category'))
        on conflict (position) do nothing;
      select id into v_category_id from public.menu_categories where position = v_position;
      insert into public.menu_items(category_id, position, name, description, price, allergen_codes)
        values (v_category_id, v_item_position,
          jsonb_build_object(p_language, v_row->>'name'),
          jsonb_build_object(p_language, coalesce(v_row->>'description', '')),
          (v_row->>'price')::numeric,
          array(select value::smallint from jsonb_array_elements_text(v_row->'allergens')));
    else
      select id into v_category_id from public.menu_categories where position = v_position;
      if v_category_id is null then raise exception 'Categoria non presente nel menu di riferimento'; end if;
      update public.menu_categories set name = name || jsonb_build_object(p_language, v_row->>'category')
        where id = v_category_id;
      select price, allergen_codes into v_existing_price, v_existing_allergens from public.menu_items
        where category_id = v_category_id and position = v_item_position;
      if v_existing_price is null or v_existing_price <> (v_row->>'price')::numeric then
        raise exception 'Ordine o prezzo diverso dal menu di riferimento';
      end if;
      if v_existing_allergens <> array(select value::smallint from jsonb_array_elements_text(v_row->'allergens')) then
        raise exception 'Allergeni diversi dal menu di riferimento';
      end if;
      update public.menu_items set
        name = name || jsonb_build_object(p_language, v_row->>'name'),
        description = description || jsonb_build_object(p_language, coalesce(v_row->>'description', ''))
        where category_id = v_category_id and position = v_item_position;
    end if;
    v_count := v_count + 1;
  end loop;
  update public.menu_catalog set updated_at = now() where id = true;
  return v_count;
end;
$$;

revoke all on function public.import_menu(text, jsonb) from public, anon, authenticated;
grant execute on function public.import_menu(text, jsonb) to service_role;
