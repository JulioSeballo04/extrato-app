import LegalPage from '../../components/LegalPage';
import { BRAND } from '../../lib/brand';

export const metadata = { title: `Política de privacidade — ${BRAND.name}` };

// Texto-base escrito para este app. Antes de começar a cobrar, peça a revisão
// de um advogado e preencha o CNPJ em lib/brand.js.
export default function PrivacidadePage() {
  const email = <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>;
  return (
    <LegalPage title="Política de privacidade">
      <p>
        Esta política explica quais dados o {BRAND.name} coleta, para que usa e quais são os seus direitos, de acordo com a
        Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
      </p>

      <h2>1. Quem é o responsável pelos seus dados</h2>
      <p>
        O controlador dos dados é a <strong>{BRAND.company}</strong>{BRAND.companyDocument ? `, CNPJ ${BRAND.companyDocument}` : ''}.
        Para qualquer assunto sobre privacidade, inclusive para falar com o encarregado de dados, escreva para {email}.
      </p>

      <h2>2. Quais dados coletamos</h2>
      <ul>
        <li><strong>Dados da conta:</strong> e-mail, nome (quando você entra com o Google, também a foto e o identificador da conta Google) e a data de criação da conta.</li>
        <li><strong>Dados que você cadastra:</strong> nomes das pessoas com quem divide as contas, salários informados, cartões (nome, limite, dia de vencimento e cor), lançamentos, categorias, parcelas e o que já foi pago.</li>
        <li><strong>Dados de espaços compartilhados:</strong> quem participa de cada espaço, o papel de cada pessoa e os convites gerados.</li>
        <li><strong>Preferências:</strong> paleta de cores e espaço aberto por último. Algumas preferências (como as seções visíveis) ficam só no seu aparelho.</li>
        <li><strong>Dados técnicos:</strong> registros de acesso e de erros gerados automaticamente pelos nossos fornecedores de infraestrutura (como endereço IP, data e hora e tipo de navegador).</li>
      </ul>
      <p>
        Não pedimos senhas de banco, números de cartão, CPF ou dados de pagamento para usar o app. Os “cartões” cadastrados
        são apenas nomes e valores digitados por você para organizar os gastos.
      </p>

      <h2>3. Para que usamos os dados</h2>
      <ul>
        <li>Criar e manter sua conta e permitir o login (base legal: execução de contrato, art. 7º, V).</li>
        <li>Guardar, calcular e mostrar seus gastos, e compartilhá-los com quem você convidar para um espaço (execução de contrato).</li>
        <li>Enviar e-mails necessários ao serviço, como confirmação de cadastro e redefinição de senha (execução de contrato).</li>
        <li>Manter a segurança, evitar abusos e corrigir erros (legítimo interesse, art. 7º, IX).</li>
        <li>Cumprir obrigações legais, quando houver (art. 7º, II).</li>
      </ul>
      <p>Não vendemos seus dados e não os usamos para publicidade.</p>

      <h2>4. Com quem compartilhamos</h2>
      <ul>
        <li><strong>Pessoas dos seus espaços:</strong> quem você convida vê e, se tiver permissão, edita os dados daquele espaço.</li>
        <li><strong>Google (Firebase):</strong> autenticação e banco de dados. O banco de dados fica em servidores no Brasil (São Paulo).</li>
        <li><strong>Vercel:</strong> hospedagem do site.</li>
        <li><strong>Autoridades:</strong> somente quando exigido por lei ou ordem judicial.</li>
      </ul>
      <p>
        O login e a hospedagem podem processar dados fora do Brasil (por exemplo, nos Estados Unidos). Essas transferências
        acontecem com fornecedores que adotam cláusulas contratuais e medidas de segurança compatíveis com a LGPD (art. 33).
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <p>
        Enquanto sua conta existir. Ao excluir a conta pelo próprio app (em <em>Conta → Excluir minha conta</em>), apagamos seus
        dados pessoais e os espaços que só você usa. Em espaços compartilhados que você criou, a administração passa para outro
        membro, porque os gastos também pertencem a ele. Cópias de segurança e registros técnicos podem levar até 90 dias para
        serem eliminados, salvo obrigação legal de guarda.
      </p>

      <h2>6. Seus direitos</h2>
      <p>Pela LGPD (art. 18), você pode, a qualquer momento:</p>
      <ul>
        <li>confirmar se tratamos seus dados e acessá-los;</li>
        <li>corrigir dados incompletos ou desatualizados (a maior parte você edita no próprio app);</li>
        <li>pedir a portabilidade — em <em>Conta → Baixar seus dados</em> você baixa a planilha dos lançamentos de cada espaço; para receber todos os seus dados de uma vez, escreva para {email};</li>
        <li>pedir a eliminação — em <em>Conta → Excluir minha conta</em>;</li>
        <li>saber com quem compartilhamos seus dados e revogar consentimentos, quando aplicável;</li>
        <li>reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</li>
      </ul>
      <p>Para pedidos que não estejam no app, escreva para {email}. Respondemos em até 15 dias.</p>

      <h2>7. Segurança</h2>
      <p>
        Os dados trafegam com criptografia (HTTPS) e ficam em infraestrutura do Google com criptografia em repouso. Regras de
        acesso garantem que só os membros de um espaço leiam os dados dele. Nenhum sistema é totalmente imune a falhas; se
        ocorrer um incidente que traga risco relevante, avisaremos você e a ANPD conforme a lei.
      </p>

      <h2>8. Cookies e armazenamento local</h2>
      <p>
        Usamos apenas o armazenamento necessário para manter você conectado e lembrar preferências neste aparelho. Não usamos
        cookies de publicidade nem de rastreamento de terceiros.
      </p>

      <h2>9. Crianças e adolescentes</h2>
      <p>
        O app pode ser usado a partir dos 16 anos. Entre 16 e 18 anos, o uso deve ser feito com o conhecimento do responsável
        legal, e os dados são tratados no melhor interesse do adolescente (LGPD, art. 14). Não é destinado a menores de 16
        anos; se soubermos de uma conta assim, ela será excluída. Responsáveis podem pedir acesso ou exclusão pelo e-mail
        acima.
      </p>

      <h2>10. Mudanças nesta política</h2>
      <p>
        Se mudarmos algo relevante, avisaremos no app antes de a mudança valer. A data no topo indica a versão atual.
      </p>
    </LegalPage>
  );
}
