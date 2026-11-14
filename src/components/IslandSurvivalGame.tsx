import { useEffect, useMemo, useState } from "react";
import {
  Anchor, CloudRain, Compass, Droplets, Flame, HeartPulse, Map,
  Package, Radio, RotateCcw, Shield, Ship, Sparkles, Sun, Tent, Trees, Waves,
  Wind, Wrench, Utensils, ThermometerSun, ChevronRight, CheckCircle2,
} from "lucide-react";
import { useGameState } from "@/components/OnlineGameHost";
import { GameVictoryScreen, useGameAudio } from "@/components/GameExperience";

type Weather = "clear" | "rain" | "storm" | "heat" | "cold";
type ZoneId = "beach" | "forest" | "stream" | "wreck" | "cave" | "ridge";
type EventId = "downpour" | "injury" | "distantSignal";
type Resources = { food: number; water: number; wood: number; cloth: number; metal: number; medicine: number; rope: number };
type SurvivalState = {
  day: number;
  phase: "action" | "event" | "night" | "won" | "lost";
  weather: Weather;
  resources: Resources;
  health: [number, number];
  fatigue: [number, number];
  morale: number;
  shelter: number;
  fire: number;
  beacon: number;
  raft: number;
  discovered: ZoneId[];
  selectedZone: ZoneId;
  actionsLeft: number;
  event: EventId | null;
  eventResolved: boolean;
  log: string[];
  ending: string;
};
const MAX_HEALTH = 5;
const RESOURCE_LIMIT = 18;
const initial: SurvivalState = {
  day: 1,
  phase: "action",
  weather: "clear",
  resources: { food: 6, water: 6, wood: 3, cloth: 1, metal: 0, medicine: 1, rope: 0 },
  health: [5, 5],
  fatigue: [0, 0],
  morale: 6,
  shelter: 1,
  fire: 0,
  beacon: 0,
  raft: 0,
  discovered: ["beach"],
  selectedZone: "beach",
  actionsLeft: 4,
  event: null,
  eventResolved: true,
  log: ["Dia 1 · O barco encalhou durante a tempestade. O resgate pode demorar uma semana."],
  ending: "",
};
const weatherByDay: Weather[] = ["clear", "rain", "storm", "clear", "cold", "heat", "rain", "clear"];
const zones: Array<{ id: ZoneId; name: string; icon: typeof Waves; description: string; loot: string }> = [
  { id: "beach", name: "Praia do Naufrágio", icon: Waves, description: "Maré, mariscos e destroços espalhados pela areia.", loot: "Comida e madeira" },
  { id: "forest", name: "Mata Fechada", icon: Trees, description: "Frutos, cipós e madeira seca, mas há animais por perto.", loot: "Comida, corda e madeira" },
  { id: "stream", name: "Nascente", icon: Droplets, description: "Água potável protegida por pedras e vegetação.", loot: "Água e plantas medicinais" },
  { id: "wreck", name: "Casco Partido", icon: Anchor, description: "O porão do navio ainda guarda ferramentas e peças úteis.", loot: "Metal, tecido e ferramentas" },
  { id: "cave", name: "Gruta de Calcário", icon: Compass, description: "Uma passagem seca pode servir de abrigo e esconder suprimentos.", loot: "Remédios e abrigo" },
  { id: "ridge", name: "Mirante do Farol", icon: Radio, description: "Um ponto alto para montar um sinal visível no horizonte.", loot: "Peças para o rádio" },
];
const weatherInfo: Record<Weather, { title: string; detail: string; icon: typeof Sun }> = {
  clear: { title: "Céu aberto", detail: "Boa visibilidade. Explorar custa menos esforço.", icon: Sun },
  rain: { title: "Chuva persistente", detail: "A chuva pode abastecer recipientes, mas aumenta o desgaste.", icon: CloudRain },
  storm: { title: "Tempestade", detail: "Abrigo frágil sofre danos. Evitem permanecer na praia.", icon: Wind },
  heat: { title: "Calor intenso", detail: "A água será ainda mais importante durante a noite.", icon: ThermometerSun },
  cold: { title: "Frio úmido", detail: "Uma fogueira evita a perda de ânimo e protege a equipe.", icon: ThermometerSun },
};
const eventData: Record<EventId, { title: string; text: string; options: Array<{ id: string; label: string; detail: string }> }> = {
  downpour: {
    title: "A chuva tomou o acampamento",
    text: "A lona rasgou durante a noite. Vocês precisam decidir o que salvar antes que a água alcance os suprimentos.",
    options: [
      { id: "dry", label: "Salvar os suprimentos", detail: "Gastar tecido para proteger comida e remédios." },
      { id: "collect", label: "Aproveitar a chuva", detail: "Recolher água e aceitar perder um pouco de material." },
    ],
  },
  injury: {
    title: "Um acidente na mata",
    text: "Um dos sobreviventes caiu em uma encosta. O corte não parece profundo, mas precisa de cuidado.",
    options: [
      { id: "medicate", label: "Usar o kit médico", detail: "Consumir um remédio e recuperar saúde." },
      { id: "splint", label: "Improvisar uma tala", detail: "Usar madeira e tecido; a recuperação será mais lenta." },
    ],
  },
  distantSignal: {
    title: "Uma luz no horizonte",
    text: "Ao anoitecer, uma luz piscou três vezes além da enseada. Pode ser uma embarcação ou outro náufrago.",
    options: [
      { id: "answer", label: "Responder com o sinalizador", detail: "Gastar metal e aumentar a chance de resgate." },
      { id: "wait", label: "Observar antes de agir", detail: "Preservar recursos e ganhar ânimo." },
    ],
  },
};
const clamp = (value: number, max = RESOURCE_LIMIT) => Math.max(0, Math.min(max, value));
const copyState = (state: SurvivalState): SurvivalState => ({
  ...state,
  resources: { ...state.resources },
  health: [...state.health] as [number, number],
  fatigue: [...state.fatigue] as [number, number],
  discovered: [...state.discovered],
  log: [...state.log],
});

