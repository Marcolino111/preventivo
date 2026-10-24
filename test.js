const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, 'preventivo.html'), 'utf8');

const match = html.match(/\/\/ --- LOGICA ---([\s\S]*?)\/\/ --- FINE LOGICA ---/);
assert.ok(match, 'Blocco // --- LOGICA --- non trovato in preventivo.html');

const calcolaTotale = vm.runInThisContext(
  match[1] + '\n;calcolaTotale;',
  { filename: 'preventivo.html#logica' }
);

test('una voce: 100 x 1 -> imponibile 110, IVA 24,2, totale 134,2', () => {
  assert.deepEqual(calcolaTotale([{ quantita: 1, prezzo: 100 }]), {
    imponibile: 110,
    iva: 24.2,
    totale: 134.2,
    sconto: 0,
    spedizione: 10
  });
});

test('due voci: 50 + 50 -> imponibile 110, IVA 24,2, totale 134,2', () => {
  assert.deepEqual(
    calcolaTotale([
      { quantita: 1, prezzo: 50 },
      { quantita: 1, prezzo: 50 }
    ]),
    { imponibile: 110, iva: 24.2, totale: 134.2, sconto: 0, spedizione: 10 }
  );
});

test('quantita frazionaria: 2,5 x 10 -> imponibile 35, IVA 7,7, totale 42,7', () => {
  assert.deepEqual(calcolaTotale([{ quantita: 2.5, prezzo: 10 }]), {
    imponibile: 35,
    iva: 7.7,
    totale: 42.7,
    sconto: 0,
    spedizione: 10
  });
});

test('valori vuoti, non numerici o negativi valgono 0', () => {
  assert.deepEqual(
    calcolaTotale([
      { quantita: '', prezzo: '' },
      { quantita: 'abc', prezzo: 100 },
      { quantita: -2, prezzo: 50 },
      { quantita: 1, prezzo: -30 }
    ]),
    { imponibile: 10, iva: 2.2, totale: 12.2, sconto: 0, spedizione: 10 }
  );
});

test('arrotondamento: 3 x 33,33 -> imponibile 109,99, IVA 24,2, totale 134,19', () => {
  assert.deepEqual(calcolaTotale([{ quantita: 3, prezzo: 33.33 }]), {
    imponibile: 109.99,
    iva: 24.2,
    totale: 134.19,
    sconto: 0,
    spedizione: 10
  });
});

test('arrotondamento a 2 decimali su quantita e prezzi decimali', () => {
  assert.deepEqual(calcolaTotale([{ quantita: 1.5, prezzo: 19.99 }]), {
    imponibile: 39.99,
    iva: 8.8,
    totale: 48.79,
    sconto: 0,
    spedizione: 10
  });
});

test('aliquota IVA personalizzata (es. 10%)', () => {
  assert.deepEqual(calcolaTotale([{ quantita: 1, prezzo: 200 }], 0.1), {
    imponibile: 210,
    iva: 21,
    totale: 231,
    sconto: 0,
    spedizione: 10
  });
});

test('totale sempre uguale a imponibile + IVA', () => {
  const risultato = calcolaTotale([
    { quantita: 3, prezzo: 12.34 },
    { quantita: 7, prezzo: 0.99 }
  ]);
  assert.equal(roundTo2(risultato.totale), roundTo2(risultato.imponibile + risultato.iva));
  assert.equal(roundTo2(risultato.iva), roundTo2(risultato.imponibile * 0.22));
});

test('sconto 10% su 100 -> sconto 10, imponibile 100, IVA 22, totale 122', () => {
  assert.deepEqual(calcolaTotale([{ quantita: 1, prezzo: 100 }], 0.22, 10), {
    imponibile: 100,
    iva: 22,
    totale: 122,
    sconto: 10,
    spedizione: 10
  });
});

test('sconto 100% azzera le voci ma non la spedizione', () => {
  assert.deepEqual(calcolaTotale([{ quantita: 2, prezzo: 75 }], 0.22, 100), {
    imponibile: 10,
    iva: 2.2,
    totale: 12.2,
    sconto: 150,
    spedizione: 10
  });
});

test('sconto fuori range o non numerico viene limitato a 0-100', () => {
  assert.deepEqual(calcolaTotale([{ quantita: 1, prezzo: 100 }], 0.22, -10), {
    imponibile: 110,
    iva: 24.2,
    totale: 134.2,
    sconto: 0,
    spedizione: 10
  });
  assert.deepEqual(calcolaTotale([{ quantita: 1, prezzo: 100 }], 0.22, 150), {
    imponibile: 10,
    iva: 2.2,
    totale: 12.2,
    sconto: 100,
    spedizione: 10
  });
  assert.deepEqual(calcolaTotale([{ quantita: 1, prezzo: 100 }], 0.22, 'abc'), {
    imponibile: 110,
    iva: 24.2,
    totale: 134.2,
    sconto: 0,
    spedizione: 10
  });
});

test('sconto con aliquota IVA personalizzata: 200, sconto 10%, IVA 10%', () => {
  assert.deepEqual(calcolaTotale([{ quantita: 1, prezzo: 200 }], 0.1, 10), {
    imponibile: 190,
    iva: 19,
    totale: 209,
    sconto: 20,
    spedizione: 10
  });
});

test('arrotondamento sconto: 99,99 con sconto 33,33%', () => {
  assert.deepEqual(calcolaTotale([{ quantita: 3, prezzo: 33.33 }], 0.22, 33.33), {
    imponibile: 76.66,
    iva: 16.87,
    totale: 93.53,
    sconto: 33.33,
    spedizione: 10
  });
});

test('preventivo vuoto -> imponibile 10, IVA 2,2, totale 12,2', () => {
  assert.deepEqual(calcolaTotale([]), {
    imponibile: 10,
    iva: 2.2,
    totale: 12.2,
    sconto: 0,
    spedizione: 10
  });
});

test('la spedizione non viene scontata e viene tassata: 100 con sconto 100% -> imponibile 10', () => {
  assert.deepEqual(calcolaTotale([{ quantita: 1, prezzo: 100 }], 0.22, 100), {
    imponibile: 10,
    iva: 2.2,
    totale: 12.2,
    sconto: 100,
    spedizione: 10
  });
});

test('la spedizione viene tassata: 100 con sconto 10% e aliquota 10% -> imponibile 100', () => {
  assert.deepEqual(calcolaTotale([{ quantita: 1, prezzo: 100 }], 0.1, 10), {
    imponibile: 100,
    iva: 10,
    totale: 110,
    sconto: 10,
    spedizione: 10
  });
});

function roundTo2(valore) {
  return Math.round((valore + Number.EPSILON) * 100) / 100;
}
