import { ArrowLeft, Heart, RotateCcw, Sparkles, Trophy } from "lucide-react";

export type ThisOrThatResultEntry = {
  id: string;
  prompt: string;
  firstChoice: string;
  secondChoice: string;
  matched: boolean;
};

type ThisOrThatResultsProps = {
  mode: "solo" | "local" | "online";
  entries: ThisOrThatResultEntry[];
  onExit: () => void;
  onReplay?: () => void;
};

export function ThisOrThatResults({
  mode,
  entries,
  onExit,
  onReplay,
}: ThisOrThatResultsProps) {
  const total = entries.length;
  const matched = entries.filter((entry) => entry.matched).length;
  const different = total - matched;
  const percentage = total > 0 ? Math.round((matched / total) * 100) : 0;
  const firstLabel = mode === "local" ? "Pessoa 1" : "Você";
  const secondLabel = mode === "solo" ? "Morados" : mode === "local" ? "Pessoa 2" : "Outra pessoa";
  const title = mode === "solo" ? "Você e Morados" : "O que vocês têm em comum?";
  const subtitle = mode === "solo"
    ? "Veja como suas escolhas se encontram com o perfil de preferências usado nesta partida individual."
    : "Cada resposta conta uma pequena parte da história de vocês. Veja onde escolheram igual e onde pensaram diferente.";

  return (
    <section
      className="this-or-that-result-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="this-or-that-result-title"
      data-result-mode={mode}
    >
      <div className="this-or-that-result-scroll">
        <header className="this-or-that-result-header">
          <span className="this-or-that-result-brand"><Sparkles aria-hidden="true" /> MORADOS</span>
          <span className="this-or-that-result-round">RESULTADO DA RODADA</span>
        </header>

        <main className="this-or-that-result-main">
          <div className="this-or-that-result-hero">
            <span className="this-or-that-result-icon"><Trophy aria-hidden="true" /></span>
            <p className="this-or-that-result-eyebrow">ISTO OU AQUILO?</p>
            <h1 id="this-or-that-result-title">{title}</h1>
            <p className="this-or-that-result-subtitle">{subtitle}</p>

            <div className="this-or-that-result-score" aria-label={`${matched} de ${total} escolhas iguais`}>
              <strong>{matched}<span>/{total}</span></strong>
              <div>
                <b>{percentage}%</b>
                <span>de escolhas iguais</span>
              </div>
            </div>
            <div
              className="this-or-that-result-meter"
              role="progressbar"
              aria-label="Percentual de escolhas iguais"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentage}
            >
              <span style={{ width: percentage + "%" }} />
            </div>

            <div className="this-or-that-result-stats">
              <div className="is-same"><Heart aria-hidden="true" /><strong>{matched}</strong><span>iguais</span></div>
              <div className="is-different"><span className="this-or-that-result-different-mark">↔</span><strong>{different}</strong><span>diferentes</span></div>
            </div>
          </div>

          <section className="this-or-that-result-review" aria-labelledby="this-or-that-review-title">
            <div className="this-or-that-result-review-heading">
              <div>
                <p>REVISÃO DAS ESCOLHAS</p>
                <h2 id="this-or-that-review-title">Pergunta por pergunta</h2>
              </div>
              <span>{total} perguntas</span>
            </div>

            <ol className="this-or-that-result-list">
              {entries.map((entry, index) => (
                <li key={entry.id} className={entry.matched ? "is-matched" : "is-different"}>
                  <div className="this-or-that-result-question">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{entry.prompt}</strong>
                    <b>{entry.matched ? "Mesma escolha" : "Escolhas diferentes"}</b>
                  </div>
                  <div className="this-or-that-result-answers">
                    <p><span>{firstLabel}</span><strong>{entry.firstChoice}</strong></p>
                    <p><span>{secondLabel}</span><strong>{entry.secondChoice}</strong></p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {mode === "solo" && (
            <p className="this-or-that-result-note">
              No modo individual, Morados usa um perfil de respostas criado pelo próprio jogo. A pontuação é apenas uma comparação lúdica, não uma avaliação real de personalidade ou compatibilidade.
            </p>
          )}
        </main>
      </div>

      <footer className="this-or-that-result-actions" data-has-replay={onReplay ? "true" : "false"}>
        {onReplay ? (
          <button type="button" className="this-or-that-result-replay" onClick={onReplay}>
            <RotateCcw aria-hidden="true" /> Jogar outra rodada
          </button>
        ) : null}
        <button type="button" className="this-or-that-result-exit" onClick={onExit}>
          <ArrowLeft aria-hidden="true" /> Voltar aos jogos
        </button>
      </footer>
    </section>
  );
}
