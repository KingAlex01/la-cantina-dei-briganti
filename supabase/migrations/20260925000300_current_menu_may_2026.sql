-- Trascrizione dei quattro PDF di maggio 2026 forniti dal titolare.
-- Il PDF spagnolo indica 14 euro per gli spaghetti alle cozze; IT/EN/FR
-- indicano 12 euro. Il titolare ha confermato 12 euro il 25 settembre 2026.
-- Coperto (2 euro) e credenziali Wi-Fi non sono piatti e restano fuori dal menu.
do $$
declare
  v_menu jsonb := $menu$
  [
    {"position":1,"name":{"it":"Antipasti","en":"Starters","es":"Entrantes","fr":"Entrées"},"items":[
      {"position":1,"price":7,"allergens":[1],"name":{"it":"Fave e cicorie con pane croccante e cipolla crispy","en":"Broad bean purée and wild chicory with crunchy bread and crispy onions","es":"Puré de habas e achicoria silvestre con pan crujiente y cebolla frita crujiente","fr":"Purée de fèves et chicorée sauvage avec pain croquant et oignons croustillants"}},
      {"position":2,"price":10,"allergens":[6],"name":{"it":"Insalata di polpo, patate e pomodori secchi","en":"Octopus salad with potatoes and sun-dried tomatoes","es":"Ensalada de pulpo, patatas y tomates secos","fr":"Salade de poulpe, pommes de terre et tomates séchées"}},
      {"position":3,"price":8,"allergens":[2],"name":{"it":"Parmigiana di melanzane","en":"Eggplant Parmigiana","es":"Parmigiana de berenjenas","fr":"Parmigiana d'aubergines"}},
      {"position":4,"price":9,"allergens":[5],"name":{"it":"Tartare di manzo battuta al coltello con popcorn e mayo alla senape","en":"Hand-cut beef tartare with popcorn and mustard mayonnaise","es":"Tartar de ternera cortado a cuchillo con palomitas de maíz y mayonesa de mostaza","fr":"Tartare de bœuf coupé au couteau avec pop-corn et mayonnaise à la moutarde"}},
      {"position":5,"price":7,"allergens":[1,2,3],"name":{"it":"Frisa con battuto di gamberi rossi, zucchine alla poverella e stracciatella","en":"Frisa with red prawn tartare, marinated zucchini alla poverella and stracciatella cheese","es":"Frisa con tartar de gambas rojas, calabacines marinados alla poverella y queso stracciatella","fr":"Frisa avec tartare de crevettes rouges, courgettes marinées alla poverella et fromage stracciatella"}},
      {"position":6,"price":10,"allergens":[1,2,5],"name":{"it":"Baccalà mantecato croccante, mayo all'aglio e crema di zucchine","en":"Crispy creamed cod with garlic mayonnaise and zucchini cream","es":"Bacalao mantecado crujiente, mayonesa de ajo y crema de calabacín","fr":"Brandade de morue croustillante, mayonnaise à l'ail et crème de courgettes"}},
      {"position":7,"price":8,"allergens":[5],"name":{"it":"Carpaccio di girello con spuma di salsa tonnata, cappero e polvere di pomodoro","en":"Beef eye of round carpaccio with tuna sauce foam, capers and tomato powder","es":"Carpaccio de redondo de ternera con espuma de salsa tonnata, alcaparras y polvo de tomate","fr":"Carpaccio de rond de gîte avec écume de sauce au thon, câpres et poudre de tomate"}},
      {"position":8,"price":9,"allergens":[1,3],"name":{"it":"Gambero in tempura e salsa ’nduja","en":"Shrimp tempura with 'nduja sauce","es":"Tempura de gambas con salsa de 'nduja","fr":"Tempura de crevettes et sauce à la 'nduja"}},
      {"position":9,"price":10,"allergens":[1,5],"name":{"it":"Tartare di tonno, emulsione al lime e chips di patate","en":"Tuna tartare with lime emulsion and potato chips","es":"Tartar de atún con emulsión de lima y chips de patata","fr":"Tartare de thon, émulsion au citron vert et chips de pomme de terre"}},
      {"position":10,"price":13,"allergens":[1,2],"name":{"it":"Acciughe del Cantabrico, pane croccante e burro salato","en":"Cantabrian anchovies with crunchy bread and salted butter","es":"Anchoas del Cantábrico con pan crujiente y mantequilla con sal","fr":"Anchois de Cantabrie avec pain croquant et beurre salé"}},
      {"position":11,"price":20,"allergens":[],"name":{"it":"Selezione crudo mare","en":"Selection of raw seafood","es":"Selección de marisco crudo","fr":"Sélection de fruits de mer crus"},"description":{"it":"Su disponibilità","en":"Subject to availability","es":"Según disponibilidad","fr":"Selon disponibilité"}},
      {"position":12,"price":15,"allergens":[],"name":{"it":"Antipasto misto dei briganti","en":"I Briganti mixed appetizer","es":"Entremeses variados I Briganti","fr":"Assortiment d'entrées I Briganti"},"description":{"it":"5 portate scelte dallo chef, minimo 2 porzioni","en":"5 courses selected by the chef, minimum 2 portions","es":"5 platos seleccionados por el chef, mínimo 2 porciones","fr":"5 plats sélectionnés par le chef, minimum 2 portions"}}
    ]},
    {"position":2,"name":{"it":"Primi","en":"First courses","es":"Primeros platos","fr":"Premiers plats"},"items":[
      {"position":1,"price":14,"allergens":[2,4],"name":{"it":"Risotto Acquerello di mare crudo e cotto","en":"Seafood risotto with raw and cooked catch of the day","es":"Risotto de marisco crudo y cocinado","fr":"Risotto aux fruits de mer crus et cuits"},"description":{"it":"Minimo 2 porzioni","en":"Minimum 2 portions","es":"Mínimo 2 porciones","fr":"Minimum 2 portions"}},
      {"position":2,"price":12,"allergens":[1,2,5],"name":{"it":"Raviolo fresco Sabatelli ripieno di carne con datterino rosso, crema di pecorino e guanciale croccante","en":"Fresh Sabatelli meat-filled ravioli with red datterino tomatoes, pecorino cream and crispy guanciale","es":"Ravioli frescos Sabatelli rellenos de carne con tomates datterino rojos, crema de pecorino y guanciale crujiente","fr":"Raviolis frais Sabatelli à la viande avec tomates datterino rouges, crème de pecorino et guanciale croustillant"}},
      {"position":3,"price":14,"allergens":[1,2,3],"name":{"it":"Calamarata Valdoro al gambero rosso cotto e crudo con stracciatella e polvere di olive","en":"Valdoro calamarata with cooked and raw red prawn, stracciatella cheese and olive powder","es":"Calamarata con gamba roja cocida y cruda, stracciatella y polvo de aceitunas","fr":"Calamarata aux crevettes rouges cuites et crues, stracciatella et poudre d'olives"}},
      {"position":4,"price":10,"allergens":[1,2],"name":{"it":"Fusillone Valdoro con datterino giallo, salsa al pomodoro arrosto, basilico e stracciatella","en":"Valdoro fusillone with yellow tomato, roasted tomato sauce, basil emulsion and stracciatella cheese","es":"Fusillone Valdoro con tomate amarillo, salsa de tomate asado, emulsión de albahaca y stracciatella","fr":"Fusillone Valdoro avec tomate jaune, sauce aux tomates rôties, émulsion au basilic et stracciatella"}},
      {"position":5,"price":12,"allergens":[1,6],"name":{"it":"Spaghetto Valdoro alle cozze e pan fritto","en":"Valdoro spaghetti with mussels and crispy fried breadcrumbs","es":"Spaghetti Valdoro con mejillones y trozos de pan frito","fr":"Spaghetti Valdoro aux moules et croûtons de pain frit"}},
      {"position":6,"price":12,"allergens":[1,2],"name":{"it":"Orecchietta fresca Sabatelli al ragù e polpette","en":"Fresh Sabatelli orecchiette with meat ragù and meatballs","es":"Orecchiette frescas con ragú de carne y albóndigas","fr":"Orecchiette fraîches Sabatelli au ragoût de viande et boulettes"}}
    ]},
    {"position":3,"name":{"it":"Secondi","en":"Main courses","es":"Segundos platos","fr":"Plats de résistance"},"items":[
      {"position":1,"price":18,"allergens":[6],"name":{"it":"Polpo scottato su crema di carote, salsa alla nduja e polvere di olive","en":"Seared octopus on carrot cream, 'nduja sauce and olive powder","es":"Pulpo a la plancha sobre crema de zanahorias, salsa de 'nduja y polvo de aceitunas","fr":"Poulpe saisi sur crème de carottes, sauce à la 'nduja et poudre d'olives"}},
      {"position":2,"price":16,"allergens":[1],"name":{"it":"Filetto di ombrina con guazzetto e crostini","en":"Shiadrum fillet with seafood broth and croutons","es":"Filete de corvina con guazzetto y costrones de pan","fr":"Filet d'ombrine avec guazzetto et croûtons"}},
      {"position":3,"price":16,"allergens":[1,5],"name":{"it":"Tataki di tonno con maionese EVO al pomodoro e chips di patate","en":"Tuna tataki with tomato EVO oil mayonnaise and potato chips","es":"Tataki de atún con mayonesa de aceite de oliva EVO al tomate y chips de patata","fr":"Tataki de thon avec mayonnaise à l'huile d'olive EVO au tomate et chips"}},
      {"position":4,"price":16,"allergens":[],"name":{"it":"Stracotto di guancia di maialino al Primitivo con bietolina","en":"Suckling pig cheek braised in Primitivo wine with swiss chard","es":"Carrillera de cochinillo estofada al vino Primitivo con acelgas","fr":"Joue de porcelet braisée au vin Primitivo et blettes"}},
      {"position":5,"price":18,"allergens":[2],"name":{"it":"Tagliata di manzo con rucola e scaglie di pecorino","en":"Sliced beef steak with rocket and pecorino cheese flakes","es":"Tagliata de ternera con rúcula y lascas de queso pecorino","fr":"Tagliata de bœuf avec roquette et copeaux de fromage pecorino"}},
      {"position":6,"price":6,"allergens":[],"name":{"it":"Dessert dello chef","en":"Chef's dessert","es":"Postres del chef","fr":"Desserts du chef"}}
    ]}
  ]
  $menu$::jsonb;
  v_category jsonb;
  v_item jsonb;
  v_category_id uuid;
begin
  -- Non sovrascrive un menu già caricato dallo staff.
  if exists (select 1 from public.menu_catalog) then return; end if;
  insert into public.menu_catalog(id, source_language) values (true, 'it');
  for v_category in select value from jsonb_array_elements(v_menu) loop
    insert into public.menu_categories(position, name)
      values ((v_category->>'position')::integer, v_category->'name')
      returning id into v_category_id;
    for v_item in select value from jsonb_array_elements(v_category->'items') loop
      insert into public.menu_items(category_id, position, name, description, price, allergen_codes)
        values (v_category_id, (v_item->>'position')::integer, v_item->'name',
          coalesce(v_item->'description', '{}'::jsonb), (v_item->>'price')::numeric,
          array(select value::smallint from jsonb_array_elements_text(v_item->'allergens')));
    end loop;
  end loop;
end;
$$;
