import { useEffect, useMemo, useState } from "react";
import {
  Anchor, Backpack, CloudRain, Compass, Droplets, Flame, HeartPulse, Hammer,
  Leaf, Map, Package, RotateCcw, Shield, Ship, Sparkles, Sun, Tent, Trees,
  Waves, Wind, Wrench, Trophy, ThermometerSun,
} from "lucide-react";
import { useGameState } from "@/components/OnlineGameHost";

type Weather = "sunny" | "rain" | "storm" | "cloudy" | "cold";
type ActionId = "forage" | "fish" | "water" | "wood" | "explore" | "shelter" | "fire" | "vines" | "signal" | "treat" | "rest" | "raft";
type SurvivalState = {
  day: number;
  player: 1 | 2;
  phase: "action" | "handoff" | "night" | "won" | "lost";
  weather: Weather;
  food: number;
  water: number;
  wood: number;
  medicine: number;
  rope: number;
  signal: number;
  shelter: number;
  fire: number;
  health: [number, number];
  morale: number;
  discoveries: string[];
  crafted: string[];
  log: string[];
  ending: string;
};

type Action = { id: ActionId; title: string; description: string; cost: string; icon: typeof Leaf };
const STORAGE = "morados-island-survival-v2";
const initial: SurvivalState = {
  day: 1, player: 1, phase: "action", weather: "sunny",
  food: 4, water: 4, wood: 2, medicine: 0, rope: 0, signal: 0, shelter: 0, fire: 0,
  health: [3, 3], morale: 5, discoveries: [], crafted: [], log: [],
  ending: "",
};

const dayNames = ["", "A chegada", "A primeira noite", "O céu fechado", "A enseada", "A serra", "A última chance", "O resgate"];
const weatherInfo: Record<Weather, { label: string; note: string; icon: typeof Sun }> = {
  sunny: { label: "Céu aberto", note: "Bom momento para explorar e recolher materiais.", icon: Sun },
  rain: { label: "Chuva", note: "A chuva pode abastecer os recipientes durante a noite.", icon: CloudRain },
  storm: { label: "Tempestade", note: "Evitem a pesca e reforcem o abrigo antes do anoitecer.", icon: Wind },
  cloudy: { label: "Nublado", note: "O tempo está instável, mas a ilha continua explorável.", icon: CloudRain },
  cold: { label: "Frio", note: "Uma fogueira ajuda a preservar o ânimo da equipe.", icon: ThermometerSun },
};
const weatherCycle: Weather[] = ["sunny", "rain", "storm", "cloudy", "cold", "rain", "sunny"];

const actions: Action[] = [
  { id: "forage", title: "Buscar alimento", description: "Procurem frutos, raízes e plantas comestíveis.", cost: "+2 comida", icon: Leaf },
  { id: "fish", title: "Pescar na enseada", description: "Aproveitem a maré para conseguir alimento fresco.", cost: "+2 comida", icon: Waves },
  { id: "water", title: "Coletar água", description: "Encontrem água doce e abasteçam os recipientes.", cost: "+2 água", icon: Droplets },
  { id: "wood", title: "Recolher madeira", description: "Juntem galhos secos e troncos para construções.", cost: "+2 madeira", icon: Trees },
  { id: "explore", title: "Explorar a ilha", description: "Procurem locais escondidos, suprimentos e caminhos.", cost: "Descoberta", icon: Compass },
  { id: "shelter", title: "Reforçar o abrigo", description: "Melhorem a proteção contra chuva, vento e frio.", cost: "−2 madeira · +1 abrigo", icon: Tent },
  { id: "fire", title: "Preparar uma fogueira", description: "Mantenham calor e ânimo para atravessar a noite.", cost: "−1 madeira", icon: Flame },
  { id: "vines", title: "Trançar cipós", description: "Preparem cordas para amarrações e construção.", cost: "+1 corda", icon: Wrench },
  { id: "signal", title: "Reforçar o sinal", description: "Melhorem a coluna de fumaça visível do mar.", cost: "−2 madeira · +1 sinal", icon: Sparkles },
  { id: "treat", title: "Tratar ferimentos", description: "Usem o kit de primeiros socorros em quem precisa.", cost: "−1 remédio · +2 saúde", icon: HeartPulse },
  { id: "rest", title: "Descansar", description: "Recuperem forças e mantenham o ânimo da equipe.", cost: "+1 saúde · +1 ânimo", icon: Shield },
  { id: "raft", title: "Construir uma balsa", description: "Juntem madeira e cordas para preparar uma rota de saída.", cost: "−4 madeira · −2 cordas", icon: Ship },
];

