-- Sposta il dessert dal menu iniziale dei Secondi in una sezione autonoma.
-- Non tocca prezzi, allergeni, descrizioni o altri piatti; se il menu è già
-- stato aggiornato dallo staff, non modifica nulla.
do $$
declare
  v_secondi_id uuid;
  v_dessert_id uuid;
  v_item_id uuid;
begin
  select id into v_secondi_id
    from public.menu_categories
    where position = 3 and name->>'it' = 'Secondi';

  if v_secondi_id is null then return; end if;

  select id into v_item_id
    from public.menu_items
    where category_id = v_secondi_id and name->>'it' = 'Dessert dello chef';

  if v_item_id is null then return; end if;

  select id into v_dessert_id
    from public.menu_categories
    where position = 4 and name->>'it' = 'Dessert';

  if v_dessert_id is null then
    insert into public.menu_categories (position, name)
      values (4, '{"it":"Dessert","en":"Desserts","es":"Postres","fr":"Desserts"}'::jsonb)
      returning id into v_dessert_id;
  end if;

  update public.menu_items
    set category_id = v_dessert_id, position = 1
    where id = v_item_id;

  update public.menu_catalog set updated_at = now() where id = true;
end;
$$;
