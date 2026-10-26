// Modelo do e-mail de confirmação de cadastro. HTML de e-mail: tabelas e
// estilos inline, porque Gmail/Outlook ignoram CSS externo, flexbox e SVG.
import { BRAND } from '../brand';

const C = {
  page: '#F3F1EC', card: '#FFFFFF', dark: '#0F1115', gold: '#C9A227', goldLight: '#E7C765',
  text: '#1C1F26', dim: '#5B6170', muted: '#8A8F9C', line: '#E7E3DA',
};
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const FEATURES = [
  ['Lançamentos em segundos', 'à vista, parcelados ou fixos, por categoria.'],
  ['Faturas dos cartões', 'saiba quanto vem em cada mês antes de chegar.'],
  ['Contas compartilhadas', 'divida gastos com quem mora ou viaja com você.'],
];

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function verifyEmailMessage({ link, appUrl }) {
  const subject = `Confirme seu e-mail para começar a usar o ${BRAND.name}`;
  const href = escape(link);

  const features = FEATURES.map(([title, desc]) => `
              <tr>
                <td width="28" valign="top" style="padding:0 0 12px;font:700 15px/22px ${FONT};color:${C.gold};">✓</td>
                <td style="padding:0 0 12px;font:14px/22px ${FONT};color:${C.dim};">
                  <strong style="color:${C.text};">${title}</strong> — ${desc}
                </td>
              </tr>`).join('');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <!-- Pré-visualização na caixa de entrada (fica escondida no corpo). -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Falta só um passo: confirme seu e-mail e comece a organizar seus gastos.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Cabeçalho escuro com o ícone e o nome do app -->
          <tr>
            <td style="background:${C.dark};border-radius:16px 16px 0 0;padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:12px;">
                    <img src="${escape(appUrl)}/icons/icon-192.png" width="40" height="40" alt="" style="display:block;border:0;border-radius:10px;">
                  </td>
                  <td valign="middle" style="font:700 18px/24px ${FONT};color:#FFFFFF;">
                    ${BRAND.name}
                    <div style="font:400 12px/18px ${FONT};color:${C.goldLight};">${BRAND.tagline}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="background:${C.card};padding:36px 32px 28px;">
              <div style="font:700 24px/32px ${FONT};color:${C.text};margin:0 0 12px;">Confirme seu e-mail</div>
              <div style="font:15px/24px ${FONT};color:${C.dim};margin:0 0 28px;">
                Olá! Você acabou de criar uma conta no <strong style="color:${C.text};">${BRAND.name}</strong>.
                Para proteger seus dados, precisamos confirmar que este endereço é seu. É só um clique:
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:${C.gold};border-radius:10px;">
                    <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font:700 15px/20px ${FONT};color:${C.dark};text-decoration:none;border-radius:10px;">Confirmar meu e-mail</a>
                  </td>
                </tr>
              </table>

              <div style="border-top:1px solid ${C.line};padding-top:24px;font:700 13px/20px ${FONT};color:${C.text};letter-spacing:.3px;text-transform:uppercase;margin:0 0 14px;">
                O que te espera no app
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${features}
              </table>

              <div style="background:${C.page};border-radius:10px;padding:14px 16px;margin-top:16px;font:12px/18px ${FONT};color:${C.muted};">
                O botão não funcionou? Copie e cole este endereço no navegador:<br>
                <a href="${href}" target="_blank" style="color:${C.dim};word-break:break-all;">${href}</a>
              </div>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background:${C.card};border-top:1px solid ${C.line};border-radius:0 0 16px 16px;padding:20px 32px 24px;font:12px/18px ${FONT};color:${C.muted};">
              Não foi você que criou a conta? Pode ignorar este e-mail: sem a confirmação, ninguém consegue usar este endereço.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 16px 0;font:11px/17px ${FONT};color:${C.muted};">
              E-mail automático do ${BRAND.name} · ${BRAND.company}<br>
              Dúvidas? <a href="mailto:${BRAND.contactEmail}" style="color:${C.muted};">${BRAND.contactEmail}</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Versão em texto puro: alguns leitores mostram só ela, e ajuda contra spam.
  const text = [
    `Confirme seu e-mail — ${BRAND.name}`,
    '',
    `Olá! Você acabou de criar uma conta no ${BRAND.name}.`,
    'Para proteger seus dados, confirme que este endereço é seu abrindo o link abaixo:',
    '',
    link,
    '',
    'O que te espera no app:',
    ...FEATURES.map(([t, d]) => `- ${t}: ${d}`),
    '',
    'Não foi você que criou a conta? Pode ignorar este e-mail: sem a confirmação, ninguém consegue usar este endereço.',
    '',
    `${BRAND.name} · ${BRAND.company} · ${BRAND.contactEmail}`,
  ].join('\n');

  return { subject, html, text };
}
