import { useEffect, useMemo, useState } from "react";
import {
  Anchor, CloudRain, Compass, Droplets, Flame, HeartPulse, Map,
  Package, Radio, RotateCcw, Shield, Ship, Sparkles, Sun, Tent, Trees, Waves,
  Wind, Wrench, Utensils, ThermometerSun, ChevronRight, CheckCircle2,
} from "lucide-react";
import { useGameState } from "@/components/OnlineGameHost";
import { GameVictoryScreen, useGameAudio } from "@/components/GameExperience";
import { advanceIslandTutorial, islandTutorialProgress, ISLAND_TUTORIAL_ORDER, type IslandTutorialStep } from "@/lib/island-survival-tutorial";

type Weather = "clear" | "rain" | "storm" | "heat" | "cold";
type ZoneId = "beach" | "forest" | "stream" | "wreck" | "cave" | "ridge";
type EventId = "downpour" | "injury" | "distantSignal";
type Resources = { food: number; water: number; wood: number; cloth: number; metal: number; medicine: number; rope: number };
type IslandStoryChoice = "provisions" | "tools" | "tide" | "ridge";
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
  /** Guided chapter is stored in the match state so both devices stay in step. */
  tutorialStep?: IslandTutorialStep;
  /** Current page in the interactive opening story. */
  storyPage?: number;
  /** Choices are saved with the shared match so both players follow the same path. */
  storyChoices?: IslandStoryChoice[];
};
const MAX_HEALTH = 5;
const RESOURCE_LIMIT = 18;
const initial: SurvivalState = {
  day: 1,
  phase: "action",
  tutorialStep: "story",
  storyPage: 0,
  storyChoices: [],
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
  storyChoices: [...(state.storyChoices ?? [])],
});

type IslandStoryScene =
  | "voyage" | "storm" | "shore" | "spring" | "shelter"
  | "night" | "forest" | "wreck" | "radio";

