# PDF sorgenti del menù

Metti qui una cartella per ogni nuova versione, per esempio `2026-10/`, con i file `it.pdf`, `en.pdf`, `es.pdf` e `fr.pdf`. Il menù digitale supporta italiano, inglese, spagnolo e francese.

Poi chiedi a Codex: **«Aggiorna il menù dai PDF in `menu-sorgenti/2026-10`: confronta piatti, prezzi e allergeni, aggiorna `web/lib/menu/current-menu.json` e verifica l'anteprima locale. Mantieni Antipasti, Primi, Secondi e Dessert separati.»**

Codex revisiona i PDF e aggiorna il JSON strutturato. `npm run menu:check`, eseguito da `web/`, controlla tutti i dati senza pubblicare. In sviluppo `/menu` mostra il JSON locale; il sito in produzione legge Supabase. Solo quando chiedi esplicitamente la pubblicazione, `npm run menu:publish` sincronizza il JSON con Supabase. Un sito già pubblicato con l'interfaccia compatibile mostra i nuovi dati senza un nuovo deploy; le modifiche all'interfaccia richiedono invece la pubblicazione del codice. Il primo import è in italiano; le altre lingue sono allineate allo stesso ordine, prezzo e lista di allergeni.

In tutte le lingue `name` contiene il nome completo del piatto con gli ingredienti, come nel PDF: non separarli in un sottotitolo. `description` è riservato alle note sotto il piatto: disponibilità del crudo mare, cinque portate/minimo due porzioni dell'antipasto misto e minimo due porzioni del riso. Su schermi stretti il testo completo può andare a capo naturalmente, senza tagli o scorrimento laterale.

La sola copia dei PDF nella cartella non avvia una pubblicazione: il loro testo contiene righe spezzate e caratteri accentati estratti male, quindi serve una revisione prima di cambiare il menù pubblico.

I PDF contengono anche la password Wi-Fi stampata sul menù. I file `*.pdf` in questa cartella sono esclusi da Git: restano sul computer e non vengono caricati nel repository pubblico. Il JSON contiene soltanto i dati necessari a mostrare i piatti.
