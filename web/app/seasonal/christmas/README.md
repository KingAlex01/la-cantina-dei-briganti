# Natale — ASCII dorato

Albero generato in Canvas 2D dietro alla prima schermata della home. I caratteri e le luci cambiano luminosità lentamente; vicino al puntatore i caratteri si illuminano e si spostano di pochi pixel. Il movimento del puntatore lascia una breve scia dorata. Un clic o un tocco sullo sfondo produce un’onda di luce e alcune scintille.

I collegamenti, i pulsanti e il selettore della lingua mantengono il comportamento normale. Non viene catturato il puntatore e lo scorrimento touch rimane nativo. Su richiesta dell’utente non è presente un comando di pausa visibile. L’animazione si ferma quando esce dallo schermo, quando la scheda è nascosta o se è richiesto movimento ridotto. Senza JavaScript o Canvas rimane una sagoma ASCII statica.

Il numero di particelle è limitato a 64 sui telefoni e 110 sugli schermi più grandi; il rendering è limitato a 30 fps sui telefoni e 60 fps sugli schermi più grandi, con densità massima 1,5. Observer, eventi e frame vengono rimossi all’uscita dalla pagina. Non ci sono dipendenze aggiuntive né un calendario di attivazione automatica.

Per rimuovere la decorazione, sostituire il wrapper `ChristmasScene` in `app/page.tsx` con il precedente `div`, mantenendone `className` e contenuti, eliminare l’import e rimuovere questa cartella.

Verifiche: `node --test scripts/christmas-animation.test.mjs`, `npm run lint`, `npm run build`. I test controllano movimento ridotto, sospensione e riattivazione, limite e dissolvenza delle particelle, pulizia all’uscita e assenza del contesto Canvas.
