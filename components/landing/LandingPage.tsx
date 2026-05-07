import Link from "next/link";
import {
  ArrowRight,
  EyeOff,
  Flame,
  Image as ImageIcon,
  Lock,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingPageProps {
  onlineUsers: number;
  activeRooms: number;
}

export function LandingPage({ onlineUsers, activeRooms }: LandingPageProps) {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-40 h-[400px] w-[400px] rounded-full bg-accent/15 blur-[120px]" />
        <div className="absolute bottom-[10%] -left-40 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <section className="container relative pb-20 pt-12 md:pb-32 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            {onlineUsers > 0
              ? `${onlineUsers} ${onlineUsers === 1 ? "pessoa online agora" : "pessoas online agora"}`
              : "Comunidade brasileira ativa 24/7"}
          </div>

          <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            O que você{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              esconde do mundo
            </span>
            ,
            <br />
            aqui é o que <em className="not-italic">une</em> as pessoas.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
            Salas exclusivas pra cada fetiche. Anônimo, real e sem julgamento.
            Encontre quem deseja exatamente o que você deseja —{" "}
            <strong className="text-foreground">agora mesmo.</strong>
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" variant="gradient" className="h-14 px-8 text-base">
              <Link href="/cadastro">
                Criar conta grátis
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-6 text-base">
              <Link href="/login">Entrar</Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Cadastro em 30 segundos · Sem cartão · 100% anônimo · Apenas +18
          </p>
        </div>
      </section>

      <section className="container py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-primary/20 bg-card/50 p-8 backdrop-blur md:p-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Imagine
          </p>
          <p className="mt-4 text-2xl font-medium leading-relaxed md:text-3xl">
            Você abre o chat. Acha a sala do{" "}
            <span className="text-primary">seu fetiche</span>. Tem gente
            conversando agora — gente que entende. Você manda a primeira
            mensagem sem medo. Em segundos, alguém responde. E você sente
            aquilo <em>pulsar</em> de novo.
          </p>
          <p className="mt-4 text-muted-foreground">
            Isso acontece todo dia, toda hora, neste exato momento. A diferença
            entre você e quem está dentro? Um cadastro.
          </p>
        </div>
      </section>

      <section className="container py-16">
        <div className="mb-12 text-center">
          <h2 className="text-balance text-3xl font-bold md:text-5xl">
            Tudo que você não consegue em{" "}
            <span className="text-muted-foreground line-through">apps comuns</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Aqui o tabu vira tema. E o tema vira sala.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
          <FeatureCard
            icon={MessageSquare}
            title="Salas exclusivas pra cada fetiche"
            text="100+ categorias divididas por tesão real. Cuckold, BDSM, exibicionismo, fisting, swing, lingerie, pés... e a sua, que ninguém aceita falar em outro lugar."
            highlight={`${activeRooms || "88"}+ salas ativas`}
          />
          <FeatureCard
            icon={Plus}
            title="Crie sua própria sala"
            text="Não achou exatamente o que procura? Crie. Vire o dono daquele espaço, atraia quem combina e mande na moderação do seu jeito."
            highlight="Premium"
          />
          <FeatureCard
            icon={ImageIcon}
            title="Compartilhe fotos com quem entende"
            text="Poste no blog ou mande direto na DM. Imagens efêmeras que somem depois — você controla o que mostra, pra quem mostra e por quanto tempo."
            highlight="DMs efêmeras"
          />
          <FeatureCard
            icon={Users}
            title="Conversas reais, gente real"
            text="Brasileiros como você, da sua idade, com o seu desejo. Chat em tempo real, presença ao vivo, ninguém perde tempo com bot ou catfish."
            highlight={`${onlineUsers || "centenas"} online agora`}
          />
        </div>
      </section>

      <section className="container py-16">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card/60 to-background p-8 md:p-16">
          <div aria-hidden className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <EyeOff className="h-3 w-3" />
                100% Anônimo
              </div>
              <h2 className="text-balance text-3xl font-bold md:text-4xl">
                Aqui você não é{" "}
                <span className="text-muted-foreground line-through">estranho</span>.
                <br />
                Você é <span className="text-primary">raro</span>.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Sem nome real. Sem foto obrigatória. Sem rastro nas redes
                sociais. Crie um username, escolha um avatar e seja exatamente
                quem você é por trás da tela — sem que ninguém da sua vida saiba.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                <Check>Username livre — nunca pedimos seu nome real</Check>
                <Check>DMs com imagens efêmeras (somem em horas)</Check>
                <Check>Sessão expira sozinha — segurança automática</Check>
                <Check>Sair? Apaga tudo. Você no controle.</Check>
              </ul>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-2xl border border-border/50 bg-card p-6">
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/15 text-primary">
                    <Lock className="h-10 w-10" />
                  </div>
                  <p className="text-2xl font-bold">@voce_secreto</p>
                  <p className="text-sm text-muted-foreground">
                    Esse pode ser você em 30 segundos.
                  </p>
                  <Button asChild variant="gradient" className="mt-2">
                    <Link href="/cadastro">
                      Quero meu username
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          <Stat icon={Users} value={onlineUsers} label="online agora" />
          <Stat icon={Flame} value={activeRooms} label="salas ativas" />
          <Stat icon={Sparkles} value={"100+"} label="fetiches catalogados" />
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Enquanto você rola um feed sem graça, gente como você está se
          conectando aqui dentro.
        </p>
      </section>

      <section className="container py-20">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-10 text-center md:p-16">
          <div aria-hidden className="absolute -inset-px rounded-3xl bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 opacity-50 blur-xl" />
          <div className="relative">
            <h2 className="text-balance text-4xl font-bold md:text-5xl">
              Seu desejo não vai esperar.
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Seu cadastro também não precisa.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Em menos de um minuto você está dentro. Anônimo, no seu ritmo,
              explorando o que sempre quis.
            </p>
            <Button asChild size="lg" variant="gradient" className="mt-8 h-14 px-10 text-base">
              <Link href="/cadastro">
                Criar minha conta anônima
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              Grátis · Sem cartão · Sair quando quiser · Apenas +18
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  highlight: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur transition hover:border-primary/40">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/20">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      <div className="mt-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        {highlight}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 p-6 text-center backdrop-blur">
      <Icon className="mx-auto mb-2 h-6 w-6 text-primary" />
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}