function IslandStoryIllustration({ scene, label }: { scene: IslandStoryScene; label: string }) {
  const dark = scene === "storm" || scene === "night" || scene === "radio";
  return (
    <svg className={"survival-vector-scene scene-" + scene} viewBox="0 0 720 260" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
      <rect width="720" height="260" fill={dark ? "#244d59" : "#9bcfc5"} />
      {scene === "voyage" && (
        <>
          <circle cx="570" cy="54" r="31" fill="#ffd36c" />
          <path d="M0 168 Q115 146 232 169 T470 164 T720 166 V260 H0Z" fill="#347f91" />
          <path d="M0 200 Q110 180 220 202 T440 198 T720 200 V260 H0Z" fill="#216579" />
          <path d="M74 157 Q130 115 202 150 L236 170 H60Z" fill="#527b62" />
          <path d="M102 145 L120 104 L140 145 M130 145 L154 91 L177 145" fill="none" stroke="#345e4c" strokeWidth="8" strokeLinecap="round" />
          <path d="M270 170 L493 170 L462 205 Q365 221 298 199Z" fill="#7c4a3e" />
          <path d="M372 57 L372 170 L286 160Z" fill="#f4ead1" />
          <path d="M383 82 L462 161 L383 161Z" fill="#e8a45c" />
          <path d="M366 54 L366 170" stroke="#4d4c49" strokeWidth="7" strokeLinecap="round" />
          <path d="M268 170 H496" stroke="#f3dfb7" strokeWidth="7" strokeLinecap="round" />
          <path d="M520 222 Q552 208 581 222 M578 236 Q610 222 641 236" fill="none" stroke="#8fd4d2" strokeWidth="5" strokeLinecap="round" />
          <path d="M160 69 q11 -10 22 0 q11 -10 22 0 M212 90 q8 -8 16 0 q8 -8 16 0" fill="none" stroke="#f6f1dc" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {scene === "storm" && (
        <>
          <path d="M0 166 Q90 115 180 165 T360 159 T540 159 T720 158 V260 H0Z" fill="#316f80" />
          <path d="M0 205 Q90 160 180 204 T360 197 T540 198 T720 193 V260 H0Z" fill="#174e65" />
          <path d="M100 75 Q105 38 150 44 Q171 7 216 33 Q254 24 266 65 Q302 74 286 108 H116 Q88 101 100 75Z" fill="#455766" />
          <path d="M380 56 Q385 24 428 30 Q448 -3 490 26 Q526 12 543 54 Q581 61 563 98 H399 Q368 91 380 56Z" fill="#344b5b" />
          <path d="M324 20 L286 99 H326 L300 153 L386 68 H344 L369 20Z" fill="#f5c85d" />
          <g transform="rotate(-9 480 165)">
            <path d="M395 154 L603 154 L568 188 Q488 201 420 181Z" fill="#8f5546" />
            <path d="M492 72 L492 154 L423 145Z" fill="#d8dfd0" />
            <path d="M502 92 L567 146 L502 146Z" fill="#d88c57" />
            <path d="M488 68 L488 154" stroke="#e7e1cc" strokeWidth="6" />
          </g>
          <path d="M55 233 Q102 211 145 233 T235 231 M330 224 Q372 204 413 224 T505 222 M560 247 Q601 226 650 247" fill="none" stroke="#8ec5c5" strokeWidth="5" strokeLinecap="round" />
        </>
      )}
      {scene === "shore" && (
        <>
          <circle cx="585" cy="50" r="26" fill="#ffd36c" />
          <path d="M0 154 Q130 132 240 157 T470 153 T720 156 V260 H0Z" fill="#378294" />
          <path d="M0 207 Q140 186 270 206 T510 205 T720 202 V260 H0Z" fill="#22677a" />
          <path d="M0 183 Q150 158 278 183 Q390 208 514 184 L720 177 V260 H0Z" fill="#e6c58b" />
          <path d="M50 184 Q90 154 118 164 Q145 115 168 162 Q200 120 222 174 Q280 165 295 195" fill="#507b5a" />
          <path d="M120 172 L139 94 M139 112 Q91 64 67 90 Q88 115 139 122 M143 109 Q182 56 215 76 Q195 108 143 122 M136 97 Q137 54 160 39 Q178 71 146 113" fill="none" stroke="#426f4b" strokeWidth="9" strokeLinecap="round" />
          <path d="M420 178 L582 177 L552 197 L449 199Z" fill="#785044" />
          <path d="M465 171 L492 131 L520 171 M518 175 L546 145 L563 177" fill="none" stroke="#a46e4e" strokeWidth="9" strokeLinecap="round" />
          <path d="M300 195 L374 183 L408 203 L332 211Z" fill="#9a6244" />
          <path d="M342 188 L360 162 M354 195 L389 180" stroke="#e4c18b" strokeWidth="7" strokeLinecap="round" />
          <circle cx="250" cy="177" r="8" fill="#d69b68" />
          <path d="M250 186 L250 213 M250 195 L235 206 M250 195 L266 205" stroke="#355c63" strokeWidth="8" strokeLinecap="round" />
          <circle cx="278" cy="179" r="8" fill="#c9885f" />
          <path d="M278 188 L278 214 M278 198 L265 205 M278 198 L294 205" stroke="#795044" strokeWidth="8" strokeLinecap="round" />
        </>
      )}
      {scene === "spring" && (
        <>
          <path d="M0 0 H720 V110 Q560 90 430 117 T180 111 T0 118Z" fill="#78a77c" />
          <path d="M0 145 Q130 109 250 144 T500 143 T720 133 V260 H0Z" fill="#557f5e" />
          <path d="M295 260 Q320 211 340 175 Q357 145 387 146 Q426 146 440 183 Q457 222 488 260Z" fill="#6cb6bd" />
          <path d="M0 218 Q120 198 230 219 T440 214 T720 215 V260 H0Z" fill="#357c86" />
          <path d="M305 169 Q345 130 379 141 Q410 132 441 171" fill="none" stroke="#d6eee0" strokeWidth="10" strokeLinecap="round" />
          <g fill="#9baca0"><ellipse cx="267" cy="201" rx="32" ry="17"/><ellipse cx="451" cy="201" rx="39" ry="18"/><ellipse cx="358" cy="154" rx="22" ry="12"/></g>
          <g fill="#3d694b"><circle cx="85" cy="121" r="52"/><circle cx="145" cy="115" r="42"/><circle cx="640" cy="122" r="58"/></g>
          <path d="M89 150 L89 216 M640 153 L640 216" stroke="#916b49" strokeWidth="14" />
          <path d="M500 176 q22 -18 40 0 q18 -18 36 0" fill="none" stroke="#e4f0d8" strokeWidth="6" strokeLinecap="round" />
        </>
      )}
      {scene === "shelter" && (
        <>
          <path d="M0 181 Q180 155 360 184 T720 178 V260 H0Z" fill="#426b58" />
          <path d="M0 221 Q180 203 360 222 T720 218 V260 H0Z" fill="#2d5148" />
          <path d="M230 196 L362 67 L505 196Z" fill="#c18a4c" />
          <path d="M266 184 L362 94 L463 184Z" fill="#e6c58e" />
          <path d="M362 67 L362 198 M230 196 L505 196" stroke="#805b39" strokeWidth="12" strokeLinecap="round" />
          <path d="M286 166 L438 166 M268 186 L456 186" stroke="#9d7043" strokeWidth="7" />
          <rect x="335" y="160" width="54" height="38" rx="5" fill="#4c6650" />
          <path d="M85 204 L121 124 L157 204 M120 204 L120 130" fill="none" stroke="#a8754f" strokeWidth="9" />
          <circle cx="593" cy="53" r="24" fill="#f3d391" />
          <path d="M0 70 Q160 37 288 70 T540 68 T720 62" fill="none" stroke="#e1cf9e" strokeWidth="2" opacity=".6" />
        </>
      )}
      {scene === "night" && (
        <>
          <path d="M0 180 Q180 152 360 183 T720 178 V260 H0Z" fill="#294c4a" />
          <path d="M0 220 Q180 200 360 219 T720 215 V260 H0Z" fill="#1e3c40" />
          <circle cx="580" cy="47" r="27" fill="#f3e2ac" />
          <circle cx="593" cy="37" r="24" fill="#244d59" />
          <g fill="#f6e6b8"><circle cx="110" cy="52" r="3"/><circle cx="182" cy="84" r="3"/><circle cx="390" cy="43" r="3"/><circle cx="475" cy="77" r="2"/></g>
          <path d="M210 203 L315 109 L422 203Z" fill="#a97949" />
          <path d="M238 193 L315 128 L395 193Z" fill="#d1a36b" />
          <path d="M315 109 L315 202 M210 203 L422 203" stroke="#76513a" strokeWidth="8" />
          <path d="M488 213 Q463 183 490 153 Q501 188 514 199 Q528 169 541 150 Q555 191 527 214Z" fill="#f0a44a" />
          <path d="M496 213 Q493 191 512 175 Q531 192 526 213Z" fill="#f7d77c" />
          <circle cx="450" cy="178" r="8" fill="#d69a72"/><path d="M450 188 L450 219 M450 198 L435 210 M450 198 L464 209" stroke="#d7ddd0" strokeWidth="8" strokeLinecap="round"/>
          <circle cx="574" cy="183" r="8" fill="#c58a65"/><path d="M574 193 L574 220 M574 202 L560 212 M574 202 L590 212" stroke="#b3c2af" strokeWidth="8" strokeLinecap="round"/>
        </>
      )}
      {scene === "forest" && (
        <>
          <path d="M0 172 Q150 126 280 172 T520 165 T720 164 V260 H0Z" fill="#456e55" />
          <path d="M0 215 Q180 193 360 216 T720 210 V260 H0Z" fill="#315744" />
          {[90, 220, 500, 635].map((x, i) => (
            <g key={x}>
              <path d={"M" + x + " 205 L" + x + " 96"} stroke="#876447" strokeWidth="17" strokeLinecap="round"/>
              <path d={"M" + (x-55) + " 125 Q" + x + " 28 " + (x+55) + " 125 Q" + x + " 175 " + (x-55) + " 125Z"} fill={i % 2 ? "#4f9563" : "#5fa36c"}/>
              <path d={"M" + (x-35) + " 98 Q" + x + " 42 " + (x+38) + " 99"} fill="none" stroke="#84bb7c" strokeWidth="5" strokeLinecap="round"/>
            </g>
          ))}
          <path d="M305 260 Q330 212 360 188 Q392 213 415 260Z" fill="#cdb27c"/>
          <path d="M0 236 Q150 226 270 240 T520 238 T720 236" stroke="#84ad72" strokeWidth="7" fill="none"/>
        </>
      )}
      {scene === "wreck" && (
        <>
          <path d="M0 168 Q150 144 300 171 T560 167 T720 164 V260 H0Z" fill="#397d88" />
          <path d="M0 208 Q180 185 360 208 T720 205 V260 H0Z" fill="#246578" />
          <path d="M105 194 L589 185 L535 227 Q329 249 153 222Z" fill="#805047" />
          <path d="M216 189 L245 117 L274 188 M377 189 L410 145 L439 187" fill="none" stroke="#bd8a55" strokeWidth="12" strokeLinecap="round"/>
          <path d="M245 120 L310 180 M407 146 L468 185" stroke="#d8b67e" strokeWidth="8" />
          <rect x="288" y="157" width="55" height="26" rx="4" fill="#a6a99b" stroke="#646e68" strokeWidth="5" transform="rotate(-8 288 157)"/>
          <path d="M78 238 L132 224 L158 241Z M552 237 L600 220 L625 238Z" fill="#ddc28f"/>
        </>
      )}
      {scene === "radio" && (
        <>
          <path d="M0 185 L160 122 L260 165 L390 86 L520 153 L720 91 V260 H0Z" fill="#416c5a" />
          <path d="M0 215 L170 153 L280 195 L401 124 L540 185 L720 126 V260 H0Z" fill="#294e4a" />
          <path d="M0 244 L720 244" stroke="#1f4144" strokeWidth="30"/>
          <rect x="322" y="126" width="94" height="77" rx="10" fill="#c88c4e" stroke="#714f39" strokeWidth="7"/>
          <rect x="337" y="141" width="63" height="27" rx="4" fill="#365d65"/>
          <circle cx="350" cy="183" r="7" fill="#f2d37d"/><circle cx="388" cy="183" r="7" fill="#f2d37d"/>
          <path d="M369 126 L369 78 M369 85 Q328 36 290 65 M369 85 Q410 33 448 62" fill="none" stroke="#f1d17c" strokeWidth="5" strokeLinecap="round"/>
          <path d="M258 48 Q215 91 258 126 M480 47 Q523 91 480 126" fill="none" stroke="#e8bf69" strokeWidth="5" strokeLinecap="round"/>
          <circle cx="600" cy="42" r="22" fill="#f0d79c"/>
        </>
      )}
    </svg>
  );
}

export function IslandSurvivalGame({ solo = false }: { solo?: boolean }) {
  const [game, setGame, sync] = useGameState<SurvivalState>(() => initial, {
    onlineInitial: initial,
    outcome: (state) => state.phase === "won" || state.phase === "lost" ? { kind: "complete" } : null,
  });
  const [notice, setNotice] = useState("");
  const { play } = useGameAudio();
  // Existing saves created before the guided campaign remain in free-play mode.
  const tutorialStep: IslandTutorialStep = game.tutorialStep ?? "free";
  const guided = tutorialStep !== "free";
  const storyPage = Math.max(0, Math.min(7, Math.floor(game.storyPage ?? 0)));
  const storyChoices = game.storyChoices ?? [];
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
    if (guided && tutorialStep !== "forage") return;
    const next = copyState(game);
    const zone = selectedZone.id;
    const alreadyFound = next.discovered.includes(zone);
    if (!alreadyFound) return;
    switch (zone) {
      case "beach":
        next.resources.food = clamp(next.resources.food + 2);
        next.resources.wood = clamp(next.resources.wood + 1);
        if (tutorialStep === "forage") next.tutorialStep = advanceIslandTutorial(tutorialStep, "forage");
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
    if (tutorialStep === "water" && zone !== "stream") return;
    if (tutorialStep === "forest" && zone !== "forest") return;
    if (tutorialStep === "wreck" && zone !== "wreck") return;
    if (guided && !["water", "forest", "wreck"].includes(tutorialStep)) return;
    const next = copyState(game);
    next.discovered.push(zone);
    next.selectedZone = zone;
    const reward: Record<ZoneId, Partial<Resources>> = {
      beach: { food: 2, wood: 1 },
      forest: { food: 2, wood: 1, rope: 1 },
      stream: { water: 3, medicine: 1 },
      wreck: { metal: 2, cloth: 1 },
      cave: { medicine: 1, wood: 1 },
      ridge: { metal: 1 },
    };
    Object.entries(reward[zone]).forEach(([key, value]) => {
      next.resources[key as keyof Resources] = clamp(next.resources[key as keyof Resources] + (value ?? 0));
    });
    if (tutorialStep === "water" && zone === "stream") next.tutorialStep = advanceIslandTutorial(tutorialStep, "water");
    if (tutorialStep === "forest" && zone === "forest") next.tutorialStep = advanceIslandTutorial(tutorialStep, "forest");
    if (tutorialStep === "wreck" && zone === "wreck") next.tutorialStep = advanceIslandTutorial(tutorialStep, "wreck");
    spendAction(next, "Nova região descoberta: " + zones.find((item) => item.id === zone)?.name + ". Suprimentos foram recolhidos.", "discovery");
  }

  function perform(action: "water" | "craft" | "fire" | "signal" | "raft" | "rest" | "treat") {
    if (game.phase !== "action" || game.actionsLeft <= 0) return;
    if (guided && !((tutorialStep === "shelter" && action === "craft") || (tutorialStep === "signal" && action === "signal"))) return;
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
    if (tutorialStep === "shelter" && action === "craft") {
      next.tutorialStep = advanceIslandTutorial(tutorialStep, "shelter");
      // The tutorial deliberately ends the first day after this first craft.
      next.actionsLeft = 1;
    }
    if (tutorialStep === "signal" && action === "signal") {
      next.tutorialStep = advanceIslandTutorial(tutorialStep, "signal");
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
    } else if (tutorialStep === "night") {
      // First night is a safe, narrated transition into the next lesson.
      next.tutorialStep = advanceIslandTutorial(tutorialStep, "night");
      next.day = 2;
      next.weather = weatherByDay[next.day - 1] ?? "clear";
      next.actionsLeft = 4;
      next.phase = "action";
      next.event = null;
      next.eventResolved = true;
      next.log = ["Dia 2 · A primeira noite passou. Agora vocês precisam ampliar a área explorada.", ...next.log];
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

  function advanceStoryPage() {
    if (tutorialStep !== "story" || ![0, 1, 2, 4, 6].includes(storyPage)) return;
    const next = copyState(game);
    next.storyPage = storyPage + 1;
    setGame(next);
    play("tap");
  }

  function chooseStoryDecision(choice: IslandStoryChoice) {
    if (tutorialStep !== "story" || (storyPage !== 3 && storyPage !== 5)) return;
    const next = copyState(game);
    const choices = [...(next.storyChoices ?? [])];

    if (storyPage === 3) {
      if (choice !== "provisions" && choice !== "tools") return;
      if (choices[0]) return;
      choices[0] = choice;
      if (choice === "provisions") {
        next.resources.food = clamp(next.resources.food + 2);
        next.resources.water = clamp(next.resources.water + 1);
        next.morale = Math.min(10, next.morale + 1);
        next.log = ["Prólogo · Lia e Noah salvaram a caixa de provisões antes que a maré a levasse.", ...next.log];
      } else {
        next.resources.metal = clamp(next.resources.metal + 1);
        next.resources.wood = clamp(next.resources.wood + 1);
        next.resources.cloth = clamp(next.resources.cloth + 1);
        next.log = ["Prólogo · Noah recuperou a maleta de ferramentas e peças do casco.", ...next.log];
      }
    } else {
      if (choice !== "tide" && choice !== "ridge") return;
      if (choices[1]) return;
      choices[1] = choice;
      if (choice === "tide") {
        next.resources.water = clamp(next.resources.water + 2);
        next.resources.food = clamp(next.resources.food + 1);
        next.resources.medicine = clamp(next.resources.medicine + 1);
        next.log = ["Prólogo · A passagem das marés levou a equipe até água e plantas medicinais.", ...next.log];
      } else {
        next.resources.rope = clamp(next.resources.rope + 1);
        next.resources.medicine = clamp(next.resources.medicine + 1);
        next.beacon = Math.min(4, next.beacon + 1);
        next.log = ["Prólogo · Do alto da encosta, Lia encontrou uma peça de sinalização entre os destroços.", ...next.log];
      }
    }

    next.storyChoices = choices;
    next.storyPage = storyPage + 1;
    next.log = next.log.slice(0, 7);
    setGame(next);
    setNotice("A escolha foi registrada. As consequências acompanharão vocês durante a expedição.");
    play("discovery");
  }

  function beginIslandAdventure() {
    if (tutorialStep !== "story" || storyPage !== 4) return;
    const next = copyState(game);
    next.tutorialStep = advanceIslandTutorial("story", "begin");
    setGame(next);
    setNotice("A história chegou à praia. Agora começa a sobrevivência.");
    play("discovery");
  }

  function restart() {
    setGame(initial);
    setNotice("A expedição recomeçou. A história e o tutorial serão apresentados novamente.");
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
          {tutorialStep === "story" ? (
            <article className="survival-story-screen" aria-labelledby="survival-story-title">
              <div className="survival-book-masthead">
                <span>ILHA DO ÚLTIMO SINAL</span>
                <span>UM ROMANCE INTERATIVO</span>
              </div>
              {([0, 2, 4, 6] as number[]).includes(storyPage) && (
                <IslandStoryIllustration
                  scene={storyPage === 0 ? "voyage" : storyPage === 2 ? "storm" : storyPage === 4 ? "shore" : "camp"}
                  label={storyPage === 0 ? "O barco Ventania atravessa o oceano ao entardecer" : storyPage === 2 ? "O barco enfrenta uma tempestade no mar" : storyPage === 4 ? "Lia e Noah alcançam a praia entre os destroços" : "O primeiro abrigo dos náufragos sob o céu noturno"}
                />
              )}
              <div className="survival-book-progress">
                <span>CAPÍTULO I · DEPOIS DA TEMPESTADE</span>
                <strong>PÁGINA {storyPage + 1} / 8</strong>
              </div>
              <section className="survival-book-page">
                <div className="survival-book-prose">
                  {storyPage === 0 && (
                    <>
                      <span className="survival-book-kicker">PRÓLOGO · A ÚLTIMA ROTA</span>
                      <h2 id="survival-story-title">Antes que o mar mudasse de ideia</h2>
                      <p>O <em>Ventania</em> não era um barco bonito. Tinha a pintura gasta pelo sal, uma faixa azul descascada junto ao casco e um motor que Noah conhecia tão bem que conseguia reconhecer seus defeitos pelo som. Ainda assim, era confiável. E, naquela manhã, parecia levar os dois ao encontro de mais uma tarefa simples.</p>
                      <p>Lia conduzia a embarcação. Havia aprendido a ler correntes com o pai e a desconfiar de horizontes tranquilos demais. Noah cuidava das máquinas desde menino; carregava no bolso uma pequena chave de latão que pertencera ao avô. Os dois haviam aceitado transportar um transmissor de emergência até um posto costeiro isolado, cujo sinal desaparecera três noites antes.</p>
                      <p>Era uma viagem de trabalho. Um destino, uma entrega, algumas horas de mar. Nenhum dos dois sabia que aquela seria a última vez, por muito tempo, que veriam terra firme conhecida.</p>
                    </>
                  )}
                  {storyPage === 1 && (
                    <>
                      <span className="survival-book-kicker">PÁGINA 2 · A FREQUÊNCIA MORTA</span>
                      <h2>Três pulsos no silêncio</h2>
                      <p>O rádio chiou pouco depois do meio-dia. Primeiro veio uma descarga seca, depois um intervalo longo demais para ser interferência. Por fim, três pulsos curtos, repetidos na mesma frequência que o posto costeiro deveria usar. Lia anotou a direção. O sinal vinha de leste — fora da rota planejada.</p>
                      <p>Noah examinou o transmissor que transportavam. Estava intacto. “Alguém está tentando falar com uma bateria quase morta”, disse, sem tirar os olhos do painel. Lia conhecia aquele tom: era a voz que ele usava quando já havia decidido que não deixaria um pedido de socorro sem resposta.</p>
                      <p>Ela alterou o rumo. Não foi heroísmo, nem imprudência. Foi a escolha que duas pessoas fazem quando ainda acreditam que, do outro lado do silêncio, pode haver alguém esperando.</p>
                    </>
                  )}
                  {storyPage === 2 && (
                    <>
                      <span className="survival-book-kicker">PÁGINA 3 · O MAR SE FECHA</span>
                      <h2>A tempestade não veio do horizonte</h2>
                      <p>O vento virou antes que as nuvens aparecessem. A superfície do oceano perdeu o brilho e ganhou uma cor de chumbo. Lia reduziu a velocidade, procurou abrigo entre as ondas e percebeu que a corrente os empurrava para uma região que não constava nas cartas de bordo.</p>
                      <p>O primeiro impacto lançou Noah contra a bancada. O segundo apagou os instrumentos. Quando ele alcançou a casa de máquinas, a água já cobria o piso e o motor tossia como um animal ferido. Lia manteve as mãos no leme, mas cada onda chegava de um lado diferente, sem ritmo que pudesse ser previsto.</p>
                      <p>Então surgiu uma linha escura entre a chuva: terra. Não havia tempo para contorná-la. O casco atingiu os recifes, a madeira gemeu e o mundo desapareceu sob a espuma.</p>
                    </>
                  )}
                  {storyPage === 3 && (
                    <>
                      <span className="survival-book-kicker">PÁGINA 4 · PRIMEIRA ESCOLHA</span>
                      <h2>O que ainda pode ser salvo?</h2>
                      <p>Lia acordou com areia na boca e o gosto de sangue no lábio. Noah estava alguns metros adiante, tentando se levantar. O <em>Ventania</em> jazia partido perto dos recifes. A maré crescia depressa; entre as tábuas, duas coisas ainda flutuavam ao alcance: a caixa de provisões e a maleta de ferramentas.</p>
                      <p>Uma garantia de alimento poderia mantê-los vivos nos primeiros dias. As ferramentas, por outro lado, talvez permitissem consertar o transmissor ou improvisar uma saída. Não havia tempo para alcançar os dois objetos.</p>
                      <p className="survival-book-emphasis">A primeira decisão não escolherá quem merece ser salvo. Escolherá aquilo que poderá ajudá-los a sobreviver.</p>
                    </>
                  )}
                  {storyPage === 4 && (
                    <>
                      <span className="survival-book-kicker">PÁGINA 5 · O QUE A MARÉ LEVOU</span>
                      <h2>{storyChoices[0] === "provisions" ? "O peso de uma caixa" : "A memória das ferramentas"}</h2>
                      <p>{storyChoices[0] === "provisions"
                        ? "Lia alcançou a caixa primeiro. Uma onda a ergueu como se fosse arrancá-la de suas mãos, mas Noah se lançou contra a água e segurou a alça. Os dois chegaram à areia abraçados à madeira encharcada. Dentro, parte da comida ainda estava protegida; os recipientes de água tinham rachado, mas um sobrevivera. Pela primeira vez desde o impacto, Noah sorriu."
                        : "Noah nadou até a maleta enquanto Lia o guiava pelos recifes. A corrente puxava suas pernas, e uma chapa de metal abriu um corte em seu braço. Quando voltou, trazia ferramentas, um pedaço de tecido e uma pequena peça de cobre. Não havia comida ali. Havia, porém, uma chance de fazer alguma coisa com o que restara do barco."}</p>
                      <p>O que quer que tivessem escolhido, o resultado não parecia uma vitória. Era apenas o primeiro pedaço de futuro que conseguiram arrancar do naufrágio. Lia olhou para a linha das árvores. O sol descia, e ficar na praia seria um erro.</p>
                    </>
                  )}
                  {storyPage === 5 && (
                    <>
                      <span className="survival-book-kicker">PÁGINA 6 · SEGUNDA ESCOLHA</span>
                      <h2>Dois caminhos para dentro da ilha</h2>
                      <p>Além da faixa de areia, a ilha se dividia em duas possibilidades. À esquerda, o recuo da maré revelava uma passagem estreita entre pedras. O som de água correndo vinha de algum lugar além dela. À direita, uma encosta subia até um mirante de rocha, de onde talvez fosse possível enxergar a costa inteira.</p>
                      <p>Seguir a água poderia resolver uma necessidade urgente. Subir daria visão, orientação e talvez uma posição melhor para pedir ajuda. O céu continuava carregado; a luz que restava não seria suficiente para explorar os dois caminhos.</p>
                      <p className="survival-book-emphasis">Lia esperou a decisão de vocês. Pela primeira vez, não havia um mapa dizendo qual direção era segura.</p>
                    </>
                  )}
                  {storyPage === 6 && (
                    <>
                      <span className="survival-book-kicker">PÁGINA 7 · A ILHA RESPONDE</span>
                      <h2>{storyChoices[1] === "tide" ? "A água escondida nas pedras" : "O horizonte visto de cima"}</h2>
                      <p>{storyChoices[1] === "tide"
                        ? "A passagem entre as pedras era mais estreita do que parecia. Lia avançou primeiro, sentindo a água fria subir pelos tornozelos. Depois de uma curva, encontraram uma nascente que brotava debaixo de uma parede de raízes. Noah encheu os recipientes enquanto Lia separava folhas de cheiro forte, lembrando-se de um guia de plantas que carregara em outra viagem."
                        : "A subida exigiu mais do que Noah queria admitir. Quando chegaram ao alto, a ilha se abriu diante deles: uma mata fechada, uma faixa de praia, uma gruta escura e, além dos recifes, o casco partido do <em>Ventania</em>. Lia encontrou uma pequena peça de sinalização presa às rochas. Dali, ao menos, poderiam orientar qualquer mensagem que conseguissem transmitir."}</p>
                      <p>Dois caminhos diferentes. Duas pequenas vantagens. A mesma certeza: aquela terra não era um ponto vazio no oceano. Havia água, abrigo, materiais e perigos que ainda não conheciam. E, em algum lugar além da chuva, alguém talvez ainda estivesse tentando responder ao chamado que os trouxera até ali.</p>
                    </>
                  )}
                  {storyPage === 7 && (
                    <>
                      <span className="survival-book-kicker">PÁGINA 8 · O PRIMEIRO ACAMPAMENTO</span>
                      <h2>Sete dias entre vocês e o resgate</h2>
                      <p>Encontraram um trecho protegido do vento e improvisaram um abrigo baixo. Não era uma casa; era uma promessa feita com madeira, tecido e teimosia. Quando a noite caiu, Lia desenhou na areia o contorno aproximado da ilha. Noah colocou ao lado a peça do rádio que ainda podia ser recuperada.</p>
                      <p>O posto costeiro não recebera o sinal de chegada do <em>Ventania</em>. A busca começaria em sete dias, quando uma embarcação cruzasse aquela região. Até lá, precisariam cuidar da água, encontrar alimento, reforçar o abrigo e descobrir se o transmissor poderia voltar a funcionar. Se o rádio falhasse, uma balsa seria a última alternativa.</p>
                      <p>O mar continuava fazendo barulho no escuro. Mas agora havia um lugar para sentar, duas pessoas para dividir o medo e uma decisão que ainda não tinha sido tomada: desistir não seria uma delas.</p>
                    </>
                  )}
                </div>

                {storyPage === 3 && (
                  <div className="survival-book-choices" aria-label="Escolha o que salvar">
                    <button type="button" className="survival-book-choice" onClick={() => chooseStoryDecision("provisions")}>
                      <span className="survival-book-choice-symbol"><Package aria-hidden="true"/></span>
                      <strong>Salvar as provisões</strong>
                      <small>Garantir alimento e um pouco de água para os primeiros dias.</small>
                      <em>+2 comida · +1 água · +1 ânimo</em>
                    </button>
                    <button type="button" className="survival-book-choice" onClick={() => chooseStoryDecision("tools")}>
                      <span className="survival-book-choice-symbol"><Wrench aria-hidden="true"/></span>
                      <strong>Recuperar as ferramentas</strong>
                      <small>Guardar peças e materiais para consertos e construções.</small>
                      <em>+1 metal · +1 madeira · +1 tecido</em>
                    </button>
                  </div>
                )}
                {storyPage === 5 && (
                  <div className="survival-book-choices" aria-label="Escolha o caminho">
                    <button type="button" className="survival-book-choice" onClick={() => chooseStoryDecision("tide")}>
                      <span className="survival-book-choice-symbol"><Droplets aria-hidden="true"/></span>
                      <strong>Seguir a passagem da maré</strong>
                      <small>Procurar água potável e plantas úteis entre as pedras.</small>
                      <em>+2 água · +1 comida · +1 remédio</em>
                    </button>
                    <button type="button" className="survival-book-choice" onClick={() => chooseStoryDecision("ridge")}>
                      <span className="survival-book-choice-symbol"><Compass aria-hidden="true"/></span>
                      <strong>Subir até o mirante</strong>
                      <small>Observar a ilha e procurar uma peça para sinalização.</small>
                      <em>+1 corda · +1 remédio · +1 sinal</em>
                    </button>
                  </div>
                )}
                {storyPage === 7 && (
                  <>
                    <div className="survival-book-inventory">
                      <strong>Suprimentos recuperados</strong>
                      <div>
                        {([
                          ["Comida", game.resources.food, Utensils],
                          ["Água", game.resources.water, Droplets],
                          ["Madeira", game.resources.wood, Trees],
                          ["Tecido", game.resources.cloth, Package],
                          ["Metal", game.resources.metal, Wrench],
                          ["Remédios", game.resources.medicine, HeartPulse],
                          ["Corda", game.resources.rope, Anchor],
                        ] as const).map(([label, value, Icon]) => (
                          <span key={label}><Icon aria-hidden="true"/><small>{label}</small><b>{value}</b></span>
                        ))}
                      </div>
                    </div>
                    <div className="survival-book-mission">
                      <Radio aria-hidden="true"/>
                      <p><strong>O plano</strong><span>Resistir durante sete dias, explorar a ilha e completar o rádio — ou construir uma balsa para sair por conta própria.</span></p>
                    </div>
                  </>
                )}
                <footer className="survival-book-controls">
                  {([0, 1, 2, 4, 6] as number[]).includes(storyPage) && (
                    <button type="button" className="survival-book-next" onClick={advanceStoryPage}>
                      {storyPage === 6 ? "Chegar ao acampamento" : "Virar a página"} <ChevronRight aria-hidden="true"/>
                    </button>
                  )}
                  {storyPage === 7 && (
                    <button type="button" className="survival-book-next" onClick={beginIslandAdventure}>
                      Começar a sobreviver <ChevronRight aria-hidden="true"/>
                    </button>
                  )}
                </footer>
              </section>
            </article>
          ) : tutorialStep !== "free" ? (
            <section className="survival-tutorial-screen" aria-labelledby="survival-tutorial-title">
              <div className="survival-tutorial-head">
                <div><span className="survival-kicker">TUTORIAL GUIADO · DIA {game.day}</span><span className="survival-tutorial-count">ETAPA {ISLAND_TUTORIAL_ORDER.indexOf(tutorialStep) + 1} DE 7</span></div>
                <div className="survival-tutorial-track"><span style={{ width: islandTutorialProgress(tutorialStep) + "%" }} /></div>
              </div>
              <div className="survival-tutorial-scene" aria-hidden="true">
                <IslandStoryIllustration
                  scene={tutorialStep === "forage" ? "shore" :
                    tutorialStep === "water" ? "spring" :
                    tutorialStep === "shelter" ? "shelter" :
                    tutorialStep === "night" ? "night" :
                    tutorialStep === "forest" ? "forest" :
                    tutorialStep === "wreck" ? "wreck" : "radio"}
                  label={tutorialStep === "forage" ? "Praia e destroços para recolher suprimentos" :
                    tutorialStep === "water" ? "Nascente entre pedras e vegetação" :
                    tutorialStep === "shelter" ? "Abrigo de madeira sendo reforçado" :
                    tutorialStep === "night" ? "Acampamento protegido durante a primeira noite" :
                    tutorialStep === "forest" ? "Mata fechada e trilha de exploração" :
                    tutorialStep === "wreck" ? "Casco partido entre as ondas" : "Rádio de emergência no mirante"}
                />
                <span className="survival-tutorial-scene-caption">
                  {tutorialStep === "forage" ? "PRAIA DO NAUFRÁGIO" :
                    tutorialStep === "water" ? "BUSCA POR ÁGUA POTÁVEL" :
                    tutorialStep === "shelter" ? "PRIMEIRO ACAMPAMENTO" :
                    tutorialStep === "night" ? "A PRIMEIRA NOITE" :
                    tutorialStep === "forest" ? "MATA FECHADA" :
                    tutorialStep === "wreck" ? "CASCO PARTIDO" : "RÁDIO DE EMERGÊNCIA"}
                </span>
              </div>
              <div className="survival-tutorial-copy">
                <span className="survival-kicker">APRENDA UMA COISA DE CADA VEZ</span>
                <h2 id="survival-tutorial-title">
                  {tutorialStep === "forage" ? "Primeiro: procure suprimentos" :
                    tutorialStep === "water" ? "Água vem antes de tudo" :
                    tutorialStep === "shelter" ? "Agora, protejam o acampamento" :
                    tutorialStep === "night" ? "É hora de atravessar a noite" :
                    tutorialStep === "forest" ? "A ilha é maior do que parece" :
                    tutorialStep === "wreck" ? "Talvez o barco ainda ajude" : "Vamos tentar pedir socorro"}
                </h2>
                <p>
                  {tutorialStep === "forage" ? "A maré baixou e deixou tábuas, caixas e mariscos na areia. Toquem no botão abaixo para vasculhar a praia. Essa ação consome um movimento do dia e mostra como uma exploração funciona." :
                    tutorialStep === "water" ? "Comida ajuda, mas sem água vocês não resistem. A nascente fica escondida atrás das pedras. Nesta etapa, o mapa ainda mostra apenas esse destino: descubram a região para recolher água e plantas medicinais." :
                    tutorialStep === "shelter" ? "Vocês já têm madeira e tecido suficientes para reforçar o abrigo. Construir consome materiais e um movimento. Um abrigo melhor protege os sobreviventes quando o tempo piorar." :
                    tutorialStep === "night" ? "Cada noite consome comida e água. Se faltar qualquer um dos dois, a saúde e o ânimo diminuem. Vocês já prepararam um abrigo; agora avancem para ver como o dia termina." :
                    tutorialStep === "forest" ? "Com o primeiro dia concluído, novas áreas podem ser exploradas. A mata fornece comida, madeira e cipós para fazer cordas. Por enquanto, vamos descobrir somente essa região." :
                    tutorialStep === "wreck" ? "O casco partido guarda peças de metal e tecido. Elas serão importantes para consertar o rádio ou construir uma balsa. Investiguem o navio para aprender a obter materiais especiais." :
                    "O rádio está danificado, mas vocês encontraram metal e madeira. Usem os materiais para fazer o primeiro reparo. Depois disso, o tutorial termina e o mapa e as ações estarão todos disponíveis."}
                </p>
                <div className="survival-tutorial-hint">
                  <Sparkles aria-hidden="true" />
                  <span>
                    {tutorialStep === "forage" ? "Dica: vocês não precisam escolher entre várias ações ainda. Façam apenas esta primeira busca." :
                      tutorialStep === "water" ? "Dica: regiões desconhecidas só serão reveladas quando vocês explorarem o local." :
                      tutorialStep === "shelter" ? "Dica: observem os materiais pedidos antes de confirmar uma construção." :
                      tutorialStep === "night" ? "Dica: comida e água são consumidas automaticamente ao passar a noite." :
                      tutorialStep === "forest" ? "Dica: cada região descoberta passa a fazer parte do mapa permanente da expedição." :
                      tutorialStep === "wreck" ? "Dica: recursos diferentes aparecem em lugares diferentes. Explorar é essencial." :
                      "Dica: o rádio precisa de metal e madeira. Mais tarde, vocês poderão completar os quatro reparos."}
                  </span>
                </div>
                {tutorialStep !== "night" && (
                  <div className="survival-tutorial-resources" aria-label="Materiais disponíveis">
                    {(tutorialStep === "forage" ? [["Comida", game.resources.food], ["Madeira", game.resources.wood]] :
                      tutorialStep === "water" ? [["Água", game.resources.water], ["Remédios", game.resources.medicine]] :
                      tutorialStep === "shelter" ? [["Madeira", game.resources.wood], ["Tecido", game.resources.cloth]] :
                      tutorialStep === "forest" ? [["Comida", game.resources.food], ["Madeira", game.resources.wood], ["Corda", game.resources.rope]] :
                      tutorialStep === "wreck" ? [["Metal", game.resources.metal], ["Tecido", game.resources.cloth]] :
                      [["Metal", game.resources.metal], ["Madeira", game.resources.wood], ["Sinal", game.beacon + "/4"]]
                    ).map(([label, value]) => <span key={label}><small>{label}</small><strong>{value}</strong></span>)}
                  </div>
                )}
                {tutorialStep === "night" && (
                  <div className="survival-tutorial-night-summary">
                    <span><Utensils aria-hidden="true"/> Comida disponível: <strong>{game.resources.food}</strong></span>
                    <span><Droplets aria-hidden="true"/> Água disponível: <strong>{game.resources.water}</strong></span>
                    <span><Tent aria-hidden="true"/> Proteção do abrigo: <strong>{game.shelter}/3</strong></span>
                  </div>
                )}
                <button
                  type="button"
                  className="survival-tutorial-primary"
                  disabled={
                    (tutorialStep === "shelter" && (game.resources.wood < 3 || game.resources.cloth < 1)) ||
                    (tutorialStep === "signal" && (game.resources.metal < 1 || game.resources.wood < 1))
                  }
                  onClick={() => {
                    if (tutorialStep === "forage") explore();
                    else if (tutorialStep === "water") discoverZone("stream");
                    else if (tutorialStep === "shelter") perform("craft");
                    else if (tutorialStep === "night") resolveNight();
                    else if (tutorialStep === "forest") discoverZone("forest");
                    else if (tutorialStep === "wreck") discoverZone("wreck");
                    else if (tutorialStep === "signal") perform("signal");
                  }}
                >
                  {tutorialStep === "forage" ? "Vasculhar a praia" :
                    tutorialStep === "water" ? "Encontrar a nascente" :
                    tutorialStep === "shelter" ? "Reforçar o abrigo" :
                    tutorialStep === "night" ? "Atravessar a primeira noite" :
                    tutorialStep === "forest" ? "Explorar a mata" :
                    tutorialStep === "wreck" ? "Investigar o casco" : "Reparar o rádio"}
                  <ChevronRight aria-hidden="true" />
                </button>
                {notice && <p className="survival-tutorial-notice" role="status">{notice}</p>}
              </div>
            </section>
          ) : (
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
        </>
      )}
    </section>
  );
}
