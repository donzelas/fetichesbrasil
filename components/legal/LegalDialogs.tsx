/* eslint-disable react/no-unescaped-entities */
"use client";

import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const LAST_UPDATED = "06/05/2026";

interface LegalTriggerProps {
  children: ReactNode;
  className?: string;
}

export function PrivacyPolicyTrigger({ children, className }: LegalTriggerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={className ?? "hover:text-foreground"}>
          {children}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl">Política de Privacidade</DialogTitle>
          <DialogDescription>
            Última atualização: {LAST_UPDATED}. Plataforma destinada exclusivamente a maiores de
            18 anos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            Esta Política descreve como o <strong>Fetiches Brasil</strong> ("nós", "plataforma" ou
            "serviço") coleta, usa, armazena, compartilha e protege os dados pessoais dos seus
            usuários. Está em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº
            13.709/2018 — "LGPD"), o Marco Civil da Internet (Lei nº 12.965/2014) e a Constituição
            Federal.
          </p>

          <Section title="1. Quem somos">
            <p>
              O Fetiches Brasil é uma plataforma online destinada exclusivamente a adultos
              (maiores de 18 anos) interessados em conhecer outros adultos com interesses sexuais
              em comum. O conteúdo é, por natureza, de cunho adulto, sexual e explícito, gerado
              pelos próprios usuários em conversas privadas e em salas temáticas.
            </p>
            <p>
              Para exercer seus direitos como titular ou para qualquer dúvida sobre seus dados,
              entre em contato pelo e-mail <strong>contato@fetichesbrasil.com.br</strong>.
            </p>
          </Section>

          <Section title="2. Idade mínima — 18 anos">
            <p>
              <strong>O acesso à plataforma é estritamente proibido a menores de 18 anos.</strong>{" "}
              Ao se cadastrar, o usuário declara, sob as penas da lei, ter 18 anos completos ou
              mais. Caso identifiquemos qualquer suspeita de cadastro por menor, a conta será
              imediatamente bloqueada e os dados poderão ser preservados para fins de
              cumprimento de obrigação legal e cooperação com as autoridades.
            </p>
          </Section>

          <Section title="3. Quais dados coletamos">
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Cadastro</strong>: e-mail, nome de usuário, nome de exibição, senha
                (criptografada).
              </li>
              <li>
                <strong>Perfil</strong>: foto de avatar (opcional), bio, status premium.
              </li>
              <li>
                <strong>Conteúdo gerado pelo usuário</strong>: mensagens em salas, mensagens
                diretas (DMs), imagens enviadas em DM, denúncias e relatos.
              </li>
              <li>
                <strong>Dados técnicos</strong>: endereço IP, identificadores de dispositivo,
                user-agent, timestamps de acesso e de envio (registros mantidos por, no mínimo,
                6 meses, conforme art. 15 do Marco Civil).
              </li>
              <li>
                <strong>Pagamentos</strong>: caso assine o plano Premium, o processamento é feito
                por gateway terceirizado. Não armazenamos dados completos de cartão; apenas
                identificadores da transação.
              </li>
            </ul>
          </Section>

          <Section title="4. Bases legais e finalidades">
            <p>Tratamos seus dados com base em uma ou mais hipóteses do art. 7º da LGPD:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Execução de contrato</strong> (art. 7º, V): para criar e operar sua
                conta, viabilizar conversas, autenticação e pagamentos.
              </li>
              <li>
                <strong>Cumprimento de obrigação legal</strong> (art. 7º, II): retenção de
                registros de acesso e cooperação com ordens judiciais.
              </li>
              <li>
                <strong>Legítimo interesse</strong> (art. 7º, IX): segurança, prevenção a fraude,
                investigação de denúncias e moderação.
              </li>
              <li>
                <strong>Consentimento</strong> (art. 7º, I): comunicações de marketing e cookies
                opcionais (quando houver).
              </li>
            </ul>
          </Section>

          <Section title="5. Mensagens, imagens e DMs">
            <p>
              As mensagens diretas (DMs) podem incluir imagens. Por padrão, imagens em DM
              entre usuários comuns têm <strong>autodestruição automática em 5 (cinco) minutos</strong>;
              após esse prazo, a URL fica inacessível ao usuário.
            </p>
            <p>
              <strong>Atenção</strong>: nós, enquanto operadores e moderadores da plataforma,
              mantemos cópia das mensagens e imagens (mesmo após a expiração) por prazo
              proporcional ao necessário para: (i) cumprimento de obrigação legal, (ii)
              investigação de denúncias, (iii) cooperação com autoridades e (iv) defesa em
              processos administrativos ou judiciais. Esse acesso é restrito à equipe
              administrativa autorizada.
            </p>
            <p>
              Tudo que você envia voluntariamente em DMs ou em salas é armazenado em servidores
              criptografados em trânsito (HTTPS/TLS) e com acesso restrito por políticas de
              segurança em nível de banco (RLS).
            </p>
          </Section>

          <Section title="6. Compartilhamento com terceiros">
            <p>Não vendemos, alugamos ou cedemos seus dados pessoais. Compartilhamos apenas com:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Operadores de infraestrutura</strong> (hospedagem, banco de dados,
                armazenamento de imagens, e-mail transacional), sob contrato e com fins
                exclusivamente operacionais.
              </li>
              <li>
                <strong>Gateways de pagamento</strong>, para processar assinaturas Premium.
              </li>
              <li>
                <strong>Autoridades competentes</strong>, mediante ordem judicial, requisição
                legítima de órgãos de persecução penal ou para preservar direitos alheios em
                casos de exploração sexual infantil ou crime grave.
              </li>
            </ul>
          </Section>

          <Section title="7. Transferência internacional">
            <p>
              A plataforma utiliza serviços que podem armazenar dados em servidores localizados
              fora do Brasil (por exemplo, Estados Unidos). Garantimos que tais transferências
              ocorrem com fornecedores que adotam padrões de segurança equivalentes ou superiores
              aos exigidos pela LGPD (art. 33).
            </p>
          </Section>

          <Section title="8. Retenção e descarte">
            <ul className="ml-5 list-disc space-y-1">
              <li>
                Dados de cadastro: enquanto sua conta estiver ativa.
              </li>
              <li>
                Logs de acesso (IP, timestamp): mínimo de 6 meses (art. 15 do Marco Civil) e até
                5 anos para fins de defesa em juízo.
              </li>
              <li>
                Mensagens e imagens denunciadas ou em investigação: até trânsito em julgado de
                eventual processo, ou conforme determinação judicial.
              </li>
              <li>
                Após exclusão da conta, removemos dados pessoais identificáveis, exceto aqueles
                cuja retenção seja obrigatória por lei.
              </li>
            </ul>
          </Section>

          <Section title="9. Seus direitos como titular (art. 18 da LGPD)">
            <ul className="ml-5 list-disc space-y-1">
              <li>Confirmação da existência de tratamento;</li>
              <li>Acesso aos dados;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>
                Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou
                tratados em desconformidade com a LGPD;
              </li>
              <li>Portabilidade;</li>
              <li>
                Eliminação dos dados pessoais tratados com consentimento (ressalvadas as
                hipóteses de retenção obrigatória);
              </li>
              <li>
                Informação sobre entidades públicas e privadas com as quais compartilhamos seus
                dados;
              </li>
              <li>Revogação do consentimento.</li>
            </ul>
            <p>
              Para exercer qualquer um desses direitos, escreva para{" "}
              <strong>contato@fetichesbrasil.com.br</strong>. Responderemos no prazo de até 15
              dias.
            </p>
          </Section>

          <Section title="10. Cookies e tecnologias semelhantes">
            <p>
              Utilizamos cookies estritamente necessários para autenticação e funcionamento da
              plataforma (sessão, preferências). Não utilizamos cookies de rastreamento de
              terceiros para publicidade.
            </p>
          </Section>

          <Section title="11. Segurança">
            <p>
              Adotamos medidas técnicas e administrativas razoáveis para proteger seus dados,
              incluindo criptografia em trânsito, controle de acesso por nível de banco (RLS),
              hashing de senhas e segregação de ambiente administrativo. Ainda assim, nenhuma
              transmissão pela internet é 100% segura — em caso de incidente, notificaremos os
              titulares e a ANPD nos prazos legais.
              </p>
          </Section>

          <Section title="12. Alterações desta Política">
            <p>
              Podemos atualizar esta Política a qualquer momento. A versão vigente estará sempre
              acessível no rodapé da plataforma, com a data da última atualização. Mudanças
              materiais serão comunicadas por e-mail ou aviso destacado na plataforma.
            </p>
          </Section>

          <Section title="13. Contato">
            <p>
              <strong>E-mail do Encarregado (DPO):</strong>{" "}
              contato@fetichesbrasil.com.br
            </p>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TermsOfUseTrigger({ children, className }: LegalTriggerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={className ?? "hover:text-foreground"}>
          {children}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl">Termos de Uso</DialogTitle>
          <DialogDescription>
            Última atualização: {LAST_UPDATED}. Leia com atenção antes de criar sua conta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <Highlight>
            AVISO IMPORTANTE — Esta plataforma contém conteúdo de natureza adulta, sensual e
            sexualmente explícita, gerado por seus usuários. O acesso é estritamente proibido a
            menores de 18 anos. Ao continuar, você declara, sob as penas da lei, ser maior de 18
            anos completos e estar acessando voluntariamente, em local e horário em que esse
            tipo de conteúdo é permitido.
          </Highlight>

          <Section title="1. Aceitação dos Termos">
            <p>
              Estes Termos de Uso constituem um contrato vinculante entre você ("usuário") e o
              <strong> Fetiches Brasil</strong> ("plataforma"). Ao se cadastrar, acessar ou
              utilizar qualquer recurso, você concorda integralmente com este documento e com a
              nossa Política de Privacidade. Se discordar de qualquer ponto, encerre o uso
              imediatamente.
            </p>
          </Section>

          <Section title="2. Natureza da plataforma">
            <p>
              O Fetiches Brasil é uma <strong>plataforma de comunicação entre adultos</strong>{" "}
              que oferece salas temáticas, chats em grupo e mensagens diretas. Não somos
              produtores nem editores do conteúdo gerado pelos usuários — apenas hospedamos e
              moderamos. Atuamos como provedor de aplicação nos termos do art. 19 do Marco Civil
              da Internet.
            </p>
          </Section>

          <Section title="3. Idade mínima e capacidade civil">
            <p>
              <strong>Você declara, irrevogavelmente, ter 18 anos completos ou mais</strong>,
              estar em pleno gozo da capacidade civil (art. 5º do Código Civil) e que o acesso a
              conteúdo adulto explícito é legalmente permitido na sua jurisdição. Falsidade
              sobre idade configura crime do art. 299 do Código Penal e cancelamento imediato da
              conta, sem prejuízo de comunicação às autoridades.
            </p>
          </Section>

          <Section title="4. Conteúdo proibido (lista não exaustiva)">
            <p>
              É <strong>terminantemente proibido</strong> publicar, enviar, solicitar, divulgar
              ou compartilhar, em qualquer espaço da plataforma:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Qualquer conteúdo envolvendo menores de 18 anos</strong>, real ou
                simulado, em contexto sexual, sensual ou de nudez (arts. 240 e 241-A do ECA).
                Esse tipo de material será imediatamente preservado e reportado à Polícia Federal
                e ao SaferNet Brasil.
              </li>
              <li>Estupro, violência sexual real ou apologia;</li>
              <li>Zoofilia ou conteúdo envolvendo animais em contexto sexual;</li>
              <li>Necrofilia;</li>
              <li>
                Conteúdo sem consentimento da pessoa retratada (revenge porn, "nudes" vazados,
                deepfakes pornográficos não consensuais — Lei nº 13.718/2018, art. 218-C do CP);
              </li>
              <li>
                Tráfico de pessoas, exploração sexual, prostituição infantil, aliciamento ou
                recrutamento;
              </li>
              <li>Discurso de ódio, racismo, homofobia, transfobia, misoginia (Lei nº 7.716/89);</li>
              <li>Apologia ao crime, tortura, terrorismo ou drogas ilícitas;</li>
              <li>
                Conteúdo de outros usuários sem autorização (printar e divulgar DMs, dados
                pessoais, doxxing);
              </li>
              <li>Spam, golpes, pirâmides financeiras, phishing;</li>
              <li>Anúncios comerciais não autorizados, prostituição comercializada;</li>
              <li>Malware, links maliciosos, exploração de vulnerabilidades;</li>
              <li>Violação de direitos autorais, marcas ou imagens de terceiros.</li>
            </ul>
            <p>
              Qualquer violação resulta em <strong>banimento imediato e definitivo</strong>,
              preservação dos dados para fins legais e, conforme o caso, comunicação às
              autoridades competentes.
            </p>
          </Section>

          <Section title="5. Responsabilidade do usuário pelo conteúdo">
            <p>
              <strong>
                Você é única e exclusivamente responsável por todo conteúdo que produzir,
                enviar, publicar ou compartilhar na plataforma
              </strong>
              , inclusive em DMs e salas. Ao publicar, você declara e garante que:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Tem todos os direitos sobre o conteúdo (autoria ou licença);</li>
              <li>
                Tem o consentimento livre, informado e específico de qualquer pessoa retratada;
              </li>
              <li>O conteúdo não viola lei, moral, bons costumes ou direito de terceiros;</li>
              <li>O conteúdo não envolve menores em qualquer contexto sexualizado.</li>
            </ul>
            <p>
              A plataforma <strong>não revisa previamente</strong> todo o conteúdo postado, mas
              reserva-se o direito de remover, sem aviso, qualquer material que viole estes
              Termos ou a legislação brasileira.
            </p>
          </Section>

          <Section title="6. Licença sobre o conteúdo enviado">
            <p>
              Ao enviar conteúdo (textos, imagens, áudios) à plataforma, você nos concede uma
              licença <strong>não exclusiva, gratuita, mundial e transferível</strong> para
              armazenar, exibir, hospedar e moderar esse conteúdo dentro da plataforma, pelo
              tempo estritamente necessário à prestação do serviço e ao cumprimento de
              obrigações legais. Essa licença não nos confere propriedade sobre o material e não
              permite uso publicitário sem seu consentimento.
            </p>
          </Section>

          <Section title="7. Consentimento explícito ao conteúdo adulto">
            <p>
              Você reconhece e aceita expressamente que:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                A plataforma exibe conteúdo de natureza pornográfica, fetichista, BDSM e
                práticas sexuais explícitas entre adultos consensuais;
              </li>
              <li>
                Esse conteúdo pode ofender, chocar ou contrariar suas crenças ou valores
                pessoais — ainda assim, você acessa por sua livre e espontânea vontade;
              </li>
              <li>
                A plataforma não se responsabiliza por reações emocionais, físicas ou jurídicas
                decorrentes da sua exposição voluntária a esse material.
              </li>
            </ul>
          </Section>

          <Section title="8. Conta, segurança e suspensão">
            <ul className="ml-5 list-disc space-y-1">
              <li>Você é responsável por manter a confidencialidade da sua senha;</li>
              <li>É proibido criar mais de uma conta ou usar conta de terceiro;</li>
              <li>É proibido o uso de robôs, scrapers ou automatizações;</li>
              <li>
                Reservamo-nos o direito de <strong>suspender ou banir</strong> qualquer conta, a
                qualquer tempo, com ou sem aviso prévio, em caso de violação destes Termos, da
                Política de Privacidade ou da legislação;
              </li>
              <li>
                Em caso de banimento, valores pagos a título de assinatura Premium não serão
                reembolsados, salvo previsão expressa em lei.
              </li>
            </ul>
          </Section>

          <Section title="9. Plano Premium, assinatura e cancelamento">
            <ul className="ml-5 list-disc space-y-1">
              <li>
                A assinatura Premium dá acesso a recursos adicionais (ex.: criar salas, mensagens
                ilimitadas, acesso a salas exclusivas);
              </li>
              <li>
                A cobrança é processada via gateway de pagamento e poderá ser recorrente; o
                cancelamento é feito pelo próprio usuário, a qualquer tempo, no painel da conta;
              </li>
              <li>
                <strong>Direito de arrependimento</strong>: nos termos do art. 49 do CDC, em
                contratações realizadas fora do estabelecimento comercial, o usuário tem 7 (sete)
                dias para desistir e solicitar reembolso integral — exceto se já tiver feito uso
                substancial dos benefícios premium;
              </li>
              <li>
                Após o prazo legal, não há reembolso por períodos não utilizados, salvo
                determinação judicial.
              </li>
            </ul>
          </Section>

          <Section title="10. Denúncias e moderação">
            <p>
              Qualquer usuário pode denunciar conteúdo inadequado pela funcionalidade
              "Denunciar" presente na lista de usuários online. Denúncias são analisadas pela
              equipe administrativa, que poderá remover conteúdo, advertir, suspender ou banir
              o usuário envolvido. Denúncias falsas ou de má-fé também são puníveis.
            </p>
            <p>
              Nos termos do art. 19 do Marco Civil, a remoção de conteúdo gerado por terceiros
              ocorrerá após ordem judicial específica, ressalvadas as hipóteses do art. 21
              (nudez não consensual) e crimes contra crianças e adolescentes, que serão removidos
              imediatamente após notificação.
            </p>
          </Section>

          <Section title="11. Limitação de responsabilidade">
            <p>
              Na máxima extensão permitida pela lei brasileira, o Fetiches Brasil <strong>
              NÃO se responsabiliza</strong> por:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Conteúdo gerado por outros usuários;</li>
              <li>Encontros, relacionamentos ou consequências decorrentes de contatos feitos via plataforma;</li>
              <li>Danos morais, materiais, lucros cessantes, perda de chance ou dano indireto;</li>
              <li>
                Doenças sexualmente transmissíveis, gravidez indesejada, agressões físicas ou
                psicológicas resultantes de encontros presenciais;
              </li>
              <li>Indisponibilidade temporária do serviço, perda de dados ou falhas técnicas;</li>
              <li>Vazamento ou exposição decorrente de ato voluntário do próprio usuário.</li>
            </ul>
            <p>
              A plataforma é fornecida no estado em que se encontra (<em>"as is"</em>), sem
              garantias implícitas de adequação a qualquer finalidade específica.
            </p>
          </Section>

          <Section title="12. Indenização (hold harmless)">
            <p>
              Você concorda em <strong>indenizar e isentar</strong> o Fetiches Brasil, seus
              sócios, administradores, prestadores de serviço e parceiros de qualquer
              reivindicação, perda, dano, custo, despesa ou ação judicial — incluindo honorários
              advocatícios e custas processuais — decorrente de:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Conteúdo que você publicou ou compartilhou;</li>
              <li>Violação destes Termos ou de qualquer lei;</li>
              <li>Violação de direitos de terceiros;</li>
              <li>Uso indevido da plataforma.</li>
            </ul>
          </Section>

          <Section title="13. Propriedade intelectual da plataforma">
            <p>
              O nome, logotipo, design, código-fonte, layout, marca e demais elementos de
              identidade visual do Fetiches Brasil são de propriedade exclusiva da plataforma,
              protegidos pela Lei nº 9.610/98 (direitos autorais) e pela Lei nº 9.279/96
              (propriedade industrial). É vedada qualquer cópia, distribuição ou uso comercial
              sem autorização prévia e por escrito.
            </p>
          </Section>

          <Section title="14. Alterações dos Termos">
            <p>
              Podemos modificar estes Termos a qualquer momento. Alterações materiais serão
              comunicadas com pelo menos 7 dias de antecedência. O uso continuado da plataforma
              após a vigência das alterações implica aceitação tácita.
            </p>
          </Section>

          <Section title="15. Foro, lei aplicável e resolução de conflitos">
            <p>
              Este contrato é regido pelas leis da República Federativa do Brasil. Eventuais
              controvérsias serão resolvidas, preferencialmente, por meio de tentativa de
              acordo direto pelo e-mail{" "}
              <strong>contato@fetichesbrasil.com.br</strong>. Não havendo composição, fica eleito
              o <strong>foro da comarca da Capital do Estado de São Paulo</strong>, com renúncia
              expressa a qualquer outro, por mais privilegiado que seja.
            </p>
          </Section>

          <Section title="16. Disposições finais">
            <ul className="ml-5 list-disc space-y-1">
              <li>
                A nulidade de qualquer cláusula não afetará as demais, que permanecerão em pleno
                vigor;
              </li>
              <li>A tolerância eventual com descumprimento não significa novação ou renúncia;</li>
              <li>
                Estes Termos representam o acordo integral entre as partes sobre o objeto, salvo
                avenças escritas em contrário.
              </li>
            </ul>
          </Section>

          <p className="rounded-md border border-border/50 bg-card/40 p-3 text-xs">
            Ao clicar em "Criar conta" ou continuar usando a plataforma, você declara ter lido,
            entendido e aceito integralmente estes Termos de Uso e a Política de Privacidade.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Highlight({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm font-medium text-foreground">
      {children}
    </div>
  );
}
