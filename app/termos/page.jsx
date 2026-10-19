import Link from 'next/link';
import LegalPage from '../../components/LegalPage';
import { BRAND } from '../../lib/brand';

export const metadata = { title: `Termos de uso — ${BRAND.name}` };

// Texto-base escrito para este app. Antes de começar a cobrar, peça a revisão
// de um advogado e preencha o CNPJ em lib/brand.js.
export default function TermosPage() {
  const email = <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>;
  return (
    <LegalPage title="Termos de uso">
      <p>
        Estes termos regulam o uso do {BRAND.name}, oferecido pela <strong>{BRAND.company}</strong>
        {BRAND.companyDocument ? `, CNPJ ${BRAND.companyDocument}` : ''}. Ao criar uma conta ou usar o app, você concorda com
        eles e com a <Link href="/privacidade">Política de privacidade</Link>.
      </p>

      <h2>1. O que é o serviço</h2>
      <p>
        O {BRAND.name} é uma ferramenta para organizar gastos, cartões de crédito e contas, inclusive divididos entre várias
        pessoas em espaços compartilhados. O app não é banco, não movimenta dinheiro, não se conecta às suas contas bancárias
        e não oferece recomendação financeira, contábil ou de investimentos. Os números mostrados dependem do que você e os
        membros dos seus espaços digitam.
      </p>

      <h2>2. Sua conta</h2>
      <ul>
        <li>
          Você precisa ter 16 anos ou mais e informar um e-mail válido. Se tiver entre 16 e 18 anos, use o app com o
          conhecimento do seu responsável legal.
        </li>
        <li>Você é responsável por manter sua senha em segredo e pelo que for feito com a sua conta.</li>
        <li>Avise-nos em {email} se suspeitar de uso indevido.</li>
      </ul>

      <h2>3. Espaços compartilhados</h2>
      <ul>
        <li>Quem cria um espaço é o dono: convida pessoas, define se elas podem editar ou só visualizar, e pode removê-las.</li>
        <li>Ao convidar alguém, você autoriza essa pessoa a ver os dados daquele espaço. Só convide quem você conhece.</li>
        <li>Membros com permissão de edição podem alterar e apagar lançamentos do espaço.</li>
        <li>Se o dono excluir a conta, a administração do espaço passa para outro membro.</li>
      </ul>

      <h2>4. Uso permitido</h2>
      <p>Você concorda em não:</p>
      <ul>
        <li>usar o app para atividades ilegais ou para guardar dados de terceiros sem autorização;</li>
        <li>tentar acessar dados de outras pessoas, burlar as regras de acesso ou sobrecarregar o serviço;</li>
        <li>copiar, revender ou fazer engenharia reversa do app.</li>
      </ul>

      <h2>5. Planos e pagamento</h2>
      <p>
        O app pode ter recursos gratuitos e recursos pagos. Preço, forma de pagamento, renovação e o que cada plano inclui
        serão mostrados claramente antes de qualquer cobrança. Assinaturas podem ser canceladas a qualquer momento, valendo
        até o fim do período já pago. Nas contratações online, você pode desistir em até 7 dias da contratação, com
        reembolso integral (Código de Defesa do Consumidor, art. 49). Planos pagos só podem ser contratados por maiores
        de 18 anos ou pelo responsável legal.
      </p>

      <h2>6. Disponibilidade e backup</h2>
      <p>
        Fazemos o possível para o app ficar sempre no ar e para proteger seus dados, mas podem ocorrer interrupções para
        manutenção ou por falhas de terceiros. Recomendamos baixar seus dados de tempos em tempos (em <em>Conta → Baixar seus dados</em>).
      </p>

      <h2>7. Responsabilidade</h2>
      <p>
        Decisões financeiras tomadas com base nas informações do app são de responsabilidade de quem as toma. Na medida
        permitida pela lei, não respondemos por prejuízos indiretos causados por dados digitados incorretamente, por
        membros dos seus espaços ou por indisponibilidades temporárias. Nada nestes termos limita os direitos que o Código
        de Defesa do Consumidor garante a você.
      </p>

      <h2>8. Encerramento</h2>
      <p>
        Você pode excluir sua conta quando quiser, pelo próprio app. Podemos suspender contas que violem estes termos, com
        aviso prévio sempre que possível.
      </p>

      <h2>9. Mudanças nos termos</h2>
      <p>
        Se mudarmos algo relevante, avisaremos no app com antecedência. Continuar usando depois da mudança significa que você
        concorda com a nova versão.
      </p>

      <h2>10. Lei e foro</h2>
      <p>
        Estes termos seguem as leis do Brasil. Eventuais conflitos podem ser resolvidos no foro do seu domicílio, como prevê o
        Código de Defesa do Consumidor. Antes disso, fale com a gente em {email} — quase tudo se resolve por lá.
      </p>
    </LegalPage>
  );
}
