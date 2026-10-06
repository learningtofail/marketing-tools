import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const sandbox = { document: { addEventListener() {}, documentElement: { getAttribute() {}, setAttribute() {} } }, matchMedia: () => ({ matches: false }), TextDecoder, Uint8Array, Date, Math, JSON };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(readFileSync(path.join(here, '../../assets/lib.js'), 'utf8'), sandbox);
const MT = sandbox.MT;

test('MT.num: US, EU and French number formats', () => {
  const table = [
    ['1,234.56', 1234.56], ['1.234,56', 1234.56], ['12,5', 12.5], ['1 234,56', 1234.56], ['1 234,56', 1234.56],
    ['$1,234', 1234], ['(1,234.50)', -1234.5], ['-12,5', -12.5], ['45,2%', 45.2], ['1.234.567,8', 1234567.8], ['1,234,567', 1234567], ['0,75', 0.75], ['3.5', 3.5],
  ];
  for (const [input, want] of table) assert.equal(MT.num(input), want, input);
});

test('MT.num: blanks and text are NaN, never 0', () => {
  for (const v of ['', ' ', 'n/a', 'N/A', '-', '—', 'abc', null, undefined]) assert.ok(Number.isNaN(MT.num(v)), String(v));
});

test('MT.numFmt: one decimal-comma value flips the column to eu', () => {
  assert.equal(MT.numFmt(['1.234,56', '12,5', '800']), 'eu');
  assert.equal(MT.numFmt(['1,234', '5,000', '12.5']), 'us');
  assert.equal(MT.numFmt(['1.234', '2.500']), 'us');
  assert.equal(MT.num('1,234', 'eu'), 1.234);
  assert.equal(MT.num('1.234', 'eu'), 1234);
});

test('MT.parseDate: day-first, month-first, French months, compact', () => {
  const d = (y, m, day) => Date.UTC(y, m - 1, day);
  assert.equal(MT.parseDate('2025-01-31'), d(2025, 1, 31));
  assert.equal(MT.parseDate('20250131'), d(2025, 1, 31));
  assert.equal(MT.parseDate('31/01/2025'), d(2025, 1, 31));
  assert.equal(MT.parseDate('31.01.2025'), d(2025, 1, 31));
  assert.equal(MT.parseDate('03/04/2025'), d(2025, 3, 4));
  assert.equal(MT.parseDate('03/04/2025', 'dmy'), d(2025, 4, 3));
  assert.equal(MT.parseDate('31 janv. 2025'), d(2025, 1, 31));
  assert.equal(MT.parseDate('15 août 2025'), d(2025, 8, 15));
  assert.equal(MT.parseDate('Jan 31, 2025'), d(2025, 1, 31));
  assert.ok(Number.isNaN(MT.parseDate('13/13/2025')));
});

test('MT.dateOrder: infers order from the column and flags ambiguity', () => {
  assert.deepEqual({ ...MT.dateOrder(['13/02/2025', '01/02/2025']) }, { order: 'dmy', ambiguous: false });
  assert.deepEqual({ ...MT.dateOrder(['02/13/2025', '01/02/2025']) }, { order: 'mdy', ambiguous: false });
  assert.equal(MT.dateOrder(['01/02/2025', '03/04/2025']).ambiguous, true);
});

test('MT.readTable: skips # preambles and title lines, drops Total rows with a log', () => {
  const ga4 = '# ----------------------------------------\n# Traffic acquisition\n# Start date: 20250101\n# ----------------------------------------\nChannel,Sessions,Revenue\nOrganic,1000,500\nPaid,800,900\nGrand total,1800,1400\n';
  const t = MT.readTable(ga4);
  assert.deepEqual([...t.cols], ['Channel', 'Sessions', 'Revenue']);
  assert.equal(t.rows.length, 2);
  assert.equal(t.totals, 1);
  assert.ok(MT.dq.html().includes('total row'));
  const ads = 'Campaign report\n"Jan 1, 2025 - Jan 31, 2025"\nCampaign,Cost,Conversions\nA,10,1\nB,20,2\nTotal: Account,30,3\n';
  const t2 = MT.readTable(ads);
  assert.deepEqual([...t2.cols], ['Campaign', 'Cost', 'Conversions']);
  assert.equal(t2.rows.length, 2);
});

test('MT.readTable: totals can be kept and a normal table is untouched', () => {
  const csv = 'a,b\nx,1\nTotal,1\n';
  assert.equal(MT.readTable(csv, null, { keepTotals: true }).rows.length, 2);
  const plain = MT.readTable('a,b\nx,1\ny,2\n');
  assert.equal(plain.rows.length, 2);
  assert.equal(MT.dq.html(), '');
});

test('MT.toCSV neutralises spreadsheet formulas but keeps numbers', () => {
  assert.equal(MT.toCSV([['=SUM(A1)', '+cmd', '@x', '-5', '-abc', 'ok', 3, -2]]), "'=SUM(A1),'+cmd,'@x,-5,'-abc,ok,3,-2");
});

test('MT.decode: UTF-8, BOM, UTF-16 and Windows-1252', () => {
  assert.equal(MT.decode(new Uint8Array([0xEF, 0xBB, 0xBF, 0x61]).buffer).text, 'a');
  assert.equal(MT.decode(new Uint8Array([0xFF, 0xFE, 0x61, 0x00]).buffer).text, 'a');
  const fr = MT.decode(new Uint8Array([0x43, 0x6F, 0xFB, 0x74]).buffer);
  assert.equal(fr.enc, 'windows-1252');
  assert.equal(fr.text, 'Coût');
});

test('MT.notComputed renders an info banner, not a pass', () => {
  const h = MT.notComputed('Not computed', ['No rows mapped.']);
  assert.ok(h.includes('verdict info') && !h.includes('pos'));
});

test('MT.readTable normalises decimal-comma and day-first columns and logs them', () => {
  const csv = 'date;cost;rate\n31/01/2025;1 234,50;4,5%\n01/02/2025;80,25;3,1%\n02/02/2025;12,0;2,0%\n';
  const t = MT.readTable(csv);
  assert.deepEqual([...t.rows.map(r => r.date)], ['2025-01-31', '2025-02-01', '2025-02-02']);
  assert.deepEqual([...t.rows.map(r => MT.num(r.cost))], [1234.5, 80.25, 12]);
  assert.equal(MT.pctNum(t.rows[0].rate), 0.045);
  assert.equal(MT.dq.items.length, 3);
});

test('MT.readTable leaves US columns, text and ambiguous-free ISO dates alone', () => {
  const t = MT.readTable('date,cost,name\n2025-01-31,"1,234.50",a\n2025-02-01,80.25,b\n');
  assert.equal(t.rows[0].cost, '1,234.50');
  assert.equal(t.rows[0].date, '2025-01-31');
  assert.equal(MT.dq.items.length, 0);
});

test('MT.guess maps French headers to the English patterns', () => {
  const cols = ['Campagne', 'Clics plateforme', 'Sessions', 'Dépenses'];
  assert.equal(MT.guess(cols, /click/i), 'Clics plateforme');
  assert.equal(MT.guess(cols, /spend|cost/i), 'Dépenses');
  assert.equal(MT.guess(cols, /campaign|name/i), 'Campagne');
  assert.equal(MT.guess(['Date', 'Revenus'], /revenue/i), 'Revenus');
});
