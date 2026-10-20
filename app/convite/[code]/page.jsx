'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { savePendingInvite } from '../../../lib/invite';

// Link de convite: guarda o código e segue para o app. Se a pessoa não estiver
// logada, o app manda para o login, que avisa do convite; depois de entrar (ou
// criar a conta), o app usa o código sozinho.
export default function ConvitePage() {
  const { code } = useParams();
  const router = useRouter();

  useEffect(() => {
    savePendingInvite(code);
    router.replace('/');
  }, [code, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9BA1AE', fontFamily: 'Inter, sans-serif' }}>
      Abrindo o convite…
    </div>
  );
}
