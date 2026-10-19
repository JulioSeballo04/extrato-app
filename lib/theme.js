// Paletas do app: cada opção é um esquema de cores completo (fundo, painéis, bordas,
// textos, cor de destaque, cores semânticas, cores por pessoa e gradientes de cartão),
// não só uma cor de destaque isolada. Trocar a paleta muda a aparência inteira do app.
// `textMuted` e `textDim` têm contraste de pelo menos 4,5:1 com todos os fundos.
export const PALETTES = {
  gold: {
    label: 'Dourado', scheme: 'dark',
    bg: '#0F1115', panel: '#171A21', panelAlt: '#1B1F27', border: '#22262F', borderStrong: '#2A2F3A', inputBg: '#1F232C',
    text: '#EDEDEF', textDim: '#9BA1AE', textMuted: '#858C9A',
    accent: '#C9A227', accentLight: '#E7C765', onAccent: '#0F1115',
    success: '#4F9D6E', successBg: '#1E2E2A', danger: '#D9644A', dangerBg: '#2E211B', info: '#5B8DBE',
    people: ['#C9A227', '#5B8DBE', '#8A6FBF', '#4F9D6E', '#C1543C', '#3FA7A0'],
    cardGradients: [['#1B2138', '#3A4A78'], ['#3B2A1E', '#8A6136'], ['#1E2E2A', '#2F6E5C'], ['#2A1E2E', '#6E3F8A']],
  },
  blue: {
    label: 'Azul', scheme: 'dark',
    bg: '#0B1220', panel: '#121B2E', panelAlt: '#16213A', border: '#1E2A42', borderStrong: '#293A57', inputBg: '#17233A',
    text: '#E7ECF5', textDim: '#93A1BB', textMuted: '#7E8CA7',
    accent: '#3E7CC9', accentLight: '#7FB0E7', onAccent: '#0B1220',
    success: '#3FA76E', successBg: '#12281F', danger: '#E0675A', dangerBg: '#301B16', info: '#6FA8DC',
    people: ['#3E7CC9', '#7FB0E7', '#3FA76E', '#C9A227', '#D1594B', '#8A6FBF'],
    cardGradients: [['#0F2148', '#22417F'], ['#152C1F', '#1F5C3B'], ['#241636', '#4A2C74'], ['#2E1A12', '#7A3E1D']],
  },
  green: {
    label: 'Verde', scheme: 'dark',
    bg: '#0D1410', panel: '#141F19', panelAlt: '#182821', border: '#20342A', borderStrong: '#2B4438', inputBg: '#182720',
    text: '#E8F0EA', textDim: '#8FA89A', textMuted: '#7E9286',
    accent: '#3E9D6E', accentLight: '#78CBA1', onAccent: '#0D1410',
    success: '#4FBE7F', successBg: '#153524', danger: '#D9644A', dangerBg: '#2E2116', info: '#5B9DBE',
    people: ['#3E9D6E', '#C9A227', '#5B9DBE', '#8A6FBF', '#C1543C', '#78CBA1'],
    cardGradients: [['#122A20', '#1E6146'], ['#2A2110', '#78652B'], ['#141F30', '#33547F'], ['#241633', '#5A3673']],
  },
  purple: {
    label: 'Roxo', scheme: 'dark',
    bg: '#130F1B', panel: '#1C1628', panelAlt: '#221B31', border: '#2E2540', borderStrong: '#3D3054', inputBg: '#221A30',
    text: '#EDE8F5', textDim: '#A398BA', textMuted: '#8D81AB',
    accent: '#8A6FBF', accentLight: '#B79DE6', onAccent: '#130F1B',
    success: '#4F9D6E', successBg: '#1B2E22', danger: '#D9644A', dangerBg: '#301F1B', info: '#6F8FD6',
    people: ['#8A6FBF', '#C9607F', '#3E9D6E', '#C9A227', '#6F8FD6', '#B79DE6'],
    cardGradients: [['#241633', '#5A3673'], ['#301B2E', '#7A3E6E'], ['#151A33', '#39468C'], ['#20180F', '#6E4A1E']],
  },
  rose: {
    label: 'Rosé', scheme: 'dark',
    bg: '#170F12', panel: '#221518', panelAlt: '#291A1E', border: '#3A2429', borderStrong: '#4B2E35', inputBg: '#291A1E',
    text: '#F5E9EC', textDim: '#BA96A0', textMuted: '#A37F88',
    accent: '#C9607F', accentLight: '#E79FB4', onAccent: '#170F12',
    success: '#4F9D6E', successBg: '#1B2E22', danger: '#E0675A', dangerBg: '#301B1B', info: '#8A6FBF',
    people: ['#C9607F', '#C9A227', '#8A6FBF', '#4F9D6E', '#5B8DBE', '#E79FB4'],
    cardGradients: [['#301B2E', '#7A3E6E'], ['#3B2A1E', '#8A6136'], ['#1E2E2A', '#2F6E5C'], ['#241636', '#4A2C74']],
  },
  light: {
    label: 'Claro', scheme: 'light',
    bg: '#F5F3EE', panel: '#FFFFFF', panelAlt: '#F8F6F1', border: '#E6E2D8', borderStrong: '#D3CEC2', inputBg: '#FFFFFF',
    text: '#1C1E23', textDim: '#4D525C', textMuted: '#6A6E77',
    accent: '#8A6B0C', accentLight: '#8A6B0C', onAccent: '#FFFFFF',
    success: '#2E7D4F', successBg: '#E3F1E8', danger: '#B4432C', dangerBg: '#F8E4DE', info: '#3A6EA5',
    people: ['#B08A1A', '#3A6EA5', '#7656B0', '#2E7D4F', '#B4432C', '#1F8A84'],
    cardGradients: [['#1B2138', '#3A4A78'], ['#3B2A1E', '#8A6136'], ['#1E2E2A', '#2F6E5C'], ['#2A1E2E', '#6E3F8A']],
  },
};
export const DEFAULT_PALETTE = 'gold';
// "Automático": claro ou escuro (Dourado) conforme o aparelho.
export const AUTO_PALETTE = 'auto';

