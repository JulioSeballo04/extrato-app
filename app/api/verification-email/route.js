// Envia o e-mail de confirmação de cadastro com o nosso modelo, pelo Gmail,
// no lugar do e-mail padrão do Firebase. Responde 503 quando o envio não está
// configurado (faltam as variáveis na Vercel); o app então usa o do Firebase.
//   GMAIL_USER, GMAIL_APP_PASSWORD (senha de app do Google),
//   FIREBASE_SERVICE_ACCOUNT (JSON da conta de serviço), APP_URL (opcional).
import nodemailer from 'nodemailer';
import { adminReady, adminAuth, adminDb } from '../../../lib/firebaseAdmin';
import { verifyEmailMessage } from '../../../lib/emails/verifyEmail';
import { BRAND } from '../../../lib/brand';

export const runtime = 'nodejs';

const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;

// Limites por conta: evitam que alguém use o reenvio para encher a caixa de
// outra pessoa (ou faça o Gmail bloquear o remetente).
const COOLDOWN_MS = 60 * 1000;
const MAX_PER_DAY = 10;

const json = (body, status) => Response.json(body, { status });

export async function POST(request) {
  if (!adminReady || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return json({ error: 'not-configured' }, 503);
  }

  // Só a própria pessoa logada pode pedir o e-mail, e só para o e-mail dela.
  const token = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
  let user;
  try {
    user = await adminAuth().verifyIdToken(token);
  } catch {
    return json({ error: 'unauthenticated' }, 401);
  }
  if (!user.email) return json({ error: 'no-email' }, 400);
  if (user.email_verified) return json({ ok: true, alreadyVerified: true }, 200);

  // Controle de envios fica numa coleção sem acesso pelo app (as regras do
  // Firestore não liberam esse caminho; só o Admin escreve nele).
  const ref = adminDb().collection('_verificationEmails').doc(user.uid);
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const allowed = await adminDb().runTransaction(async (tx) => {
    const prev = (await tx.get(ref)).data() || {};
    const count = prev.day === today ? prev.count || 0 : 0;
    if (now - (prev.lastAt || 0) < COOLDOWN_MS || count >= MAX_PER_DAY) return false;
    tx.set(ref, { lastAt: now, day: today, count: count + 1 });
    return true;
  });
  if (!allowed) return json({ error: 'too-many-requests' }, 429);

  // Depois de confirmar, a página do Firebase mostra "Continuar", que volta ao app.
  const appUrl = process.env.APP_URL || new URL(request.url).origin;
  const link = await adminAuth().generateEmailVerificationLink(user.email, { url: `${appUrl}/` });
  const { subject, html, text } = verifyEmailMessage({ link, appUrl });

  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
  await transport.sendMail({
    from: { name: BRAND.name, address: GMAIL_USER },
    to: user.email,
    subject,
    html,
    text,
  });

  return json({ ok: true }, 200);
}
