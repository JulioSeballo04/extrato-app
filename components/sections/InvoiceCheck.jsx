'use client';

import React, { useEffect, useState } from 'react';
import { CheckCheck, RotateCcw } from 'lucide-react';
import { Dot, Sheet, MoneyInput } from '../ui';
import { SortPicker, savedSort, rememberSort } from './Entries';
import { money, parseAmount, fmtDate, sumAmounts, isRecurring, shownDate, sortEntries } from '../../lib/ledger';

// "Conferir planilha": checklist da fatura do mês para a pessoa ir marcando,
// com a fatura do banco aberta ao lado, cada lançamento que aparece lá. Opcional:
// digitar o total da fatura do banco para ver se bate com o do app.
// O que foi marcado fica só neste aparelho (localStorage), por cartão e mês.
export default function InvoiceCheck({ card, items, selectedMonth, title, personName, personColor, onClose }) {
  const key = `${CHECK_KEY}${card.id}:${selectedMonth}`;
  const [saved, setSaved] = useState(() => loadCheck(key));
  useEffect(() => { setSaved(loadCheck(key)); }, [key]);
  function update(next) {
    setSaved(next);
    storeCheck(key, next);
  }

  // Ordem escolhida (lembrada no aparelho). Começa pela data mais antiga, como
  // na fatura do banco. (Chave nova: antes, "date" aqui era a mais antiga.)
  const [sort, setSort] = useState(() => savedSort('checklist', 'date-asc'));
  function chooseSort(k) {
    setSort(k);
    rememberSort('checklist', k);
  }
  const list = sortEntries(items, sort, selectedMonth, () => card);
  // Ignora marcações de lançamentos que já não estão nesta fatura (apagados, editados).
  const checked = new Set(saved.ids.filter(id => list.some(t => t.id === id)));
  const total = sumAmounts(list);
  const checkedTotal = sumAmounts(list.filter(t => checked.has(t.id)));
  const missing = list.length - checked.size;
  const bank = saved.bank ? parseAmount(saved.bank) : null;
  const diff = bank === null ? 0 : Math.round((bank - total) * 100) / 100;
  // Pistas para achar a diferença: lançamentos que parecem repetidos (mesma
  // descrição, valor, data e pessoa; as partes de uma compra dividida têm
  // pessoas diferentes, então não contam) e os que valem exatamente a diferença.
  const cents = v => Math.round(Number(v || 0) * 100);
  const byKey = new Map();
  for (const t of list) {
    const k = [String(t.description).trim().toLowerCase(), cents(t.amount), shownDate(t, selectedMonth, card), t.personId].join('|');
    byKey.set(k, [...(byKey.get(k) || []), t.id]);
  }
  const repeated = new Set([...byKey.values()].filter(ids => ids.length > 1).flat());
  const sameAsDiff = diff ? list.filter(t => cents(t.amount) === cents(Math.abs(diff))) : [];

  function toggle(id) {
    const ids = checked.has(id) ? [...checked].filter(x => x !== id) : [...checked, id];
    update({ ...saved, ids });
  }

  return (
    <Sheet title={`Conferir planilha · ${title}`} onClose={onClose}>
      <p className="hint" style={{ marginBottom: '0.75rem' }}>
        Abra a fatura no app do banco e marque cada lançamento que aparece lá. O que sobrar sem marcar não está na fatura (ou está com outro valor).
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem 1rem', flexWrap: 'wrap', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
        <span style={{ fontWeight: 600, color: missing === 0 && list.length > 0 ? 'var(--success)' : 'var(--text)' }}>
          {missing === 0 && list.length > 0 ? 'Tudo conferido' : `${checked.size} de ${list.length} conferidos`}
        </span>
        <span className="hint">
          <span className="mono" style={{ color: 'var(--text-dim)' }}>{money(checkedTotal)}</span> de <span className="mono" style={{ color: 'var(--text-dim)' }}>{money(total)}</span>
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '0.4rem' }}>
          <button type="button" className="ghost" disabled={missing === 0} onClick={() => update({ ...saved, ids: list.map(t => t.id) })}>
            <CheckCheck size={14} />Marcar todos
          </button>
          <button type="button" className="ghost" disabled={checked.size === 0 && !saved.bank} onClick={() => update({ ids: [], bank: '' })}>
            <RotateCcw size={14} />Recomeçar
          </button>
        </span>
      </div>
      <div aria-hidden="true" style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden', marginBottom: '0.75rem' }}>
        <div style={{ height: '100%', width: `${list.length ? (checked.size / list.length) * 100 : 0}%`, background: 'var(--success)', transition: 'width 0.2s' }} />
      </div>

      {list.length > 1 && <SortPicker sort={sort} onChange={chooseSort} dateFirst="date-asc" />}
      {list.length === 0 && <p className="muted">Nada lançado nesta fatura.</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {list.map(t => {
          const on = checked.has(t.id);
          return (
            <li key={t.id} className="row" style={{ padding: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={on} onChange={() => toggle(t.id)} />
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, opacity: on ? 0.6 : 1 }}>
                  <span style={{ fontWeight: 500, overflowWrap: 'anywhere', textDecoration: on ? 'line-through' : 'none' }}>
                    {t.description}
                    {t.installmentTotal > 1 && <span className="mono hint"> {t.installmentNumber}/{t.installmentTotal}</span>}
                    {isRecurring(t) && <span className="hint"> · fixo</span>}
                    {repeated.has(t.id) && (
                      <span title="Mesma descrição, valor, data e pessoa de outro lançamento" style={{ marginLeft: 6, fontSize: '0.72rem', fontWeight: 600, color: 'var(--danger)', textDecoration: 'none', display: 'inline-block' }}>repetido?</span>
                    )}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span className="mono">{fmtDate(shownDate(t, selectedMonth, card))}</span>
                    <Dot color={personColor(t.personId)} />{personName(t.personId)}
                  </span>
                </span>
                <span className="mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{money(t.amount)}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {list.length > 0 && (
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'flex-end', gap: '0.5rem 1rem', flexWrap: 'wrap' }}>
          <label className="field" style={{ flex: '0 1 200px' }}>
            Total na fatura do banco
            <MoneyInput value={saved.bank} onChange={v => update({ ...saved, bank: v })} />
          </label>
          {bank !== null && (
            <p role="status" style={{ margin: 0, paddingBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: diff === 0 ? 'var(--success)' : 'var(--danger)' }}>
              {diff === 0
                ? 'Bate com o app.'
                : diff > 0
                  ? `A fatura tem ${money(diff)} a mais: falta lançar algo aqui.`
                  : `O app tem ${money(-diff)} a mais que a fatura: ${missing > 0 ? 'confira o que ficou sem marcar.' : 'veja as pistas abaixo.'}`}
            </p>
          )}
        </div>
      )}
      {diff !== 0 && (
        <div style={{ marginTop: '0.75rem', padding: '0.7rem 0.8rem', borderRadius: 10, background: 'var(--panel-alt)', fontSize: '0.82rem' }}>
          <strong>Onde pode estar a diferença</strong>
          <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', color: 'var(--text-dim)' }}>
            {sameAsDiff.length > 0 && (
              <li>
                {sameAsDiff.length === 1 ? 'Um lançamento vale' : `${sameAsDiff.length} lançamentos valem`} exatamente {money(Math.abs(diff))}:{' '}
                {sameAsDiff.map(t => `${t.description} (${fmtDate(shownDate(t, selectedMonth, card))})`).join(', ')}.
              </li>
            )}
            {repeated.size > 0 && <li>Há lançamentos marcados como <strong style={{ color: 'var(--danger)' }}>repetido?</strong> na lista: veja se a compra não foi lançada duas vezes.</li>}
            {diff < 0 ? (
              <>
                <li>Estorno ou crédito na fatura do banco diminui o total dela: desconte o valor da compra aqui.</li>
                <li>Confira também o valor de cada item, não só se ele aparece, e se algum fixo (assinatura) já foi cancelado.</li>
              </>
            ) : (
              <>
                <li>IOF, anuidade, juros ou tarifas aparecem só na fatura do banco.</li>
                <li>Confira se alguma compra ficou sem lançar ou com valor menor aqui.</li>
              </>
            )}
          </ul>
        </div>
      )}
    </Sheet>
  );
}

const CHECK_KEY = 'gestor-de-gastos:conferencia:';
function loadCheck(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    if (v && Array.isArray(v.ids)) return { ids: v.ids.filter(x => typeof x === 'string'), bank: typeof v.bank === 'string' ? v.bank : '' };
  } catch { /* sem localStorage ou valor inválido */ }
  return { ids: [], bank: '' };
}
function storeCheck(key, v) {
  try {
    if (v.ids.length === 0 && !v.bank) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(v));
  } catch { /* ignora */ }
}
