import Link from 'next/link';
import { BRAND } from '../lib/brand';

// Layout das páginas de texto (Termos de uso e Política de privacidade).
export default function LegalPage({ title, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0F1115', color: '#D7D9DE', fontFamily: "'Inter', sans-serif", padding: '2.5rem 1rem 4rem' }}>
      <style>{`
        .legal { max-width: 760px; margin: 0 auto; line-height: 1.65; font-size: 0.95rem; }
        .legal h1 { font-family: 'Fraunces', serif; color: #EDEDEF; font-size: 1.9rem; margin: 0 0 0.3rem; }
        .legal h2 { color: #EDEDEF; font-size: 1.1rem; margin: 2rem 0 0.5rem; }
        .legal a { color: #E7C765; }
        .legal ul { padding-left: 1.25rem; }
        .legal li { margin: 0.25rem 0; }
        .legal .meta { color: #6B7280; font-size: 0.85rem; margin-bottom: 2rem; }
      `}</style>
      <article className="legal">
        <p style={{ margin: '0 0 1.5rem' }}><Link href="/">← Voltar para o {BRAND.name}</Link></p>
        <h1>{title}</h1>
        <p className="meta">Última atualização: {BRAND.legalUpdatedAt}</p>
        {children}
        <p className="meta" style={{ marginTop: '2.5rem' }}>
          {BRAND.company}{BRAND.companyDocument ? ` · CNPJ ${BRAND.companyDocument}` : ''} · <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>
        </p>
      </article>
    </div>
  );
}
