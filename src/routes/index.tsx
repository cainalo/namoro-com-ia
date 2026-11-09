import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Compass,
  Film,
  Gift,
  Heart,
  Home,
  Images,
  Leaf,
  MessageCircle,
  Music2,
  PawPrint,
  Plane,
  Sparkles,
  Sprout,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AiChat } from "@/components/AiChat";

type SectionId = "home" | "messages" | "memories" | "organize" | "universe";

type NavigationItem = {
  id: SectionId;
  label: string;
  icon: LucideIcon;
};

const navigation: NavigationItem[] = [
  { id: "home", label: "Início", icon: Home },
  { id: "messages", label: "Conversas", icon: MessageCircle },
  { id: "memories", label: "Memórias", icon: Images },
  { id: "organize", label: "Organização", icon: CalendarDays },
  { id: "universe", label: "Universo", icon: Compass },
];

const sectionDetails: Record<
  Exclude<SectionId, "home">,
  {
    eyebrow: string;
    title: string;
    description: string;
    icon: LucideIcon;
    intro: string;
    features: { title: string; description: string; icon: LucideIcon }[];
  }
> = {
  messages: {
    eyebrow: "COMUNICAÇÃO",
    title: "Um lugar tranquilo para conversar.",
    description:
      "A conversa de vocês terá espaço para o cotidiano, as lembranças, as cartas e tudo aquilo que merece ser dito.",
    icon: MessageCircle,
    intro: "A comunicação será construída em torno de uma conversa principal, com espaços especiais para cartas e surpresas.",
    features: [
      { title: "Conversa principal", description: "Mensagens, respostas, reações, arquivos e pesquisa.", icon: MessageCircle },
      { title: "Cartas e mensagens futuras", description: "Escrevam agora e escolham quando a mensagem poderá ser aberta.", icon: BookOpen },
      { title: "Chamadas e momentos juntos", description: "Voz, vídeo e atividades compartilhadas em uma etapa própria.", icon: Heart },
    ],
  },
  memories: {
    eyebrow: "NOSSA HISTÓRIA",
    title: "Tudo o que vale a pena guardar.",
    description:
      "Fotografias, vídeos, textos, áudios, viagens e pequenos momentos poderão formar a história de vocês.",
    icon: Images,
    intro: "As memórias poderão ser organizadas automaticamente por data e também em álbuns, capítulos e coleções.",
    features: [
      { title: "Linha do tempo", description: "Uma visão cronológica dos acontecimentos que vocês escolherem registrar.", icon: CalendarDays },
      { title: "Álbuns e capítulos", description: "Organizem fotos, vídeos e relatos por viagens, temas e momentos.", icon: Images },
      { title: "Livro da história", description: "Retrospectivas, capítulos e lembranças que poderão ser exportadas.", icon: BookOpen },
    ],
  },
  organize: {
    eyebrow: "VIDA COTIDIANA",
    title: "Planos que saem da conversa.",
    description:
      "Calendário, tarefas, estudos, projetos, despesas e viagens em um espaço organizado para os dois.",
    icon: CalendarDays,
    intro: "A organização terá espaços compartilhados e individuais, respeitando a visibilidade definida para cada conteúdo.",
    features: [
      { title: "Calendário", description: "Datas especiais, encontros, compromissos e contagens regressivas.", icon: CalendarDays },
      { title: "Tarefas e metas", description: "Atividades individuais, objetivos do casal e acompanhamento.", icon: CheckCircle2 },
      { title: "Projetos e viagens", description: "Ideias, roteiros, listas, prazos e planejamento financeiro.", icon: Plane },
    ],
  },
  universe: {
    eyebrow: "UM MUNDO DE VOCÊS",
    title: "Uma casa que cresce com a história.",
    description:
      "O universo isométrico será um lugar para explorar, decorar, cuidar dos mascotes e viver pequenas experiências.",
    icon: Compass,
    intro: "A exploração virtual será uma forma lúdica de navegar e celebrar conquistas — sem substituir os menus práticos do aplicativo.",
    features: [
      { title: "Casa e jardim", description: "Cômodos, móveis, áreas externas, plantas e decoração.", icon: Home },
      { title: "Avatares e mascotes", description: "Personagens personalizados e animais que evoluem com o cuidado.", icon: PawPrint },
      { title: "Jogos e descobertas", description: "Atividades, objetos especiais, recompensas e lugares secretos.", icon: Sparkles },
    ],
  },
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Namoro — um lugar só de vocês" },
      { name: "description", content: "Um espaço privado para compartilhar a vida, guardar memórias e construir novas experiências." },
      { property: "og:title", content: "Namoro — um lugar só de vocês" },
      { property: "og:description", content: "Um espaço privado para compartilhar a vida, guardar memórias e construir novas experiências." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [activeSection, setActiveSection] = useState<SectionId>("home");
  const currentDate = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    [],
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1680px]">
        <aside className="sticky top-0 hidden h-dvh w-[252px] shrink-0 flex-col border-r border-border/70 bg-card/55 px-5 py-7 lg:flex">
          <Brand />
          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
            NOSSO ESPAÇO
          </p>
          <Navigation activeSection={activeSection} onNavigate={setActiveSection} />
          <div className="mt-auto rounded-[22px] border border-border/70 bg-secondary/55 p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-card text-primary">
              <Heart className="h-4 w-4" />
            </div>
            <p className="font-display text-lg leading-tight">Só vocês dois.</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Um espaço privado, com escolhas de compartilhamento em cada conteúdo.
            </p>
          </div>
          <p className="mt-5 px-1 text-[10px] tracking-wide text-muted-foreground/75">
            NAMORO · FEITO PARA DOIS
          </p>
        </aside>

        <main className="min-w-0 flex-1 pb-28 lg:pb-8">
          <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="text-xs capitalize text-muted-foreground">{currentDate}</p>
              <p className="mt-0.5 text-sm font-medium">O espaço de vocês</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/75 bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-[oklch(0.62_0.1_145)]" />
                Espaço privado
              </span>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
            {activeSection === "home" ? (
              <HomeScreen onNavigate={setActiveSection} />
            ) : (
              <SectionScreen section={activeSection} onHome={() => setActiveSection("home")} />
            )}
          </div>
        </main>
      </div>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_30px_-24px_rgba(40,35,25,0.35)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                aria-current={active ? "page" : undefined}
                className={"flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-medium transition-colors " + (active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted")}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.3 : 1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <AiChat />
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={"flex items-center gap-3 " + (compact ? "" : "mb-10 px-2")}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-primary text-primary-foreground shadow-love">
        <Heart className="h-[19px] w-[19px]" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="font-display text-[19px] leading-none tracking-[0.13em]">NAMORO</p>
        <p className="mt-1 text-[10px] tracking-[0.08em] text-muted-foreground">um lugar só de vocês</p>
      </div>
    </div>
  );
}

function Navigation({
  activeSection,
  onNavigate,
}: {
  activeSection: SectionId;
  onNavigate: (section: SectionId) => void;
}) {
  return (
    <nav aria-label="Navegação principal" className="space-y-1">
      {navigation.map((item) => {
        const Icon = item.icon;
        const active = activeSection === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={active ? "page" : undefined}
            className={"group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[13px] font-medium transition-all " + (active ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
            <span>{item.label}</span>
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
          </button>
        );
      })}
    </nav>
  );
}

function HomeScreen({ onNavigate }: { onNavigate: (section: SectionId) => void }) {
  const quickActions = [
    { label: "Guardar uma memória", detail: "Uma foto, uma frase ou um momento.", icon: Images, target: "memories" as const },
    { label: "Planejar alguma coisa", detail: "Datas, ideias e próximos passos.", icon: CalendarDays, target: "organize" as const },
    { label: "Continuar uma conversa", detail: "Um espaço para tudo o que querem dizer.", icon: MessageCircle, target: "messages" as const },
  ];

  const discoveries = [
    { name: "Música", detail: "Playlists e canções especiais", icon: Music2 },
    { name: "Cinema", detail: "Filmes para assistir juntos", icon: Film },
    { name: "Leitura", detail: "Livros, trechos e ideias", icon: BookOpen },
    { name: "Viagens", detail: "Destinos e roteiros", icon: Plane },
    { name: "Culinária", detail: "Receitas para experimentar", icon: Utensils },
    { name: "Presentes", detail: "Desejos e ocasiões", icon: Gift },
    { name: "Natureza", detail: "Jardim e descobertas", icon: Sprout },
    { name: "Projetos", detail: "Coisas para criar", icon: Leaf },
  ];

  const firstSteps = [
    { label: "Conhecer o espaço de conversas", icon: MessageCircle, target: "messages" as const },
    { label: "Preparar a biblioteca de memórias", icon: Images, target: "memories" as const },
    { label: "Organizar datas e planos", icon: CalendarDays, target: "organize" as const },
    { label: "Visitar a casa virtual", icon: Home, target: "universe" as const },
  ];

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-primary">O NOSSO CANTO</p>
          <h1 className="mt-2 font-display text-[2.25rem] leading-[1.06] tracking-[-0.035em] sm:text-[2.8rem]">
            Bem-vindos ao nosso lugar.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            Um espaço para compartilhar a vida, guardar o que importa e preparar o que ainda vem.
          </p>
        </div>
        <div className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-2 text-xs text-muted-foreground sm:mt-0">
          <Heart className="h-3.5 w-3.5 text-primary" />
          Construído a dois
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
        <div className="relative isolate min-h-[330px] overflow-hidden rounded-[30px] bg-[#e7eadf] p-6 text-[#34463a] sm:min-h-[360px] sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-72 w-72 rounded-full border border-[#b3bda9]/60" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-2 top-8 h-52 w-52 rounded-full border border-[#b3bda9]/50" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-20 h-64 w-64 rounded-full bg-[#d4ddca]/70 blur-[1px]" />
          <div className="relative z-10 flex h-full max-w-[610px] flex-col items-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#aab6a2] bg-white/35 px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-[#526554]">
              <Sparkles className="h-3.5 w-3.5" />
              UM UNIVERSO EM CONSTRUÇÃO
            </span>
            <h2 className="mt-7 max-w-[560px] font-display text-[2.45rem] leading-[1.05] tracking-[-0.035em] sm:text-[3.15rem]">
              A história de vocês merece um lugar inteiro.
            </h2>
            <p className="mt-4 max-w-[440px] text-sm leading-relaxed text-[#59695b] sm:text-[15px]">
              Memórias, planos, conversas e pequenas aventuras reunidos em um só universo privado.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("universe")}
              className="mt-7 inline-flex min-h-11 items-center gap-3 rounded-full bg-[#435b48] px-5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 hover:bg-[#344b39] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#435b48] focus-visible:ring-offset-2"
            >
              Explorar nosso universo
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute bottom-7 right-8 hidden h-28 w-28 items-center justify-center rounded-full border border-[#9ba991]/70 bg-[#f1f0e5]/55 md:flex">
            <Heart className="h-9 w-9 text-[#71836e]" strokeWidth={1.2} />
          </div>
        </div>

        <div className="flex min-h-[330px] flex-col justify-between rounded-[30px] border border-border/80 bg-card p-6 sm:p-7">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">UM PRÓXIMO CAPÍTULO</span>
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-[19px] bg-secondary text-secondary-foreground">
              <Heart className="h-6 w-6" />
            </div>
            <h3 className="mt-5 font-display text-[1.8rem] leading-tight">Datas que merecem ser lembradas.</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Quando vocês registrarem uma data especial, ela poderá ganhar contagem regressiva, lembretes e um lugar na história.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("organize")}
            className="mt-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:gap-3"
          >
            Organizar nossos planos <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          const colorClass = index === 0 ? "bg-[#f1e6dc] text-[#98694b]" : index === 1 ? "bg-[#e8ecdf] text-[#5e765d]" : "bg-[#eee7ed] text-[#89677e]";
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => onNavigate(action.target)}
              className="group flex min-h-[104px] items-center gap-4 rounded-[22px] border border-border/75 bg-card px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_30px_-24px_rgba(75,60,40,0.45)] sm:px-5"
            >
              <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl " + colorClass}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{action.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{action.detail}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-border/80 bg-card p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-primary">MURAL COMPARTILHADO</p>
              <h2 className="mt-1 font-display text-[1.8rem]">O que acontece entre vocês.</h2>
            </div>
            <Images className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-6 rounded-[22px] bg-muted/65 px-5 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
              <Heart className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-semibold">O mural começa com a primeira lembrança.</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Publicações, fotografias, músicas e pequenos acontecimentos aparecerão aqui quando vocês começarem a compartilhar.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("memories")}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold transition-colors hover:border-primary/40 hover:text-primary"
            >
              Conhecer as memórias <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-border/80 bg-card p-5 sm:p-7">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-primary">PRIMEIROS PASSOS</p>
          <h2 className="mt-1 font-display text-[1.8rem]">Começos possíveis.</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Não existe uma ordem obrigatória. Vocês escolhem o que querem viver primeiro.
          </p>
          <div className="mt-5 space-y-1">
            {firstSteps.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onNavigate(item.target)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left text-sm transition-colors hover:bg-muted"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-primary">ALÉM DO COMEÇO</p>
            <h2 className="mt-1 font-display text-[1.9rem]">Coisas para viver e descobrir.</h2>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:block">Áreas que crescerão com vocês</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {discoveries.map((item, index) => {
            const Icon = item.icon;
            const tones = [
              "bg-[#f1e6dc] text-[#98694b]",
              "bg-[#e9e8ef] text-[#726b8a]",
              "bg-[#e7ecdf] text-[#60775d]",
              "bg-[#eee5df] text-[#98664f]",
            ];
            return (
              <div key={item.name} className="flex items-center gap-3 rounded-[20px] border border-border/75 bg-card p-4">
                <div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] " + tones[index % tones.length]}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <p className="border-t border-border/70 pt-5 text-center text-[11px] text-muted-foreground">
        Feito para guardar o que é de vocês — com espaço para cada um continuar sendo quem é.
      </p>
    </div>
  );
}

function SectionScreen({
  section,
  onHome,
}: {
  section: Exclude<SectionId, "home">;
  onHome: () => void;
}) {
  const detail = sectionDetails[section];
  const Icon = detail.icon;

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <button
        type="button"
        onClick={onHome}
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
        Voltar ao início
      </button>
      <section className="rounded-[30px] border border-border/75 bg-card p-6 sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-secondary text-secondary-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <p className="mt-7 text-[10px] font-semibold tracking-[0.2em] text-primary">{detail.eyebrow}</p>
        <h1 className="mt-2 max-w-2xl font-display text-[2.5rem] leading-[1.08] tracking-[-0.03em] sm:text-[3.2rem]">
          {detail.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {detail.description}
        </p>
        <div className="mt-7 flex items-start gap-3 rounded-2xl bg-secondary/55 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-secondary-foreground">{detail.intro}</p>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">O QUE FARÁ PARTE DESTA ÁREA</p>
          <h2 className="mt-1 font-display text-2xl">Preparada para crescer por etapas.</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {detail.features.map((feature) => {
            const FeatureIcon = feature.icon;
            return (
              <article key={feature.title} className="rounded-[22px] border border-border/75 bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-muted text-primary">
                  <FeatureIcon className="h-[18px] w-[18px]" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">{feature.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <div className="rounded-[22px] border border-dashed border-border bg-muted/35 p-5 sm:p-6">
        <p className="text-sm font-semibold">Esta área está sendo construída com cuidado.</p>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          A estrutura visual já está organizada. As funções serão ativadas em etapas, depois que a fundação de contas, vínculos e permissões estiver pronta. Nenhum conteúdo de exemplo será apresentado como se fosse uma lembrança real.
        </p>
      </div>
    </div>
  );
}
