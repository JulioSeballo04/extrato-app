// Cria dados de teste nos emuladores locais (nunca no projeto real).
// Uso: ver scripts/emulators.md.
//
// Contas de teste (só existem no emulador):
//   teste@gastos.test     / senha-local-123  → tem dados no FORMATO ANTIGO
//                                              (users/{uid}), para testar a migração
//   parceira@gastos.test  / senha-local-123  → conta vazia, para testar convites

const PROJECT = process.env.EMULATOR_PROJECT || 'demo-gastos';
const AUTH = 'http://127.0.0.1:9099';
const FIRESTORE = 'http://127.0.0.1:8080';
const OWNER = { Authorization: 'Bearer owner' }; // credencial do emulador que ignora as regras

const USERS = [
  { email: 'teste@gastos.test', password: 'senha-local-123', name: 'Julio Teste', legacy: true },
  { email: 'parceira@gastos.test', password: 'senha-local-123', name: 'Sofia Teste', legacy: false },
];

async function call(url, body, headers = {}) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function createUser({ email, password, name }) {
  const { localId } = await call(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, { email, password, displayName: name, returnSecureToken: true });
  await call(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, { localId, emailVerified: true }, OWNER);
  return localId;
}

// Valor JS → formato da API REST do Firestore.
function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
  return { stringValue: String(v) };
}

async function writeDoc(path, data) {
  const res = await fetch(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', ...OWNER },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)])) }),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
}

// Dados no formato antigo: tudo num documento só, como o app gravava antes.
function legacyData() {
  const people = [
    { id: 'p1', name: 'Julio', salary: 4000 },
    { id: 'p2', name: 'Sofia', salary: 3500 },
    { id: 'p3', name: 'Joel', salary: 0 },
  ];
  const cards = [
    { id: 'c1', name: 'Nubank', limitValue: 9600, bank: 'nubank', dueDay: 8, paidInvoices: ['2026-09'] },
    { id: 'c2', name: 'Santander', limitValue: 2280, bank: 'santander', dueDay: 15 },
  ];
  const cardTransactions = [
    { id: 't1', cardId: 'c1', personId: 'p1', description: 'Supermercado', amount: 320.5, date: '2026-10-03', category: 'Mercado', paid: false },
    { id: 't2', cardId: 'c1', personId: 'p2', description: 'Farmácia', amount: 89.9, date: '2026-10-07', category: 'Saúde' },
    // compra 3x dividida entre duas pessoas (6 lançamentos)
    ...['p1', 'p2'].flatMap(personId => [1, 2, 3].map(n => ({
      id: `t-tv-${personId}-${n}`, cardId: 'c2', personId, description: 'Televisão', amount: 250,
      date: `2026-${String(8 + n).padStart(2, '0')}-10`, category: 'Compras', installmentNumber: n, installmentTotal: 3,
      installmentGroupId: `g-${personId}`, splitGroupId: 'split-tv', splitCount: 2, paid: n === 1,
    }))),
    // registro antigo com campo que não existe mais e valor em texto
    { id: 't-velho', cardId: 'c1', personId: 'p3', description: 'Lanche', amount: '25.5', date: '2026-10-01', vale: true },
  ];
  const otherExpenses = [
    { id: 'e1', personId: 'p1', description: 'Aluguel', amount: 1200, date: '2026-08-05', fixed: true, category: 'Contas fixas', paidMonths: ['2026-09'] },
    { id: 'e2', personId: 'p2', description: 'Academia', amount: 110, date: '2026-10-12', category: 'Lazer', paid: true },
  ];
  return { people, cards, cardTransactions, otherExpenses, paletteKey: 'blue' };
}

for (const u of USERS) {
  const uid = await createUser(u);
  if (u.legacy) await writeDoc(`users/${uid}`, legacyData());
  console.log(`${u.email} criado (uid ${uid})${u.legacy ? ' com dados no formato antigo' : ''}`);
}
