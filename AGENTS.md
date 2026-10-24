# AGENTS.md

Repo minimale, senza package.json né build step: due file in root.

## Comandi

- Test: `node --test` (Node 24, runner integrato `node:test`; nessun `npm install`).
- Singolo test: `node --test --test-name-pattern="<parte del nome>"`.
- App: aprire `preventivo.html` nel browser (nessun dev server).

## Struttura

- `preventivo.html`: app completa e autonoma (HTML + CSS + JS inline). Deve restare un singolo file senza dipendenze esterne.
- `test.js`: estrae la logica da `preventivo.html`, non duplica il codice.

## Vincoli non ovvi

- La logica di calcolo vive tra i marker esatti `// --- LOGICA ---` e `// --- FINE LOGICA ---` in `preventivo.html`. `test.js` la estrae con regex: non rinominare/rimuovere i marker e non spostare `calcolaTotale`/`round2` fuori dal blocco.
- In `test.js` usare `vm.runInThisContext` (stesso realm). Con `vm.createContext` gli oggetti creati hanno prototipi diversi e `assert.deepStrictEqual` fallisce pur avendo stessi valori.
- `calcolaTotale(voci, aliquotaIva = 0.22, scontoPercentuale = 0)` è pura e non tocca il DOM: riceve `{ quantita, prezzo }` (anche stringhe) e restituisce `{ imponibile, iva, totale, sconto, spedizione }` arrotondati a 2 decimali. Lo sconto percentuale (limitato a 0-100) riduce solo il lordo delle voci; poi si aggiunge `SPESE_SPEDIZIONE = 10` (fissa, mai scontata, tassata con IVA) e `imponibile` include già la spedizione. Quantità/prezzi/sconto non numerici o negativi valgono 0.
- L'indirizzo di spedizione (`#indirizzo-spedizione`) è solo testo: non partecipa al calcolo.
- UI e messaggi in italiano, valuta EUR formattata con `Intl.NumberFormat('it-IT')`. Modifiche alla logica: aggiornare/aggiungere casi in `test.js` e rilanciare `node --test` fino a 16+ PASS.