const discoveries = [
  { id: "spring", title: "Nascente escondida", text: "Entre as pedras, vocês encontraram água doce e limpa.", loot: "water" },
  { id: "orchard", title: "Pomar silvestre", text: "Um pequeno vale está cheio de frutos maduros.", loot: "food" },
  { id: "wreck", title: "Destroços na praia", text: "Uma caixa entre os destroços guarda madeira e uma corda aproveitável.", loot: "materials" },
  { id: "cave", title: "Abrigo de pedra", text: "Uma caverna seca esconde um kit de primeiros socorros.", loot: "medicine" },
  { id: "lookout", title: "Mirante natural", text: "Do alto, vocês encontraram um ponto excelente para sinalizar aos barcos.", loot: "signal" },
] as const;

function loadState(): SurvivalState {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<SurvivalState>;
    return {
      ...initial,
      ...parsed,
      health: Array.isArray(parsed.health) && parsed.health.length === 2 ? parsed.health as [number, number] : initial.health,
      discoveries: Array.isArray(parsed.discoveries) ? parsed.discoveries : [],
      crafted: Array.isArray(parsed.crafted) ? parsed.crafted : [],
      log: Array.isArray(parsed.log) ? parsed.log : [],
    };
  } catch {
    return initial;
  }
}

const limit = (value: number, max = 12) => Math.max(0, Math.min(max, value));
const isBuilt = (state: SurvivalState, item: string) => state.crafted.includes(item);

