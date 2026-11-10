import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type DailyChallenge = {
  category: string;
  title: string;
  instruction: string;
};

type ChallengeState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "no-couple" }
  | { status: "pending" }
  | { status: "active"; coupleId: string };

const challenges: DailyChallenge[] = [
  {
    category: "Conversa",
    title: "Uma lembrança em detalhes",
    instruction:
      "Cada um conta uma lembrança dos dois que gostaria de reviver. Contem também um detalhe que talvez o outro não tenha percebido.",
  },
  {
    category: "Carinho",
    title: "Três coisas que fazem diferença",
    instruction:
      "Digam três atitudes pequenas do outro que deixam a rotina mais leve. Escolham exemplos concretos, não elogios genéricos.",
  },
  {
    category: "Criatividade",
    title: "Um encontro com o que vocês têm",
    instruction:
      "Inventem um encontro usando apenas coisas que já têm em casa ou uma chamada de vídeo. Deem um nome para esse encontro.",
  },
  {
    category: "Diversão",
    title: "Desenho às cegas",
    instruction:
      "Escolham algo simples para desenhar sem mostrar o papel. Depois revelem os desenhos e tentem adivinhar o que cada um fez.",
  },
  {
    category: "Conversa",
    title: "Uma pergunta que faltou",
    instruction:
      "Cada um faz uma pergunta que nunca teve coragem, oportunidade ou motivo de fazer. Respondam com calma e sem interromper.",
  },
  {
    category: "Carinho",
    title: "Uma mensagem inesperada",
    instruction:
      "Escrevam uma mensagem curta dizendo algo que admiram um no outro. Enviem ao mesmo tempo, sem combinar o texto.",
  },
  {
    category: "Criatividade",
    title: "A viagem imaginária",
    instruction:
      "Escolham um lugar onde gostariam de ir juntos e montem um roteiro de três momentos, mesmo que a viagem ainda não tenha data.",
  },
  {
    category: "Diversão",
    title: "Trilha sonora do casal",
    instruction:
      "Cada um escolhe uma música que combina com a história de vocês. Ouçam as duas e expliquem por que fizeram essas escolhas.",
  },
  {
    category: "Conversa",
    title: "O próximo pequeno passo",
    instruction:
      "Conversem sobre uma coisa simples que gostariam de começar juntos nesta semana. Definam um primeiro passo que caiba na rotina.",
  },
  {
    category: "Carinho",
    title: "Obrigado por isso",
    instruction:
      "Cada um agradece ao outro por uma atitude recente, mesmo que pareça pequena. Contem por que aquilo foi importante.",
  },
  {
    category: "Criatividade",
    title: "Um símbolo para hoje",
    instruction:
      "Escolham um objeto, cor ou música que represente o momento atual da relação. Expliquem a escolha e guardem essa referência.",
  },
  {
    category: "Diversão",
    title: "Duas verdades e uma invenção",
    instruction:
      "Cada um conta três fatos sobre si: dois verdadeiros e um inventado. O outro tenta descobrir qual foi inventado.",
  },
  {
    category: "Conversa",
    title: "Um sonho possível",
    instruction:
      "Contem uma experiência que gostariam de viver juntos nos próximos meses. Pensem em algo concreto e conversem sobre como começar.",
  },
  {
    category: "Carinho",
    title: "O que eu vejo em você",
    instruction:
      "Cada um completa a frase: 'Uma qualidade sua que talvez você não perceba é…'. Depois deem um exemplo que mostre essa qualidade.",
  },
  {
    category: "Criatividade",
    title: "Receita inventada",
    instruction:
      "Criem juntos uma receita imaginária com três ingredientes escolhidos por cada um. Deem um nome e descrevam como seria o resultado.",
  },
  {
    category: "Diversão",
    title: "Foto com o mesmo tema",
    instruction:
      "Escolham um tema simples, como céu, algo verde ou algo antigo. Cada um tira uma foto do tema onde estiver e compara os resultados.",
  },
  {
    category: "Conversa",
    title: "Uma tradição só de vocês",
    instruction:
      "Inventem uma pequena tradição que possam repetir semanalmente, mesmo à distância. Escolham quando ela começa.",
  },
  {
    category: "Carinho",
    title: "Relembrar o começo",
    instruction:
      "Conversem sobre como cada um se sentiu em um dos primeiros momentos importantes da relação. Comparem o que lembram.",
  },
  {
    category: "Criatividade",
    title: "Playlist de cinco minutos",
    instruction:
      "Escolham três músicas para representar: uma lembrança, o momento atual e algo que esperam viver juntos.",
  },
  {
    category: "Diversão",
    title: "Desafio do improviso",
    instruction:
      "Escolham um objeto que esteja por perto e inventem, em um minuto, três usos completamente diferentes para ele.",
  },
];

function getDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getDailyChallenge(coupleId: string) {
  const seed = `${coupleId}:${getDateKey()}`;
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  }

  return challenges[(hash >>> 0) % challenges.length];
}

export function CoupleDailyChallenge({ userId }: { userId: string }) {
  const [state, setState] = useState<ChallengeState>({ status: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadCouple() {
      setState({ status: "loading" });

      try {
        const { data: membership, error: membershipError } = await supabase
          .from("couple_members")
          .select("couple_id")
          .eq("user_id", userId)
          .is("ended_at", null)
          .maybeSingle();

        if (membershipError) throw membershipError;
        if (!active) return;

        if (!membership) {
          setState({ status: "no-couple" });
          return;
        }

        const { data: couple, error: coupleError } = await supabase
          .from("couples")
          .select("id, status")
          .eq("id", membership.couple_id)
          .maybeSingle();

        if (coupleError) throw coupleError;
        if (!active) return;

        if (!couple) {
          setState({ status: "no-couple" });
          return;
        }

        if (couple.status !== "active") {
          setState({ status: "pending" });
          return;
        }

        setState({ status: "active", coupleId: couple.id });
      } catch {
        if (active) setState({ status: "error" });
      }
    }

    void loadCouple();

    return () => {
      active = false;
    };
  }, [userId, refreshKey]);

  const challenge =
    state.status === "active" ? getDailyChallenge(state.coupleId) : null;

  return (
    <section className="couple-daily-challenge" aria-labelledby="couple-daily-title">
      <header className="couple-daily-heading">
        <div>
          <p className="date-kicker">Uma missão para os dois</p>
          <h1 id="couple-daily-title">Desafio do dia</h1>
        </div>
        <span className="couple-daily-date">
          {new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Sao_Paulo",
            day: "numeric",
            month: "long",
          }).format(new Date())}
        </span>
      </header>

      {state.status === "loading" && (
        <p className="couple-game-state" role="status">Preparando o desafio…</p>
      )}

      {state.status === "error" && (
        <div className="couple-game-state">
          <p role="alert">Não foi possível preparar o desafio.</p>
          <button
            type="button"
            className="inline-action"
            onClick={() => setRefreshKey((key) => key + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {state.status === "no-couple" && (
        <p className="couple-game-state">
          Criem o espaço de vocês em Hoje e convidem a outra pessoa para liberar os jogos a dois.
        </p>
      )}

      {state.status === "pending" && (
        <p className="couple-game-state">
          O desafio ficará disponível quando a outra pessoa aceitar o convite.
        </p>
      )}

      {challenge && (
        <div className="couple-daily-content">
          <p className="couple-daily-category">{challenge.category}</p>
          <h2>{challenge.title}</h2>
          <p className="couple-daily-instruction">{challenge.instruction}</p>
          <p className="couple-daily-footnote">
            O desafio é definido pelo vínculo de vocês e pela data. Assim, os dois veem a mesma missão durante o dia.
          </p>
        </div>
      )}
    </section>
  );
}
