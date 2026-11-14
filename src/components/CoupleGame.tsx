import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listCoupleGameChoices,
  saveCoupleGameChoice,
  type CoupleGameChoice,
} from "@/lib/couple-game";
import { getDailyThisOrThatRound } from "@/lib/this-or-that";

type GameQuestion = {
  id: string;
  prompt: string;
  optionA: string;
  optionB: string;
};

const questions: GameQuestion[] = getDailyThisOrThatRound().map((item) => ({
  id: item.id,
  prompt: item.prompt,
  optionA: item.a,
  optionB: item.b,
}));

type GameState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "no-couple" }
  | { status: "pending" }
  | { status: "active"; coupleId: string; choices: CoupleGameChoice[] };

type CoupleGameProps = {
  userId: string;
};

function isCoupleGameChoice(value: unknown): value is CoupleGameChoice {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.couple_id === "string" &&
    typeof row.question_id === "string" &&
    typeof row.user_id === "string" &&
    (row.choice === "a" || row.choice === "b") &&
    typeof row.answered_at === "string"
  );
}

export function CoupleGame({ userId }: CoupleGameProps) {
  const [state, setState] = useState<GameState>({ status: "loading" });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "offline">("connecting");

  useEffect(() => {
    let active = true;

    async function loadGame() {
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

        const result = await listCoupleGameChoices(couple.id);
        if (result.error) throw result.error;
        if (!active) return;

        setState({
          status: "active",
          coupleId: couple.id,
          choices: result.data ?? [],
        });
      } catch {
        if (active) setState({ status: "error" });
      }
    }

    void loadGame();

    return () => {
      active = false;
    };
  }, [userId, refreshKey]);

  const question = questions[questionIndex];
  const ownChoice =
    state.status === "active"
      ? state.choices.find(
          (item) =>
            item.question_id === question.id && item.user_id === userId,
        )?.choice
      : undefined;
  const partnerChoice =
    state.status === "active"
      ? state.choices.find(
          (item) =>
            item.question_id === question.id && item.user_id !== userId,
        )?.choice
      : undefined;

  const ownProgress =
    state.status === "active"
      ? new Set(
          state.choices
            .filter((item) => item.user_id === userId)
            .map((item) => item.question_id),
        ).size
      : 0;
  const partnerProgress =
    state.status === "active"
      ? new Set(
          state.choices
            .filter((item) => item.user_id !== userId)
            .map((item) => item.question_id),
        ).size
      : 0;

  const pairedResults =
    state.status === "active"
      ? questions.flatMap((item, index) => {
          const own = state.choices.find(
            (choice) =>
              choice.question_id === item.id && choice.user_id === userId,
          );
          const partner = state.choices.find(
            (choice) =>
              choice.question_id === item.id && choice.user_id !== userId,
          );

          if (!own || !partner) return [];

          return [{
            question: item,
            index,
            ownChoice: own.choice,
            partnerChoice: partner.choice,
          }];
        })
      : [];
  const sameCount = pairedResults.filter(
    (result) => result.ownChoice === result.partnerChoice,
  ).length;
  const differentCount = pairedResults.length - sameCount;
  const gameComplete = pairedResults.length === questions.length;

  const activeCoupleId = state.status === "active" ? state.coupleId : null;

  useEffect(() => {
    if (!activeCoupleId) {
      setRealtimeStatus("connecting");
      return;
    }

    let mounted = true;
    setRealtimeStatus("connecting");

    const channel = supabase
      .channel(`couple-game-choices:${activeCoupleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couple_game_choices",
          filter: `couple_id=eq.${activeCoupleId}`,
        },
        (payload) => {
          if (!isCoupleGameChoice(payload.new)) return;
          const incoming = payload.new;

          setState((current) => {
            if (
              current.status !== "active" ||
              current.coupleId !== activeCoupleId
            ) {
              return current;
            }

            return {
              ...current,
              choices: [
                ...current.choices.filter(
                  (item) =>
                    !(
                      item.question_id === incoming.question_id &&
                      item.user_id === incoming.user_id
                    ),
                ),
                incoming,
              ].slice(-60),
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

  async function choose(choice: "a" | "b") {
    if (state.status !== "active" || busy) return;

    setBusy(true);
    setError(null);

    try {
      const result = await saveCoupleGameChoice({
        coupleId: state.coupleId,
        questionId: question.id,
        userId,
        choice,
      });

      if (result.error) throw result.error;

      const saved: CoupleGameChoice = {
        couple_id: state.coupleId,
        question_id: question.id,
        user_id: userId,
        choice,
        answered_at: new Date().toISOString(),
      };

      setState((current) => {
        if (current.status !== "active") return current;
        return {
          ...current,
          choices: [
            ...current.choices.filter(
              (item) =>
                !(
                  item.question_id === question.id &&
                  item.user_id === userId
                ),
            ),
            saved,
          ],
        };
      });
    } catch {
      setError("Não foi possível salvar sua escolha. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  function choiceLabel(choice: "a" | "b") {
    return choice === "a" ? question.optionA : question.optionB;
  }

  return (
    <section className="couple-game-screen" aria-labelledby="couple-game-title">
      <header className="couple-game-heading">
        <div>
          <p className="date-kicker">Jogo para duas pessoas</p>
          <h1 id="couple-game-title">Isto ou aquilo?</h1>
        </div>
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
            disabled={busy}
          >
            Atualizar
          </button>
        )}
      </header>

      {state.status === "loading" && (
        <p className="couple-game-state" role="status">Carregando jogo…</p>
      )}

      {state.status === "error" && (
        <div className="couple-game-state">
          <p role="alert">Não foi possível carregar o jogo.</p>
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
          Criem o espaço de vocês em Hoje e convidem a outra pessoa para jogar.
        </p>
      )}

      {state.status === "pending" && (
        <p className="couple-game-state">
          O jogo será liberado quando a outra pessoa aceitar o convite.
        </p>
      )}

      {state.status === "active" && (
        <>
          <div className="couple-game-progress" aria-label="Progresso das respostas">
            <span>Você: {ownProgress}/{questions.length}</span>
            <span>Outra pessoa: {partnerProgress}/{questions.length}</span>
          </div>

          <nav className="couple-game-question-nav" aria-label="Perguntas do jogo">
            {questions.map((item, index) => {
              const answeredByMe = state.choices.some(
                (choice) =>
                  choice.question_id === item.id && choice.user_id === userId,
              );
              const answeredByPartner = state.choices.some(
                (choice) =>
                  choice.question_id === item.id && choice.user_id !== userId,
              );

              return (
                <button
                  key={item.id}
                  type="button"
                  className={[
                    "couple-game-question-number",
                    index === questionIndex ? "is-current" : "",
                    answeredByMe ? "is-answered" : "",
                    answeredByMe && answeredByPartner ? "is-paired" : "",
                  ].join(" ")}
                  onClick={() => setQuestionIndex(index)}
                  aria-current={index === questionIndex ? "step" : undefined}
                  aria-label={`Pergunta ${index + 1}${answeredByMe ? ", você respondeu" : ""}${answeredByPartner ? ", outra pessoa respondeu" : ""}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </nav>

          <div className="couple-game-question">
            <p className="couple-game-count">Pergunta {questionIndex + 1} de {questions.length}</p>
            <h2>{question.prompt}</h2>

            <div className="couple-game-options">
              <button
                type="button"
                className={ownChoice === "a" ? "couple-game-option is-selected" : "couple-game-option"}
                onClick={() => void choose("a")}
                disabled={busy}
                aria-pressed={ownChoice === "a"}
              >
                <span>A</span>
                <strong>{question.optionA}</strong>
                <small>{ownChoice === "a" ? "Sua escolha" : "Escolher"}</small>
              </button>
              <button
                type="button"
                className={ownChoice === "b" ? "couple-game-option is-selected" : "couple-game-option"}
                onClick={() => void choose("b")}
                disabled={busy}
                aria-pressed={ownChoice === "b"}
              >
                <span>B</span>
                <strong>{question.optionB}</strong>
                <small>{ownChoice === "b" ? "Sua escolha" : "Escolher"}</small>
              </button>
            </div>

            <div className="couple-game-result" aria-live="polite">
              {ownChoice && partnerChoice ? (
                <>
                  <p>Você: <strong>{choiceLabel(ownChoice)}</strong></p>
                  <p>Outra pessoa: <strong>{choiceLabel(partnerChoice)}</strong></p>
                  <p className="couple-game-match">
                    {ownChoice === partnerChoice
                      ? "Vocês escolheram a mesma opção."
                      : "Desta vez, vocês escolheram opções diferentes."}
                  </p>
                </>
              ) : ownChoice ? (
                <p>Sua escolha foi salva. Aguardando a outra pessoa responder.</p>
              ) : partnerChoice ? (
                <p>A outra pessoa já respondeu. Escolha a sua para comparar.</p>
              ) : (
                <p>Escolham uma opção cada um para comparar as respostas.</p>
              )}
            </div>
          </div>

          {error && <p className="couple-game-error" role="alert">{error}</p>}

          <footer className="couple-game-footer">
            <button
              type="button"
              className="secondary-action"
              onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
              disabled={questionIndex === 0 || busy}
            >
              Anterior
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={() =>
                setQuestionIndex((index) =>
                  Math.min(questions.length - 1, index + 1),
                )
              }
              disabled={questionIndex === questions.length - 1 || busy}
            >
              Próxima
            </button>
          </footer>

          <section
            className="couple-game-summary"
            aria-labelledby="couple-game-summary-title"
          >
            <div className="couple-game-summary-heading">
              <div>
                <p className="couple-game-count">
                  {gameComplete ? "Fim de jogo" : "Resumo até agora"}
                </p>
                <h2 id="couple-game-summary-title">
                  {gameComplete ? "Como vocês combinaram?" : "Comparações concluídas"}
                </h2>
              </div>
              <span className="couple-game-summary-progress">
                {pairedResults.length}/{questions.length}
              </span>
            </div>

            {pairedResults.length === 0 ? (
              <p className="couple-game-summary-note">
                O resumo aparece quando vocês dois responderem à mesma pergunta.
              </p>
            ) : (
              <>
                <div className="couple-game-summary-totals" aria-label="Resultado geral">
                  <p><strong>{sameCount}</strong><span>iguais</span></p>
                  <p><strong>{differentCount}</strong><span>diferentes</span></p>
                </div>

                <ol className="couple-game-summary-list">
                  {pairedResults.map((result) => (
                    <li key={result.question.id}>
                      <div>
                        <p className="couple-game-summary-question">
                          {result.index + 1}. {result.question.prompt}
                        </p>
                        <p className="couple-game-summary-choices">
                          <span>
                            Você: <strong>
                              {result.ownChoice === "a"
                                ? result.question.optionA
                                : result.question.optionB}
                            </strong>
                          </span>
                          <span>
                            Outra pessoa: <strong>
                              {result.partnerChoice === "a"
                                ? result.question.optionA
                                : result.question.optionB}
                            </strong>
                          </span>
                        </p>
                      </div>
                      <span
                        className="couple-game-summary-verdict"
                        data-result={result.ownChoice === result.partnerChoice ? "same" : "different"}
                      >
                        {result.ownChoice === result.partnerChoice ? "Iguais" : "Diferentes"}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="couple-game-summary-note">
                  {gameComplete
                    ? "Vocês responderam às seis perguntas. O resultado considera apenas as respostas dos dois."
                    : "As perguntas ainda sem duas respostas não entram nesta contagem."}
                </p>
              </>
            )}
          </section>
        </>
      )}
    </section>
  );
}
