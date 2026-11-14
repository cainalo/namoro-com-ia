import { useState } from "react";
import { CheckCircle2, Link2, Network, RotateCcw, ScanSearch } from "lucide-react";

export type DeductionClue = { id: string; title: string; short: string };

export function EvidenceDeductionBoard({
  clues,
  requiredPairs,
  completedPairs,
  onPairVerified,
}: {
  clues: DeductionClue[];
  requiredPairs: string[];
  completedPairs: string[];
  onPairVerified: (pair: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("Selecione duas pistas que se confirmam mutuamente.");
  const [mistakes, setMistakes] = useState(0);

  function toggle(id: string) {
    if (selected.includes(id)) {
      setSelected((current) => current.filter((value) => value !== id));
      return;
    }
    if (selected.length === 2) setSelected([id]);
    else setSelected((current) => [...current, id]);
  }

  function connect() {
    if (selected.length !== 2) return;
    const pair = [...selected].sort().join("|");
    if (completedPairs.includes(pair)) {
      setMessage("Essa ligação já está registrada no quadro.");
      return;
    }
    if (requiredPairs.includes(pair)) {
      onPairVerified(pair);
      setMessage("Ligação confirmada. As duas evidências sustentam a mesma conclusão.");
    } else {
      setMistakes((value) => value + 1);
      setMessage("Os horários ou detalhes não se confirmam. Procure outra combinação.");
    }
    setSelected([]);
  }

  return (
    <section className="investigation-deduction-board">
      <div className="deduction-board-heading">
        <div><span className="investigation-kicker"><Network aria-hidden="true"/> QUADRO DE DEDUÇÃO</span><h3>Conecte as evidências</h3><p>Uma suspeita só vira prova quando dois registros independentes apontam para a mesma conclusão.</p></div>
        <div className="deduction-board-score"><strong>{completedPairs.length}/{requiredPairs.length}</strong><small>ligações corretas</small></div>
      </div>
      <div className="deduction-board-clues">
        {clues.map((clue, index) => {
          const isSelected = selected.includes(clue.id);
          const isLinked = completedPairs.some((pair) => pair.split("|").includes(clue.id));
          return (
            <button type="button" key={clue.id} className={"deduction-clue" + (isSelected ? " is-selected" : "") + (isLinked ? " is-linked" : "")} onClick={() => toggle(clue.id)} aria-pressed={isSelected}>
              <span className="deduction-clue-index">{String(index + 1).padStart(2, "0")}</span>
              <span><strong>{clue.title}</strong><small>{clue.short}</small></span>
              {isLinked ? <CheckCircle2 aria-label="Conectada" /> : <ScanSearch aria-hidden="true"/>}
            </button>
          );
        })}
      </div>
      <div className="deduction-board-footer">
        <p role="status">{message}</p>
        <div><small>{mistakes} tentativas sem confirmação</small><button type="button" onClick={connect} disabled={selected.length !== 2 || completedPairs.length >= requiredPairs.length}><Link2/> Conectar pistas</button></div>
      </div>
      {completedPairs.length === requiredPairs.length && <div className="deduction-board-complete"><CheckCircle2/> Todas as ligações essenciais foram confirmadas. A conclusão está sustentada pelas provas.</div>}
    </section>
  );
}