export function IslandSurvivalGame({ solo = false }: { solo?: boolean }) {
  const [game, setGame, sync] = useGameState<SurvivalState>(() => initial, {
    onlineInitial: initial,
    outcome: (state) => state.phase === "won" || state.phase === "lost" ? { kind: "complete" } : null,
  });
  const [notice, setNotice] = useState("");
  const { play } = useGameAudio();
  const weather = weatherInfo[game.weather];
  const WeatherIcon = weather.icon;
  const selectedZone = zones.find((zone) => zone.id === game.selectedZone) ?? zones[0];
  const event = game.event ? eventData[game.event] : null;
  const progress = game.phase === "won" ? 100 : Math.min(100, Math.round(((game.day - 1) / 6) * 100));
  const victoryStats = [
    { label: "Dias", value: "7/7" },
    { label: "Saúde", value: game.health[0] + game.health[1] + "/10" },
    { label: "Sinal", value: game.beacon + "/4" },
    { label: "Balsa", value: game.raft + "/3" },
  ];
  const objectiveText = game.beacon >= 4 || game.raft >= 3
    ? "Plano de fuga pronto. Protejam a equipe até a próxima janela de resgate."
    : "Preparem um sinal de rádio (4 peças) ou uma balsa (3 etapas) antes do sétimo dia.";

  useEffect(() => {
    if (game.phase === "won") play("success");
    if (game.phase === "lost") play("warning");
  }, [game.phase, play]);

  function spendAction(next: SurvivalState, message: string, sound: "move" | "discovery" | "impact" = "move") {
    next.actionsLeft = Math.max(0, next.actionsLeft - 1);
    next.log = [("Dia " + next.day + " · " + message), ...next.log].slice(0, 7);
    if (next.actionsLeft === 0) next.phase = "night";
    setGame(next);
    setNotice(message);
    play(sound);
  }

  function selectZone(zone: ZoneId) {
    if (game.phase !== "action" || !game.discovered.includes(zone)) return;
    setGame((current) => ({ ...current, selectedZone: zone }));
    play("tap");
  }

  function explore() {
    if (game.phase !== "action" || game.actionsLeft <= 0) return;
    const next = copyState(game);
    const zone = selectedZone.id;
    const alreadyFound = next.discovered.includes(zone);
    if (!alreadyFound) return;
    switch (zone) {
      case "beach":
        next.resources.food = clamp(next.resources.food + 2);
        next.resources.wood = clamp(next.resources.wood + 1);
        spendAction(next, "A maré baixa revelou mariscos e tábuas que ainda podem ser aproveitadas.");
        break;
      case "forest":
        next.resources.food = clamp(next.resources.food + 3);
        if (Math.random() > 0.45) next.resources.rope = clamp(next.resources.rope + 1);
        next.fatigue[0] = Math.min(5, next.fatigue[0] + 1);
        spendAction(next, "A mata forneceu alimento e cipós. A caminhada exigiu esforço.", "discovery");
        break;
      case "stream":
        next.resources.water = clamp(next.resources.water + 4);
        if (Math.random() > 0.55) next.resources.medicine = clamp(next.resources.medicine + 1);
        spendAction(next, "A nascente abasteceu os recipientes. Plantas medicinais foram encontradas perto das pedras.", "discovery");
        break;
      case "wreck":
        next.resources.metal = clamp(next.resources.metal + 2);
        next.resources.cloth = clamp(next.resources.cloth + 1);
        next.resources.wood = clamp(next.resources.wood + 1);
        spendAction(next, "O porão do casco revelou chapas, tecido e ferramentas aproveitáveis.", "discovery");
        break;
      case "cave":
        next.shelter = Math.min(3, next.shelter + 1);
        if (next.resources.medicine < 3) next.resources.medicine = clamp(next.resources.medicine + 1);
        spendAction(next, "A gruta oferece um abrigo mais seguro e um pequeno estoque médico.", "discovery");
        break;
      case "ridge":
        next.resources.metal = clamp(next.resources.metal + 1);
        next.beacon = Math.min(4, next.beacon + 1);
        spendAction(next, "Do mirante, vocês recuperaram uma peça de rádio e melhoraram a posição do sinal.", "discovery");
        break;
    }
  }

  function discoverZone(zone: ZoneId) {
    if (game.phase !== "action" || game.actionsLeft <= 0 || game.discovered.includes(zone)) return;
    const next = copyState(game);
    next.discovered.push(zone);
    next.selectedZone = zone;
    const reward: Record<ZoneId, Partial<Resources>> = {
      beach: { food: 2, wood: 1 },
      forest: { food: 2, rope: 1 },
      stream: { water: 3, medicine: 1 },
      wreck: { metal: 2, cloth: 1 },
      cave: { medicine: 1, wood: 1 },
      ridge: { metal: 1 },
    };
    Object.entries(reward[zone]).forEach(([key, value]) => {
      next.resources[key as keyof Resources] = clamp(next.resources[key as keyof Resources] + (value ?? 0));
    });
    spendAction(next, "Nova região descoberta: " + zones.find((item) => item.id === zone)?.name + ". Suprimentos foram recolhidos.", "discovery");
  }

  function perform(action: "water" | "craft" | "fire" | "signal" | "raft" | "rest" | "treat") {
    if (game.phase !== "action" || game.actionsLeft <= 0) return;
    const next = copyState(game);
    const r = next.resources;
    let message = "";
    if (action === "water") {
      r.water = clamp(r.water + 3);
      message = "Vocês filtraram e armazenaram água para a próxima noite.";
    } else if (action === "craft") {
      if (r.wood < 3 || r.cloth < 1) { setNotice("Para reforçar o abrigo são necessárias 3 madeiras e 1 tecido."); return; }
      r.wood -= 3; r.cloth -= 1; next.shelter = Math.min(3, next.shelter + 1);
      message = "O abrigo foi reforçado. Agora suporta melhor a chuva e o vento.";
    } else if (action === "fire") {
      if (r.wood < 2) { setNotice("Faltam 2 madeiras para preparar a fogueira."); return; }
      r.wood -= 2; next.fire = 1; message = "A fogueira está pronta para proteger o acampamento durante a noite.";
    } else if (action === "signal") {
      if (r.metal < 1 || r.wood < 1) { setNotice("O sinalizador precisa de 1 metal e 1 madeira."); return; }
      r.metal -= 1; r.wood -= 1; next.beacon = Math.min(4, next.beacon + 1);
      message = "O rádio foi reparado em mais uma etapa. O sinal pode alcançar embarcações mais distantes.";
    } else if (action === "raft") {
      if (r.wood < 2 || r.rope < 1 || r.metal < 1) { setNotice("A balsa exige 2 madeiras, 1 corda e 1 peça de metal."); return; }
      r.wood -= 2; r.rope -= 1; r.metal -= 1; next.raft = Math.min(3, next.raft + 1);
      message = "A estrutura da balsa avançou. Ainda é preciso reforçar o casco e preparar as amarras.";
    } else if (action === "rest") {
      next.fatigue = [Math.max(0, next.fatigue[0] - 2), Math.max(0, next.fatigue[1] - 2)];
      next.health = [Math.min(MAX_HEALTH, next.health[0] + 1), Math.min(MAX_HEALTH, next.health[1] + 1)];
      next.morale = Math.min(10, next.morale + 1);
      message = "A equipe descansou, recuperou saúde e reduziu o cansaço.";
    } else if (action === "treat") {
      if (r.medicine < 1) { setNotice("Não há remédios no inventário."); return; }
      r.medicine -= 1; next.health = [Math.min(MAX_HEALTH, next.health[0] + 2), Math.min(MAX_HEALTH, next.health[1] + 2)];
      message = "O kit médico foi usado. Os dois sobreviventes recuperaram saúde.";
    }
    spendAction(next, message, action === "rest" || action === "treat" ? "success" : "move");
  }

  function chooseEvent(option: string) {
    if (game.phase !== "event" || !game.event) return;
    const next = copyState(game);
    if (game.event === "downpour" && option === "dry") {
      if (next.resources.cloth > 0) { next.resources.cloth -= 1; next.resources.food = clamp(next.resources.food + 1); }
      else next.morale = Math.max(0, next.morale - 1);
      next.log = ["A equipe cobriu os suprimentos. Parte da comida foi preservada.", ...next.log];
    } else if (game.event === "downpour") {
      next.resources.water = clamp(next.resources.water + 4);
      next.resources.cloth = clamp(next.resources.cloth - 1);
      next.log = ["Vocês aproveitaram a chuva e encheram os recipientes.", ...next.log];
    } else if (game.event === "injury" && option === "medicate") {
      if (next.resources.medicine > 0) { next.resources.medicine -= 1; next.health[0] = Math.min(MAX_HEALTH, next.health[0] + 2); }
      else next.fatigue[0] = Math.min(5, next.fatigue[0] + 1);
      next.log = ["O ferimento foi tratado com o que havia no kit.", ...next.log];
    } else if (game.event === "injury") {
      next.resources.wood = clamp(next.resources.wood - 1);
      next.resources.cloth = clamp(next.resources.cloth - 1);
      next.fatigue[0] = Math.min(5, next.fatigue[0] + 1);
      next.log = ["Uma tala improvisada estabilizou o ferimento, mas exigiu esforço.", ...next.log];
    } else if (game.event === "distantSignal" && option === "answer") {
      if (next.resources.metal > 0) next.resources.metal -= 1;
      next.beacon = Math.min(4, next.beacon + 1);
      next.log = ["O sinalizador respondeu à luz distante. Uma embarcação pode ter percebido a mensagem.", ...next.log];
    } else {
      next.morale = Math.min(10, next.morale + 1);
      next.log = ["Vocês aguardaram e observaram. O grupo recuperou o ânimo.", ...next.log];
    }
    next.phase = "action";
    next.event = null;
    next.eventResolved = true;
    next.log = next.log.slice(0, 7);
    setGame(next);
    setNotice("Decisão registrada. O grupo pode continuar.");
    play("discovery");
  }

  function resolveNight() {
    if (game.phase !== "night") return;
    const next = copyState(game);
    const r = next.resources;
    const foodNeed = 2;
    const waterNeed = next.weather === "heat" ? 3 : 2;
    if (r.food >= foodNeed) r.food -= foodNeed;
    else {
      next.health = next.health.map((hp) => Math.max(0, hp - 1)) as [number, number];
      next.morale = Math.max(0, next.morale - 2);
      r.food = 0;
      next.log = ["A comida não foi suficiente. A equipe perdeu forças durante a noite.", ...next.log];
    }
    if (r.water >= waterNeed) r.water -= waterNeed;
    else {
      next.health = next.health.map((hp) => Math.max(0, hp - 1)) as [number, number];
      next.morale = Math.max(0, next.morale - 2);
      r.water = 0;
      next.log = ["Faltou água potável. A saúde dos sobreviventes foi afetada.", ...next.log];
    }
    if (next.weather === "rain") r.water = clamp(r.water + 1);
    if (next.weather === "storm" && next.shelter < 2) {
      next.health = next.health.map((hp) => Math.max(0, hp - 1)) as [number, number];
      next.shelter = Math.max(0, next.shelter - 1);
      next.log = ["A tempestade danificou o abrigo e feriu a equipe.", ...next.log];
    }
    if ((next.weather === "cold" || next.weather === "heat") && next.fire === 0 && next.shelter < 2) {
      next.morale = Math.max(0, next.morale - 1);
      next.log = ["A temperatura extrema tornou o descanso mais difícil.", ...next.log];
    }
    if (next.fire > 0) {
      next.fire = 0;
      next.morale = Math.min(10, next.morale + 1);
    }
    next.fatigue = [Math.min(5, next.fatigue[0] + 1), Math.min(5, next.fatigue[1] + 1)];
    if (next.health.every((hp) => hp <= 0) || next.morale <= 0) {
      next.phase = "lost";
      next.ending = "A equipe perdeu as forças antes de concluir o plano de resgate.";
    } else if (next.day >= 7) {
      next.phase = next.beacon >= 4 || next.raft >= 3 ? "won" : "lost";
      next.ending = next.phase === "won"
        ? (next.beacon >= 4 ? "O sinal foi identificado por uma equipe de busca. Um barco alcançou a ilha ao amanhecer." : "A balsa ficou pronta e atravessou a enseada até uma rota segura.")
        : "A janela de resgate terminou. A equipe ainda estava na ilha e precisará tentar uma nova expedição.";
    } else {
      next.day += 1;
      next.weather = weatherByDay[next.day - 1] ?? "clear";
      next.actionsLeft = 4;
      next.phase = "action";
      next.event = next.day === 2 ? "downpour" : next.day === 4 ? "injury" : next.day === 6 ? "distantSignal" : null;
      if (next.event) next.phase = "event";
      next.eventResolved = !next.event;
    }
    next.log = next.log.slice(0, 7);
    setGame(next);
    setNotice(next.ending || "A noite passou. Um novo dia começou na ilha.");
    play(next.phase === "won" ? "success" : next.phase === "lost" ? "warning" : "move");
  }

  function restart() {
    setGame(initial);
    setNotice("A expedição recomeçou. Planejem bem os quatro movimentos de cada dia.");
    play("tap");
  }

  return (
    <section className="island-survival-game immersive-survival-game">
      {(game.phase === "won" || game.phase === "lost") && (
        <GameVictoryScreen
          won={game.phase === "won"}
          title={game.phase === "won" ? "Vocês voltaram para casa!" : "A ilha venceu desta vez"}
          subtitle={game.ending}
          eyebrow={game.phase === "won" ? "RESGATE CONCLUÍDO" : "EXPEDIÇÃO ENCERRADA"}
          stats={victoryStats}
          onReplay={restart}
          onExit={() => window.dispatchEvent(new Event("morados:game-exit"))}
        />
      )}

      {game.phase !== "won" && game.phase !== "lost" && (
        <>
          <header className="survival-expedition-hero">
            <div className="survival-expedition-top">
              <div><span className="survival-kicker">SOBREVIVÊNCIA · DIA {game.day}/7</span><h2>Ilha do Último Sinal</h2><p>Um plano de resgate, dois sobreviventes e recursos que não podem ser desperdiçados.</p></div>
              <div className="survival-weather"><WeatherIcon/><strong>{weather.title}</strong><small>{weather.detail}</small></div>
            </div>
            <div className="survival-day-track"><span style={{ width: progress + "%" }}/></div>
            <div className="survival-day-meta"><span>Faltam {Math.max(0, 7 - game.day)} noites</span><span>{game.actionsLeft} decisões disponíveis</span></div>
          </header>

          <div className="survival-resource-strip">
            {([
              ["Comida", game.resources.food, Utensils],
              ["Água", game.resources.water, Droplets],
              ["Madeira", game.resources.wood, Trees],
              ["Tecido", game.resources.cloth, Package],
              ["Metal", game.resources.metal, Wrench],
              ["Remédios", game.resources.medicine, HeartPulse],
              ["Corda", game.resources.rope, Anchor],
            ] as const).map(([label, value, Icon]) => <div key={label}><Icon/><span>{label}</span><strong>{value}</strong></div>)}
          </div>

          <div className="survival-crew-strip">
            {[0, 1].map((index) => (
              <div key={index} className="survival-crew-member">
                <span className={"survival-portrait portrait-" + index}>{index === 0 ? "🧭" : "🪓"}</span>
                <div><strong>{index === 0 ? "Lia · Navegadora" : "Noah · Mecânico"}</strong><small>{game.health[index]}/5 saúde · {game.fatigue[index]}/5 cansaço</small>
                  <div className="survival-health-track"><i style={{ width: (game.health[index] / 5 * 100) + "%" }}/></div>
                </div>
              </div>
            ))}
            <div className="survival-morale"><Sparkles/><span>Ânimo</span><strong>{game.morale}/10</strong></div>
          </div>

          {game.phase === "event" && event && (
            <section className="survival-event-panel">
              <span className="survival-kicker">DECISÃO URGENTE · DIA {game.day}</span>
              <h3>{event.title}</h3>
              <p>{event.text}</p>
              <div>{event.options.map((option) => <button type="button" key={option.id} onClick={() => chooseEvent(option.id)}><strong>{option.label}</strong><small>{option.detail}</small><ChevronRight/></button>)}</div>
            </section>
          )}

          {game.phase === "action" && (
            <>
              <section className="survival-island-map">
                <div className="survival-section-heading"><div><span className="survival-kicker">MAPA DE OPERAÇÕES</span><h3>Escolham onde agir</h3></div><span>{game.discovered.length}/6 regiões</span></div>
                <div className="survival-zone-grid">
                  {zones.map((zone) => {
                    const Icon = zone.icon;
                    const discovered = game.discovered.includes(zone.id);
                    return <button type="button" key={zone.id} className={(game.selectedZone === zone.id ? "is-selected " : "") + (discovered ? "is-discovered" : "is-unknown")} onClick={() => discovered ? selectZone(zone.id) : discoverZone(zone.id)} disabled={game.actionsLeft <= 0}>
                      <span className="survival-zone-icon">{discovered ? <Icon/> : "?"}</span>
                      <span><strong>{discovered ? zone.name : "Área desconhecida"}</strong><small>{discovered ? zone.description : "Investigar região"}</small></span>
                      <em>{discovered ? "Selecionar" : "Explorar"}</em>
                    </button>;
                  })}
                </div>
                <div className="survival-selected-zone"><div><span className="survival-kicker">REGIÃO SELECIONADA</span><strong>{selectedZone.name}</strong><small>{selectedZone.loot}</small></div><button type="button" onClick={explore} disabled={game.actionsLeft <= 0}>Vasculhar região <Compass/></button></div>
              </section>

              <section className="survival-command-panel">
                <div className="survival-section-heading"><div><span className="survival-kicker">CENTRAL DE COMANDO</span><h3>Decidam o próximo passo</h3></div><span>{game.actionsLeft} ações restantes</span></div>
                <div className="survival-action-grid">
                  <button type="button" onClick={() => perform("water")}><span className="action-icon tone-blue"><Droplets/></span><strong>Filtrar água</strong><small>+3 água · um movimento</small></button>
                  <button type="button" onClick={() => perform("craft")}><span className="action-icon tone-green"><Tent/></span><strong>Reforçar abrigo</strong><small>−3 madeira, −1 tecido · melhora proteção</small></button>
                  <button type="button" onClick={() => perform("fire")}><span className="action-icon tone-orange"><Flame/></span><strong>Acender fogueira</strong><small>−2 madeira · protege esta noite</small></button>
                  <button type="button" onClick={() => perform("signal")}><span className="action-icon tone-violet"><Radio/></span><strong>Reparar rádio</strong><small>−1 metal, −1 madeira · +1 sinal</small></button>
                  <button type="button" onClick={() => perform("raft")}><span className="action-icon tone-sand"><Ship/></span><strong>Construir balsa</strong><small>−2 madeira, −1 corda, −1 metal</small></button>
                  <button type="button" onClick={() => perform("treat")}><span className="action-icon tone-red"><HeartPulse/></span><strong>Tratar ferimentos</strong><small>−1 remédio · +2 saúde para cada</small></button>
                  <button type="button" onClick={() => perform("rest")}><span className="action-icon tone-plum"><Shield/></span><strong>Descansar</strong><small>−2 cansaço · +1 saúde e ânimo</small></button>
                </div>
                <div className="survival-project-status">
                  <div><span><Radio/> Rádio</span><strong>{game.beacon}/4</strong><i><b style={{ width: (game.beacon / 4 * 100) + "%" }}/></i></div>
                  <div><span><Ship/> Balsa</span><strong>{game.raft}/3</strong><i><b style={{ width: (game.raft / 3 * 100) + "%" }}/></i></div>
                  <div><span><Tent/> Abrigo</span><strong>{game.shelter}/3</strong><i><b style={{ width: (game.shelter / 3 * 100) + "%" }}/></i></div>
                </div>
              </section>
            </>
          )}

          {game.phase === "night" && (
            <section className="survival-night-panel">
              <div className="survival-night-art">🌘</div>
              <span className="survival-kicker">FIM DO DIA {game.day}</span>
              <h3>O acampamento precisa atravessar a noite.</h3>
              <p>Consumo estimado: 2 alimentos e {game.weather === "heat" ? 3 : 2} águas. A tempestade, o abrigo e a fogueira podem alterar a saúde dos sobreviventes.</p>
              <button type="button" onClick={resolveNight}>Passar a noite <ChevronRight/></button>
            </section>
          )}

          <section className="survival-mission-card">
            <div><span className="survival-kicker">OBJETIVO PRINCIPAL</span><strong>Conseguir sair da ilha</strong><p>{objectiveText}</p></div>
            <div className="survival-mission-icon"><Radio/></div>
          </section>

          <div className="survival-chronicle"><div className="survival-section-heading"><div><span className="survival-kicker">DIÁRIO DE BORDO</span><h3>O que já aconteceu</h3></div></div>{game.log.map((entry, index) => <p key={index}><span>{String(game.log.length - index).padStart(2, "0")}</span>{entry}</p>)}</div>
          {notice && <p className="survival-notice" role="status">{notice}</p>}
          <footer className="survival-footer"><span>{sync.online ? "Campanha compartilhada entre os dois aparelhos." : solo ? "Você comanda os dois sobreviventes." : "Duas pessoas · mesmo aparelho."}</span><button type="button" onClick={restart}><RotateCcw/> Reiniciar campanha</button></footer>
        </>
      )}
    </section>
  );
}
