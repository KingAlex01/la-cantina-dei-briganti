# Halloween 2026 — Autunno in cantina

Decorazione temporanea della sola home: ragnatela, luna, zucca e candela sopra la prima schermata. Il livello decorativo non è interattivo, non riceve clic ed è escluso dalla lettura degli screen reader. Colori, contenuti e layout del sito restano invariati. Sui telefoni gli elementi si riducono e la luna viene nascosta.

Le quattro immagini WebP con trasparenza, in `public/seasonal/halloween-2026/`, derivano dalle immagini fornite dall'utente e dalle versioni trasparenti elaborate con ImageGen.

## Calendario

Attivo dall'1 ottobre 2026 alle 00:00 fino all'1 novembre 2026 alle 00:00, secondo Europe/Rome: resta quindi visibile per tutto il 31 ottobre e si spegne automaticamente all'inizio di novembre. Gli estremi includono il cambio da ora legale a ora solare. Non ricorre negli anni successivi.

Il rendering iniziale sul server usa l'orologio del server; dopo l'idratazione il calendario segue l'orologio del dispositivo. Una pagina lasciata aperta si aggiorna alla scadenza; tornando a una scheda sospesa, il calendario viene ricontrollato.

## Rimozione definitiva

In `app/page.tsx`, eliminare gli import di `Halloween2026Scene` e `isHalloween2026Active`, quindi togliere soltanto i tag del wrapper `<Halloween2026Scene ...>` e `</Halloween2026Scene>`, mantenendone il contenuto.

Eliminare poi i file stagionali:

- `app/seasonal/halloween-2026/` (componente, CSS e questo README);
- `public/seasonal/halloween-2026/` (le quattro immagini);
- `lib/seasonal/halloween-2026.ts`;
- `scripts/halloween-2026.test.mjs`.

## Verifica

Dalla cartella `web`:

```powershell
node --test scripts/halloween-2026.test.mjs
npm run lint
npm run build
```

Il test verifica inizio e fine esatti, il cambio d'ora, l'assenza di ricorrenza futura, i ritardi verso le scadenze e gli input invalidi. Dopo la rimozione definitiva restano da eseguire soltanto lint e build.
