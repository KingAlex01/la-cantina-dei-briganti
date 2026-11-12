# Menù novembre 2026

Pubblicato il 12 novembre 2026 alle 11:35 CET nel progetto Supabase collegato `mhlmxkvwdgzfgoigicjc`.

- Fonti: i due PDF italiani/inglesi forniti dal titolare, conservati come `it.pdf` ed `en.pdf`.
- `menu.json`: dati revisionati in IT/EN/ES/FR, identici a `web/lib/menu/current-menu.json`.
- 26 voci: 14 antipasti (le due varianti delle polpettine sono separate), 6 primi, 5 secondi e 1 dessert. Coperto: 2 euro, già gestito dall'interfaccia.
- Francese e spagnolo seguono il contenuto e il tono sintetico dell'inglese. Prezzi, codici degli allergeni e asterischi sono stati confrontati con l'italiano, senza dedurre allergeni aggiuntivi. Corretti soltanto refusi di trascrizione/impaginazione, incluso «Lampagioni» in «Lampascioni».
- `fr.pdf` ed `es.pdf`: traduzioni impaginate su una pagina con titolo, decorazioni, logo e QR originali; carattere serif Georgia per il testo tradotto. Copie finali in `output/pdf/2026-11/`.
- `render_translations.py`: rigenera i due PDF dai dati revisionati; richiede pypdf, reportlab, pypdfium2 e il font Georgia di Windows.
- `database-before.json`: copia delle sole tabelle del menù prima dell'importazione.
- `publish.sql`: importazione eseguita con la RPC esistente, in un'unica transazione per tutte le lingue. Controlla la data del catalogo precedente, i conteggi e la corrispondenza completa prima del commit. Il controllo sulla data impedisce di rieseguire accidentalmente questo import sul catalogo già aggiornato.

Verifiche completate: `npm --prefix web run menu:check`; confronto manuale con entrambi i PDF e controllo dei 26 prezzi, degli allergeni e degli asterischi; rilettura completa dal database come ruolo `anon`, identica ai dati revisionati nelle quattro lingue; rendering e controllo visivo di entrambi i PDF generati. La pagina sul dominio pubblico non era raggiungibile dall'ambiente di verifica, quindi non è stato verificato il rendering del sito online.

I PDF includono le informazioni Wi-Fi del menù originale e rimangono esclusi da Git. Nessuna modifica allo schema, alle prenotazioni o al codice dell'interfaccia; nessun commit, push o deploy.
