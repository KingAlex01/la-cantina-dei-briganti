# PDF sorgenti del menù

Metti qui una cartella per ogni nuova versione, per esempio `2026-09/`, con i file `it.pdf`, `en.pdf`, `es.pdf`, `fr.pdf` e, se disponibile, `de.pdf`.

Poi chiedi a Codex: **«Aggiorna il menù dai PDF in `menu-sorgenti/2026-09`: confronta piatti, prezzi e allergeni, aggiorna `web/lib/menu/current-menu.json`, verifica e pubblica su Supabase.»**

Codex revisiona i PDF e aggiorna il JSON strutturato. `npm run menu:check`, eseguito da `web/`, controlla tutti i dati senza pubblicare. `npm run menu:publish` sincronizza il JSON con Supabase; la pagina pubblica `/menu` legge da lì e si aggiorna senza un nuovo deploy. Il primo import è in italiano; le altre lingue sono allineate allo stesso ordine, prezzo e lista di allergeni.

La sola copia dei PDF nella cartella non avvia una pubblicazione: il loro testo contiene righe spezzate e caratteri accentati estratti male, quindi serve una revisione prima di cambiare il menù pubblico.

I PDF di maggio 2026 contengono anche la password Wi-Fi stampata sul menù. I file `*.pdf` in questa cartella sono esclusi da Git: restano sul computer e non vengono caricati nel repository pubblico. Il JSON contiene soltanto i dati necessari a mostrare i piatti.
