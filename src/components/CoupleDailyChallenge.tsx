import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listDailyChallengeProgress,
  saveDailyChallengeCompletion,
  type DailyChallengeCompletion,
} from "@/lib/couple-daily-challenge";

type DailyChallenge = {
  id: string;
  category: string;
  title: string;
  instruction: string;
};

type ChallengeState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "no-couple" }
  | { status: "pending" }
  | {
      status: "active";
      coupleId: string;
      progress: DailyChallengeCompletion[];
    };

function isDailyChallengeCompletion(
  value: unknown,
): value is DailyChallengeCompletion {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.couple_id === "string" &&
    typeof row.challenge_date === "string" &&
    typeof row.challenge_id === "string" &&
    typeof row.user_id === "string" &&
    typeof row.completed_at === "string"
  );
}

const challenges: DailyChallenge[] = [
  {
    id: "lembranca-em-detalhes",
    category: "Conversa",
    title: "Uma lembrança em detalhes",
    instruction:
      "Cada um conta uma lembrança dos dois que gostaria de reviver. Contem também um detalhe que talvez o outro não tenha percebido.",
  },
  {
    id: "tres-coisas-que-fazem-diferenca",
    category: "Carinho",
    title: "Três coisas que fazem diferença",
    instruction:
      "Digam três atitudes pequenas do outro que deixam a rotina mais leve. Escolham exemplos concretos, não elogios genéricos.",
  },
  {
    id: "encontro-com-o-que-voces-tem",
    category: "Criatividade",
    title: "Um encontro com o que vocês têm",
    instruction:
      "Inventem um encontro usando apenas coisas que já têm em casa ou uma chamada de vídeo. Deem um nome para esse encontro.",
  },
  {
    id: "desenho-as-cegas",
    category: "Diversão",
    title: "Desenho às cegas",
    instruction:
      "Escolham algo simples para desenhar sem mostrar o papel. Depois revelem os desenhos e tentem adivinhar o que cada um fez.",
  },
  {
    id: "uma-pergunta-que-faltou",
    category: "Conversa",
    title: "Uma pergunta que faltou",
    instruction:
      "Cada um faz uma pergunta que nunca teve coragem, oportunidade ou motivo de fazer. Respondam com calma e sem interromper.",
  },
  {
    id: "mensagem-inesperada",
    category: "Carinho",
    title: "Uma mensagem inesperada",
    instruction:
      "Escrevam uma mensagem curta dizendo algo que admiram um no outro. Enviem ao mesmo tempo, sem combinar o texto.",
  },
  {
    id: "viagem-imaginaria",
    category: "Criatividade",
    title: "A viagem imaginária",
    instruction:
      "Escolham um lugar onde gostariam de ir juntos e montem um roteiro de três momentos, mesmo que a viagem ainda não tenha data.",
  },
  {
    id: "trilha-sonora-do-casal",
    category: "Diversão",
    title: "Trilha sonora do casal",
    instruction:
      "Cada um escolhe uma música que combina com a história de vocês. Ouçam as duas e expliquem por que fizeram essas escolhas.",
  },
  {
    id: "proximo-pequeno-passo",
    category: "Conversa",
    title: "O próximo pequeno passo",
    instruction:
      "Conversem sobre uma coisa simples que gostariam de começar juntos nesta semana. Definam um primeiro passo que caiba na rotina.",
  },
  {
    id: "obrigado-por-isso",
    category: "Carinho",
    title: "Obrigado por isso",
    instruction:
      "Cada um agradece ao outro por uma atitude recente, mesmo que pareça pequena. Contem por que aquilo foi importante.",
  },
  {
    id: "simbolo-para-hoje",
    category: "Criatividade",
    title: "Um símbolo para hoje",
    instruction:
      "Escolham um objeto, cor ou música que represente o momento atual da relação. Expliquem a escolha e guardem essa referência.",
  },
  {
    id: "duas-verdades-e-uma-invencao",
    category: "Diversão",
    title: "Duas verdades e uma invenção",
    instruction:
      "Cada um conta três fatos sobre si: dois verdadeiros e um inventado. O outro tenta descobrir qual foi inventado.",
  },
  {
    id: "um-sonho-possivel",
    category: "Conversa",
    title: "Um sonho possível",
    instruction:
      "Contem uma experiência que gostariam de viver juntos nos próximos meses. Pensem em algo concreto e conversem sobre como começar.",
  },
  {
    id: "o-que-eu-vejo-em-voce",
    category: "Carinho",
    title: "O que eu vejo em você",
    instruction:
      "Cada um completa a frase: 'Uma qualidade sua que talvez você não perceba é…'. Depois deem um exemplo que mostre essa qualidade.",
  },
  {
    id: "receita-inventada",
    category: "Criatividade",
    title: "Receita inventada",
    instruction:
      "Criem juntos uma receita imaginária com três ingredientes escolhidos por cada um. Deem um nome e descrevam como seria o resultado.",
  },
  {
    id: "foto-com-o-mesmo-tema",
    category: "Diversão",
    title: "Foto com o mesmo tema",
    instruction:
      "Escolham um tema simples, como céu, algo verde ou algo antigo. Cada um tira uma foto do tema onde estiver e compara os resultados.",
  },
  {
    id: "tradicao-so-de-voces",
    category: "Conversa",
    title: "Uma tradição só de vocês",
    instruction:
      "Inventem uma pequena tradição que possam repetir semanalmente, mesmo à distância. Escolham quando ela começa.",
  },
  {
    id: "relembrar-o-comeco",
    category: "Carinho",
    title: "Relembrar o começo",
    instruction:
      "Conversem sobre como cada um se sentiu em um dos primeiros momentos importantes da relação. Comparem o que lembram.",
  },
  {
    id: "playlist-de-cinco-minutos",
    category: "Criatividade",
    title: "Playlist de cinco minutos",
    instruction:
      "Escolham três músicas para representar: uma lembrança, o momento atual e algo que esperam viver juntos.",
  },
  {
    id: "desafio-do-improviso",
    category: "Diversão",
    title: "Desafio do improviso",
    instruction:
      "Escolham um objeto que esteja por perto e inventem, em um minuto, três usos completamente diferentes para ele.",
  },
];

function getDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getDateKeyDaysAgo(days: number) {
  const [year, month, day] = getDateKey().split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - days))
    .toISOString()
    .slice(0, 10);
}

function formatChallengeDate(dateKey: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "numeric",
    month: "long",
    weekday: "short",
  }).format(new Date(`${dateKey}T12:00:00-03:00`));
}

function getDailyChallenge(coupleId: string, dateKey = getDateKey()) {
  const seed = `${coupleId}:${dateKey}`;
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  }

  return challenges[(hash >>> 0) % challenges.length];
}

export function CoupleDailyChallenge({ userId }: { userId: string }) {
  const [state, setState] = useState<ChallengeState>({ status: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "offline">("connecting");

  useEffect(() => {
    let active = true;

    async function loadCouple() {
      setState({ status: "loading" });
      setError(null);

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

        const result = await listDailyChallengeProgress(
          couple.id,
          getDateKeyDaysAgo(29),
        );
        if (result.error) throw result.error;
        if (!active) return;

        setState({
          status: "active",
          coupleId: couple.id,
          progress: result.data ?? [],
        });
      } catch {
        if (active) setState({ status: "error" });
      }
    }

    void loadCouple();

    return () => {
      active = false;
    };
  }, [userId, refreshKey]);

  const activeCoupleId = state.status === "active" ? state.coupleId : null;

  useEffect(() => {
    if (!activeCoupleId) {
      setRealtimeStatus("connecting");
      return;
    }

    let mounted = true;
    setRealtimeStatus("connecting");

    const channel = supabase
      .channel(`couple-daily-progress:${activeCoupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "couple_daily_challenge_progress",
          filter: `couple_id=eq.${activeCoupleId}`,
        },
        (payload) => {
          if (!isDailyChallengeCompletion(payload.new)) return;
          const incoming = payload.new;

          setState((current) => {
            if (
              current.status !== "active" ||
              current.coupleId !== activeCoupleId
            ) {
              return current;
            }

            const alreadyPresent = current.progress.some(
              (item) =>
                item.challenge_date === incoming.challenge_date &&
                item.user_id === incoming.user_id,
            );
            if (alreadyPresent) return current;

            return {
              ...current,
              progress: [
                incoming,
                ...current.progress,
              ]
                .sort((a, b) =>
                  b.challenge_date.localeCompare(a.challenge_date),
                )
                .slice(0, 60),
            };
          });
        },
      )
      .subscribe((status) => {
        if (!mounted) return;
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeStatus("offline");
        }
      });

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [activeCoupleId]);

  const today = getDateKey();
  const challenge =
    state.status === "active"
      ? getDailyChallenge(state.coupleId, today)
      : null;
  const todayProgress =
    state.status === "active" && challenge
      ? state.progress.filter(
          (item) =>
            item.challenge_date === today &&
            item.challenge_id === challenge.id,
        )
      : [];
  const completedByMe = todayProgress.some((item) => item.user_id === userId);
  const completedByPartner = todayProgress.some((item) => item.user_id !== userId);
  const previousDates =
    state.status === "active"
      ? [...new Set(
          state.progress
            .filter((item) => item.challenge_date < today)
            .map((item) => item.challenge_date),
        )].slice(0, 10)
      : [];

  async function completeChallenge() {
    if (
      state.status !== "active" ||
      !challenge ||
      saving ||
      completedByMe
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await saveDailyChallengeCompletion({
        coupleId: state.coupleId,
        challengeDate: today,
        challengeId: challenge.id,
        userId,
      });

      if (result.error) throw result.error;

      const completion: DailyChallengeCompletion = {
        couple_id: state.coupleId,
        challenge_date: today,
        challenge_id: challenge.id,
        user_id: userId,
        completed_at: new Date().toISOString(),
      };

      setState((current) => {
        if (current.status !== "active") return current;
        if (current.progress.some(
          (item) =>
            item.challenge_date === today && item.user_id === userId,
        )) {
          return current;
        }
        return {
          ...current,
          progress: [completion, ...current.progress].slice(0, 60),
        };
      });
    } catch (cause) {
      const failure = cause as { code?: string };
      if (failure.code === "23505") {
        setError("Sua conclusão já estava registrada. Atualizando o histórico.");
        setRefreshKey((key) => key + 1);
      } else {
        setError("Não foi possível registrar sua conclusão. Tente novamente.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="couple-daily-challenge" aria-labelledby="couple-daily-title">
      <header className="couple-daily-heading">
        <div>
          <p className="date-kicker">Uma missão para os dois</p>
          <h1 id="couple-daily-title">Desafio do dia</h1>
        </div>
        <div className="couple-daily-actions">
          <span className="couple-daily-date">
            {new Intl.DateTimeFormat("pt-BR", {
              timeZone: "America/Sao_Paulo",
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </span>
          {state.status === "active" && (
            <span className="couple-game-live-status" role="status">
              {realtimeStatus === "connected"
                ? "Ao vivo"
                : realtimeStatus === "connecting"
                  ? "Conectando…"
                  : "Atualização manual"}
            </span>
          )}
          {state.status === "active" && (
            <button
              type="button"
              className="inline-action"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={saving}
            >
              Atualizar
            </button>
          )}
        </div>
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

      {state.status === "active" && challenge && (
        <>
          <div className="couple-daily-content">
            <p className="couple-daily-category">{challenge.category}</p>
            <h2>{challenge.title}</h2>
            <p className="couple-daily-instruction">{challenge.instruction}</p>

            <div className="couple-daily-completion" aria-live="polite">
              <p className={completedByMe ? "is-complete" : ""}>
                Você: <strong>{completedByMe ? "Concluído" : "Pendente"}</strong>
              </p>
              <p className={completedByPartner ? "is-complete" : ""}>
                Outra pessoa: <strong>{completedByPartner ? "Concluído" : "Pendente"}</strong>
              </p>
              {completedByMe && completedByPartner && (
                <p className="couple-daily-together">
                  Missão concluída pelos dois.
                </p>
              )}
            </div>

            <button
              type="button"
              className="primary-action couple-daily-complete-button"
              onClick={() => void completeChallenge()}
              disabled={saving || completedByMe}
            >
              {saving
                ? "Registrando…"
                : completedByMe
                  ? "Você concluiu este desafio"
                  : "Marcar como concluído"}
            </button>
            {error && <p className="couple-game-error" role="alert">{error}</p>}
            <p className="couple-daily-footnote">
              Cada um registra sua própria conclusão. O desafio só aparece como concluído pelo casal quando os dois marcarem.
            </p>
          </div>

          <section className="couple-daily-history" aria-labelledby="couple-daily-history-title">
            <header>
              <h2 id="couple-daily-history-title">Histórico recente</h2>
              <span>Últimos 30 dias</span>
            </header>

            {previousDates.length === 0 ? (
              <p className="couple-daily-history-empty">
                As missões concluídas em dias anteriores aparecerão aqui.
              </p>
            ) : (
              <ol>
                {previousDates.map((date) => {
                  const records = state.progress.filter(
                    (item) => item.challenge_date === date,
                  );
                  const previousChallengeId = records[0]?.challenge_id;
                  const matchingRecords = records.filter(
                    (item) => item.challenge_id === previousChallengeId,
                  );
                  const previousChallenge = challenges.find(
                    (item) => item.id === previousChallengeId,
                  );
                  const previousByMe = matchingRecords.some(
                    (item) => item.user_id === userId,
                  );
                  const previousByPartner = matchingRecords.some(
                    (item) => item.user_id !== userId,
                  );

                  return (
                    <li key={date}>
                      <div>
                        <p className="couple-daily-history-date">
                          {formatChallengeDate(date)}
                        </p>
                        <p className="couple-daily-history-title">
                          {previousChallenge?.title ?? "Desafio anterior"}
                        </p>
                        <p className="couple-daily-history-status">
                          Você: {previousByMe ? "Concluído" : "Pendente"}
                          {" · "}
                          Outra pessoa: {previousByPartner ? "Concluído" : "Pendente"}
                        </p>
                      </div>
                      {previousByMe && previousByPartner && (
                        <span className="couple-daily-history-both">Ambos</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}
    </section>
  );
}