export function resolvePaletteKey(key, systemDark) {
  if (key === AUTO_PALETTE) return systemDark ? DEFAULT_PALETTE : 'light';
  return PALETTES[key] ? key : DEFAULT_PALETTE;
}

// Última paleta usada, guardada no aparelho: as telas de carregamento (antes de
// o perfil chegar do Firestore) já aparecem na cor certa.
const PALETTE_CACHE_KEY = 'gestor-de-gastos:paleta';
export function readCachedPalette() {
  try {
    const key = localStorage.getItem(PALETTE_CACHE_KEY);
    if (key === AUTO_PALETTE) return PALETTES[resolvePaletteKey(key, systemPrefersDark())];
    return PALETTES[key] || PALETTES[DEFAULT_PALETTE];
  } catch {
    return PALETTES[DEFAULT_PALETTE];
  }
}
export function writeCachedPalette(key) {
  try { localStorage.setItem(PALETTE_CACHE_KEY, key); } catch { /* ignora */ }
}
export function systemPrefersDark() {
  return typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Variáveis CSS de uma paleta, para o `style` do elemento raiz.
export function paletteVars(pal) {
  return {
    colorScheme: pal.scheme,
    '--bg': pal.bg, '--panel': pal.panel, '--panel-alt': pal.panelAlt, '--border': pal.border, '--border-strong': pal.borderStrong, '--input-bg': pal.inputBg,
    '--text': pal.text, '--text-dim': pal.textDim, '--text-muted': pal.textMuted,
    '--accent': pal.accent, '--accent-light': pal.accentLight, '--on-accent': pal.onAccent,
    '--success': pal.success, '--success-bg': pal.successBg, '--danger': pal.danger, '--danger-bg': pal.dangerBg, '--info': pal.info,
    '--picker-filter': pal.scheme === 'dark' ? 'invert(0.8)' : 'none',
  };
}

// Cores livres para o cartão (sem nomes, logos ou cores de marca de bancos).
// O usuário escolhe a cor e digita o nome que quiser no cartão.
export const CARD_COLORS = {
  roxo: { label: 'Roxo', gradient: ['#7B2FBE', '#46157A'] },
  vermelho: { label: 'Vermelho', gradient: ['#D23B3B', '#7A1414'] },
  laranja: { label: 'Laranja', gradient: ['#E8710A', '#8A3D00'] },
  dourado: { label: 'Dourado', gradient: ['#C9A227', '#6E5410'] },
  verde: { label: 'Verde', gradient: ['#2E9D5B', '#14532D'] },
  ciano: { label: 'Ciano', gradient: ['#0EA5C6', '#0B5670'] },
  azul: { label: 'Azul', gradient: ['#2F6FD9', '#0F3A8A'] },
  marinho: { label: 'Marinho', gradient: ['#1D4A75', '#0B2240'] },
  rosa: { label: 'Rosa', gradient: ['#D94A86', '#7D1D4A'] },
  grafite: { label: 'Grafite', gradient: ['#4A505C', '#1E2128'] },
};
// Cartões criados antes guardavam o banco (`bank`); viram a cor mais próxima.
const LEGACY_BANK_COLORS = { nubank: 'roxo', santander: 'vermelho', itau: 'laranja', mercadopago: 'ciano', portoseguro: 'marinho' };
// "auto" = cor automática escolhida pela paleta do app.
export function cardColorKey(card) {
  if (card.color === 'auto') return '';
  return CARD_COLORS[card.color] ? card.color : LEGACY_BANK_COLORS[card.bank] || '';
}