export function IslandSurvivalGame({ solo = false }: { solo?: boolean }) {
  const [game, setGame, sync] = useGameState<SurvivalState>(loadState, {
    onlineInitial: initial,
    turnSeat: (state) => state.player === 1 ? 0 : 1,
    outcome: (state) => state.phase === "won" || state.phase === "lost" ? { kind: "complete" } : null,
  });
  const [choice, setChoice] = useState<ActionId | null>(null);
  const [feedback, setFeedback] = useState("A tempestade deixou vocês em uma ilha desconhecida. O resgate pode demorar sete dias.");
  const weather = weatherInfo[game.weather];
  const WeatherIcon = weather.icon;
  const totalHealth = game.health[0] + game.health[1];
  const progress = Math.min(100, (game.day / 7) * 100);
  const found = discoveries.filter((item) => game.discoveries.includes(item.id));
  const raftReady = isBuilt(game, "raft");

  useEffect(() => {
    if (!sync.online) localStorage.setItem(STORAGE, JSON.stringify(game));
  }, [game, sync.online]);

  const visibleActions = useMemo(() => actions.map((action) => {
    let disabled = false;
    if (action.id === "fish" && game.weather === "storm") disabled = true;
    if (action.id === "shelter" && (game.wood < 2 || game.shelter >= 3)) disabled = true;
    if (action.id === "fire" && (game.wood < 1 || game.fire > 0)) disabled = true;
    if (action.id === "signal" && game.wood < 2) disabled = true;
    if (action.id === "treat" && (game.medicine < 1 || game.health[game.player - 1] >= 3)) disabled = true;
    if (action.id === "raft" && (game.wood < 4 || game.rope < 2 || raftReady)) disabled = true;
    return { ...action, disabled };
  }), [game, raftReady]);

  function appendLog(next: SurvivalState, line: string) {
    next.log = [line, ...next.log].slice(0, 12);
  }

  function applyAction(id: ActionId) {
    if (game.phase !== "action" || (sync.online && !sync.canAct)) return;
    const next: SurvivalState = {
      ...game,
      health: [...game.health] as [number, number],
      discoveries: [...game.discoveries],
      crafted: [...game.crafted],
      log: [...game.log],
    };
    const playerName = solo ? "Você" : `Pessoa ${game.player}`;
    let message = "";

    switch (id) {
      case "forage":
        next.food = limit(next.food + 2);
        message = "Vocês encontraram frutos e raízes entre a vegetação.";
        break;
      case "fish":
        next.food = limit(next.food + 2);
        message = "A pesca rendeu alimento fresco na enseada.";
        break;
      case "water":
        next.water = limit(next.water + 2);
        message = "Os recipientes foram abastecidos com água doce.";
        break;
      case "wood":
        next.wood = limit(next.wood + 2);
        message = "Galhos secos e troncos foram reunidos no acampamento.";
        break;
      case "explore": {
        const undiscovered = discoveries.filter((item) => !next.discoveries.includes(item.id));
        if (undiscovered.length) {
          const site = undiscovered[Math.floor(Math.random() * undiscovered.length)];
          next.discoveries.push(site.id);
          if (site.loot === "water") next.water = limit(next.water + 2);
          if (site.loot === "food") next.food = limit(next.food + 2);
          if (site.loot === "materials") { next.wood = limit(next.wood + 1); next.rope = limit(next.rope + 1); }
          if (site.loot === "medicine") next.medicine = limit(next.medicine + 1);
          if (site.loot === "signal") next.signal = limit(next.signal + 1);
          message = site.text;
        } else {
          next.food = limit(next.food + 1);
          next.water = limit(next.water + 1);
          message = "Vocês revisitaram a ilha e encontraram alguns suprimentos úteis.";
        }
        break;
      }
      case "shelter":
        next.wood -= 2;
        next.shelter = limit(next.shelter + 1, 3);
        message = `O abrigo chegou ao nível ${next.shelter} e protege melhor a equipe.`;
        break;
      case "fire":
        next.wood -= 1;
        next.fire = 1;
        message = "A fogueira foi preparada. Ela ajudará nas noites frias.";
        break;
      case "vines":
        next.rope = limit(next.rope + 1);
        message = "Os cipós foram trançados em uma corda resistente.";
        break;
      case "signal":
        next.wood -= 2;
        next.signal = limit(next.signal + 1);
        message = "A coluna de fumaça ficou mais forte e visível ao longe.";
        break;
      case "treat":
        next.medicine -= 1;
        next.health[next.player - 1] = Math.min(3, next.health[next.player - 1] + 2);
        message = `${playerName} recebeu cuidados e recuperou forças.`;
        break;
      case "rest":
        next.health[next.player - 1] = Math.min(3, next.health[next.player - 1] + 1);
        next.morale = limit(next.morale + 1, 10);
        message = `${playerName} descansou. A equipe recuperou um pouco do ânimo.`;
        break;
      case "raft":
        next.wood -= 4;
        next.rope -= 2;
        next.crafted.push("raft");
        message = "A balsa ficou pronta. Agora existe uma rota de saída da ilha.";
        break;
    }

    appendLog(next, `Dia ${game.day} · ${playerName}: ${message}`);
    setGame({
      ...next,
      phase: game.player === 1 ? ((solo || sync.online) ? "action" : "handoff") : "night",
      player: game.player === 1 ? 2 : 1,
    });
    setFeedback(message);
    setChoice(null);
  }

  function continueTurn() {
    if (game.phase !== "handoff") return;
    setGame({ ...game, phase: "action" });
    setFeedback("Agora é a vez da Pessoa 2. Confiram os recursos e escolham a próxima ação.");
  }

  function resolveNight(state: SurvivalState): SurvivalState {
    const next: SurvivalState = { ...state, health: [...state.health] as [number, number], day: state.day + 1, log: [...state.log] };
    const notes: string[] = [];
    if (state.food > 0) next.food -= 1;
    else {
      next.health = next.health.map((value) => Math.max(0, value - 1)) as [number, number];
      next.morale = Math.max(0, next.morale - 1);
      notes.push("A comida acabou. A equipe perdeu energia durante a noite.");
    }
    if (state.water > 0) next.water -= 1;
    else {
      next.health = next.health.map((value) => Math.max(0, value - 1)) as [number, number];
      next.morale = Math.max(0, next.morale - 1);
      notes.push("Faltou água potável. A saúde dos sobreviventes foi afetada.");
    }
    if (state.weather === "rain") {
      next.water = limit(next.water + 1);
      notes.push("A chuva abasteceu um dos recipientes.");
    }
    if (state.weather === "storm" && state.shelter < 2 && state.fire === 0) {
      next.health = next.health.map((value) => Math.max(0, value - 1)) as [number, number];
      next.morale = Math.max(0, next.morale - 1);
      notes.push("A tempestade danificou o acampamento e abalou a equipe.");
    }
    if (state.weather === "cold" && state.fire === 0) {
      next.morale = Math.max(0, next.morale - 1);
      notes.push("O frio tornou a noite mais difícil.");
    }
    if (state.fire > 0) {
      next.morale = limit(next.morale + 1, 10);
      next.fire = 0;
      notes.push("A fogueira aqueceu o acampamento, mas precisa ser refeita amanhã.");
    }
    if (next.health.every((value) => value <= 0) || next.morale <= 0) {
      next.phase = "lost";
      next.ending = "A equipe perdeu as forças antes de conseguir deixar a ilha. O diário registra as decisões que levaram a esse resultado.";
    } else if (state.day >= 7) {
      if (isBuilt(state, "raft")) {
        next.phase = "won";
        next.ending = "A balsa ficou pronta. Com os recursos restantes, vocês atravessaram a enseada e alcançaram uma rota segura de resgate.";
      } else if (state.signal >= 3) {
        next.phase = "won";
        next.ending = "O sinal foi visto de longe. Uma embarcação de busca encontrou a ilha e se aproximou do acampamento.";
      } else {
        next.phase = "lost";
        next.ending = "A janela de busca terminou sem que o sinal fosse visto. Vocês sobreviveram, mas precisarão de outra estratégia para sair da ilha.";
      }
    } else {
      next.phase = "action";
      next.player = 1;
      next.weather = weatherCycle[next.day] ?? "sunny";
    }
    next.log = [...notes, ...next.log].slice(0, 12);
    return next;
  }

  function endDay() {
    if (game.phase !== "night") return;
    const next = resolveNight(game);
    setGame(next);
    setFeedback(next.phase === "won" || next.phase === "lost" ? next.ending : "A noite terminou. Revejam os recursos e planejem o próximo dia.");
    setChoice(null);
  }

  function restart() {
    if (!sync.online) localStorage.removeItem(STORAGE);
    setGame(initial);
    setChoice(null);
    setFeedback("A tempestade deixou vocês em uma ilha desconhecida. O resgate pode demorar sete dias.");
  }

  const selectedAction = actions.find((action) => action.id === choice);
  const discoveryNames = found.map((item) => item.title);
  const roleText = solo ? (game.player === 1 ? "Sua primeira decisão do dia" : "Sua segunda decisão do dia") : `Decisão da Pessoa ${game.player}`;

  return (
    <section className={"island-survival-game is-expanded" + (solo ? " is-solo" : "")}>
      <header className="island-survival-hero">
        <div className="island-survival-topline">
          <span className="island-survival-kicker">CAMPANHA DE SOBREVIVÊNCIA · 7 DIAS</span>
          <span className="island-weather-chip"><WeatherIcon aria-hidden="true"/> {weather.label}</span>
        </div>
        <h2>Depois da tempestade</h2>
        <p>{solo ? "Você lidera dois sobreviventes. Administre recursos, explore a ilha e escolha como escapar." : "Vocês chegaram a uma ilha desconhecida. Dividam tarefas, construam um acampamento e encontrem uma rota de resgate."}</p>
        <div className="island-survival-scene"><div className="island-sun"><Sun/></div><div className="island-islet"/><div className="island-water"/></div>
        <div className="island-survival-day"><span>DIA {Math.min(game.day, 7)} DE 7 · {(dayNames[game.day] ?? "Último dia").toUpperCase()}</span><strong>{Math.round(progress)}%</strong></div>
        <div className="island-survival-progress"><span style={{ width: progress + "%" }}/></div>
        <p className="island-weather-note">{weather.note}</p>
      </header>

      <div className="island-expanded-resource-grid">
        <Resource icon={Leaf} label="Comida" value={game.food}/>
        <Resource icon={Droplets} label="Água" value={game.water}/>
        <Resource icon={Trees} label="Madeira" value={game.wood}/>
        <Resource icon={Package} label="Remédios" value={game.medicine}/>
        <Resource icon={Wrench} label="Cordas" value={game.rope}/>
        <Resource icon={Sparkles} label="Sinal" value={game.signal}/>
        <Resource icon={Tent} label="Abrigo" value={game.shelter + "/3"}/>
        <Resource icon={Flame} label="Fogueira" value={game.fire ? "Acesa" : "Apagada"}/>
      </div>

      <div className="island-health-row">
        {[0, 1].map((index) => <div key={index}><span>Sobrevivente {index + 1}</span><div>{Array.from({ length: 3 }, (_, heart) => <HeartPulse key={heart} className={game.health[index] > heart ? "is-alive" : "is-empty"}/>)}</div></div>)}
        <span>Ânimo coletivo · {game.morale}/10</span>
      </div>

      <section className="island-camp-panel">
        <div className="island-camp-heading"><span><Map aria-hidden="true"/></span><div><strong>Mapa de exploração</strong><small>{found.length} de {discoveries.length} locais descobertos</small></div><span className="island-camp-count">{found.length}/{discoveries.length}</span></div>
        <div className="island-discovery-list">
          {discoveries.map((site) => <span key={site.id} className={game.discoveries.includes(site.id) ? "is-found" : ""}>{game.discoveries.includes(site.id) ? "✓" : "?"} {game.discoveries.includes(site.id) ? site.title : "Local desconhecido"}</span>)}
        </div>
        <div className={"island-raft-status" + (raftReady ? " is-ready" : "")}><Ship aria-hidden="true"/><span><strong>{raftReady ? "Balsa pronta" : "Plano de fuga: balsa"}</strong><small>{raftReady ? "Uma saída alternativa está preparada." : "Requer 4 madeiras e 2 cordas."}</small></span></div>
      </section>

      {!solo && game.phase === "handoff" && <div className="island-handoff"><span><Wind/></span><p className="date-kicker">TROCA DE TURNO</p><h3>Passe o aparelho para a Pessoa 2.</h3><p>A ação anterior foi registrada. A próxima pessoa pode escolher outra tarefa para o acampamento.</p><button type="button" onClick={continueTurn}>Estou pronto</button></div>}

      {game.phase === "action" && (
        <section className="island-actions-panel is-expanded-actions">
          <div className="island-actions-heading"><span className="date-kicker">{roleText.toUpperCase()}</span><h3>O que será prioridade agora?</h3><p>Vocês têm duas ações por dia. Combinem coleta, exploração e construções para chegar ao sétimo dia.</p></div>
          <div className="island-action-grid">
            {visibleActions.map((action) => {
              const Icon = action.icon;
              return <button key={action.id} type="button" className={choice === action.id ? "is-selected" : ""} disabled={action.disabled} onClick={() => setChoice(action.id)}>
                <span className={"island-action-icon action-" + action.id}><Icon aria-hidden="true"/></span>
                <span><strong>{action.title}</strong><small>{action.description}</small><em>{action.cost}</em></span>
              </button>;
            })}
          </div>
          <button type="button" className="island-confirm-action" disabled={!choice} onClick={() => choice && applyAction(choice)}>{selectedAction ? `Confirmar: ${selectedAction.title}` : "Escolher uma ação"}</button>
        </section>
      )}

      {game.phase === "night" && <div className="island-night-panel"><span><CloudRain/></span><p className="date-kicker">FIM DO DIA {game.day}</p><h3>Preparados para passar a noite?</h3><p>Comida e água serão consumidas. A condição do abrigo, o clima e a fogueira podem mudar a saúde e o ânimo da equipe.</p><button type="button" onClick={endDay}>Encerrar o dia e passar a noite</button></div>}

      {(game.phase === "won" || game.phase === "lost") && <div className={"island-ending " + (game.phase === "won" ? "is-won" : "is-lost")}><Trophy/><span className="date-kicker">{game.phase === "won" ? "EXPEDIÇÃO CONCLUÍDA" : "FIM DA EXPEDIÇÃO"}</span><h3>{game.phase === "won" ? "Vocês conseguiram sair da ilha!" : "A expedição terminou."}</h3><p>{game.ending}</p><div><strong>Resultado final</strong><span>Comida {game.food} · Água {game.water} · Madeira {game.wood} · Sinal {game.signal}</span></div><button type="button" onClick={restart}>Jogar novamente</button></div>}

      <div className="island-feedback"><Leaf/><p>{feedback}</p></div>
      <details className="island-log"><summary>Diário da expedição · {game.log.length} registros</summary><ol>{game.log.map((line, index) => <li key={index}>{line}</li>)}</ol></details>
      <footer className="island-footer"><span>{solo ? "Você controla as duas decisões diárias." : sync.online ? "Progresso cooperativo sincronizado." : "Duas pessoas · mesmo aparelho."}</span><button type="button" onClick={restart}><RotateCcw/> Reiniciar</button></footer>
    </section>
  );
}

function Resource({ icon: Icon, label, value }: { icon: typeof Leaf; label: string; value: number | string }) {
  return <div className="island-resource"><Icon/><span>{label}</span><strong>{value}</strong></div>;
}
