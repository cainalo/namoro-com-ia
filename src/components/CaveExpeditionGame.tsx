import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass, Gem, Heart, Map, Shield, Sparkles, Sword, Swords, Zap } from "lucide-react";
import { useGameState } from "@/components/OnlineGameHost";
import { GameVictoryScreen, useGameAudio } from "@/components/GameExperience";
import { CAVE_FLOORS, caveCell, isAdjacent, revealCave, type CavePoint } from "@/lib/cave-expedition";

type Monster = { x: number; y: number; hp: number; maxHp: number; attack: number; name: string; icon: string };
type CaveState = {
  floor: number;
  phase: "explore" | "battle" | "won" | "lost";
  map: string[];
  positions: [CavePoint, CavePoint];
  hp: [number, number];
  energy: [number, number];
  crystals: number;
  relics: number;
  monsters: Monster[];
  activeMonster: number | null;
  guarding: [boolean, boolean];
  potions: number;
  moves: number;
  defeated: number;
  seen: string[];
  activeHero: 0 | 1;
  log: string[];
};
const MAX_HP = 10;

function createFloor(index: number, carry?: Partial<CaveState>): CaveState {
  const floor = CAVE_FLOORS[index];
  const map = floor.map.map((row) => row.replace("P", "."));
  const positions: [CavePoint, CavePoint] = [{ x: 1, y: 1 }, { x: 1, y: 2 }];
  const monsters = floor.monsters.map((monster) => ({ ...monster, maxHp: monster.hp }));
  return {
    floor: index,
    phase: "explore",
    map,
    positions,
    hp: carry?.hp ?? [MAX_HP, MAX_HP],
    energy: carry?.energy ?? [3, 3],
    crystals: carry?.crystals ?? 0,
    relics: carry?.relics ?? 0,
    monsters,
    activeMonster: null,
    guarding: [false, false],
    potions: carry?.potions ?? 2,
    moves: carry?.moves ?? 0,
    defeated: carry?.defeated ?? 0,
    seen: revealCave(map, positions, 1),
    activeHero: 0,
    log: [floor.name + ": a expedição começou. Encontrem o selo e limpem o caminho até a saída."],
  };
}

export function CaveExpeditionGame({ solo = false }: { solo?: boolean }) {
  const [game, setGame, sync] = useGameState<CaveState>(() => createFloor(0), {
    onlineInitial: createFloor(0),
    outcome: (state) => state.phase === "won" || state.phase === "lost" ? { kind: "complete" } : null,
  });
  const [notice, setNotice] = useState("");
  const { play } = useGameAudio();
  const activeHero = solo ? game.activeHero : sync.online ? (sync.mySeat ?? 0) : game.activeHero;
  const activeMonster = game.monsters[game.activeMonster ?? -1];
  const aliveMonsters = game.monsters.filter((monster) => monster.hp > 0);
  const exitOpen = aliveMonsters.length === 0 && game.crystals >= CAVE_FLOORS[game.floor].requiredCrystals;
  const floorInfo = CAVE_FLOORS[game.floor];
  const progress = useMemo(() => Math.round((game.floor + (game.phase === "won" ? 1 : 0)) / CAVE_FLOORS.length * 100), [game.floor, game.phase]);

  useEffect(() => {
    if (game.phase === "lost") play("warning");
    if (game.phase === "won") play("success");
  }, [game.phase, play]);

  function finishMovement(next: CaveState, message: string, sound: "move" | "discovery" = "move") {
    next.moves += 1;
    next.seen = [...new Set([...next.seen, ...revealCave(next.map, next.positions, 1)])];
    if (!sync.online) next.activeHero = activeHero === 0 ? 1 : 0;
    next.log = [message, ...next.log].slice(0, 6);
    setNotice(message);
    setGame(next);
    play(sound);
  }

  function move(dx: number, dy: number) {
    if (game.phase !== "explore" || (sync.online && !sync.canAct)) return;
    const current = game.positions[activeHero];
    const target = { x: current.x + dx, y: current.y + dy };
    const tile = caveCell(game.map, target);
    if (tile === "#") { play("warning"); setNotice("A parede de basalto bloqueia a passagem."); return; }
    if (!isAdjacent(current, target)) return;

    const next: CaveState = {
      ...game,
      positions: [...game.positions] as [CavePoint, CavePoint],
      hp: [...game.hp] as [number, number],
      energy: [...game.energy] as [number, number],
      monsters: game.monsters.map((monster) => ({ ...monster })),
      guarding: [...game.guarding] as [boolean, boolean],
      seen: [...game.seen],
      log: [...game.log],
    };
    next.positions[activeHero] = target;

    if (tile === "c") {
      next.map[target.y] = next.map[target.y].slice(0, target.x) + "." + next.map[target.y].slice(target.x + 1);
      next.crystals += 1;
      finishMovement(next, "Cristal de éter recolhido. A energia da caverna agora responde ao grupo.", "discovery");
      return;
    }
    if (tile === "r") {
      next.map[target.y] = next.map[target.y].slice(0, target.x) + "." + next.map[target.y].slice(target.x + 1);
      next.relics += 1;
      finishMovement(next, "Selo ancestral encontrado. A saída desta câmara pode ser aberta.", "discovery");
      return;
    }
    if (tile === "g") {
      const index = next.monsters.findIndex((monster) => monster.x === target.x && monster.y === target.y && monster.hp > 0);
      if (index >= 0) {
        next.phase = "battle";
        next.activeMonster = index;
        next.log = [(next.monsters[index].name + " bloqueia a passagem. Preparem-se para lutar."), ...next.log].slice(0, 6);
        next.moves += 1;
        next.seen = [...new Set([...next.seen, ...revealCave(next.map, next.positions, 1)])];
        setGame(next);
        setNotice(next.monsters[index].name + " surgiu na trilha!");
        play("warning");
        return;
      }
    }
    if (tile === "E") {
      if (!exitOpen) {
        setNotice("A porta de basalto ainda está selada. Recolham o cristal e derrotem os guardiões.");
        play("warning");
        return;
      }
      if (game.floor === CAVE_FLOORS.length - 1) {
        next.phase = "won";
        next.log = ["O Coração de Basalto foi estabilizado. A fenda se fechou e a expedição retornou à superfície.", ...next.log];
        setGame(next);
        play("success");
        return;
      }
      const nextFloor = createFloor(game.floor + 1, {
        hp: next.hp,
        energy: [Math.min(4, next.energy[0] + 1), Math.min(4, next.energy[1] + 1)],
        crystals: next.crystals,
        relics: next.relics,
        potions: next.potions,
        moves: next.moves,
        defeated: next.defeated,
      });
      nextFloor.log = [("Câmara " + (game.floor + 1) + " concluída. A equipe desceu para " + CAVE_FLOORS[game.floor + 1].name + "."), ...next.log].slice(0, 6);
      setGame(nextFloor);
      setNotice("A passagem se abriu. Nova câmara descoberta.");
      play("discovery");
      return;
    }
    finishMovement(next, "O grupo avançou pela galeria.");
  }

  function attack(skill: "strike" | "burst" | "guard" | "potion") {
    if (game.phase !== "battle" || activeMonster?.hp === undefined) return;
    const next: CaveState = {
      ...game,
      hp: [...game.hp] as [number, number],
      energy: [...game.energy] as [number, number],
      monsters: game.monsters.map((monster) => ({ ...monster })),
      guarding: [...game.guarding] as [boolean, boolean],
      log: [...game.log],
    };
    const monster = next.monsters[next.activeMonster ?? -1];
    if (!monster) return;
    if (skill === "potion") {
      if (next.potions <= 0) { setNotice("Não há poções no inventário."); return; }
      next.potions -= 1;
      next.hp[activeHero] = Math.min(MAX_HP, next.hp[activeHero] + 5);
      next.log = [("O explorador " + (activeHero + 1) + " usou uma poção e recuperou vida."), ...next.log];
      play("success");
    } else if (skill === "guard") {
      next.guarding[activeHero] = true;
      next.energy[activeHero] = Math.min(4, next.energy[activeHero] + 1);
      next.log = [("O explorador " + (activeHero + 1) + " ergueu a guarda e recuperou energia."), ...next.log];
      play("tap");
    } else {
      const cost = skill === "burst" ? 2 : 0;
      if (next.energy[activeHero] < cost) { setNotice("Energia insuficiente para essa técnica."); return; }
      next.energy[activeHero] -= cost;
      const damage = skill === "burst" ? 4 : 2 + (next.relics > 0 ? 1 : 0);
      monster.hp = Math.max(0, monster.hp - damage);
      next.log = [("Ataque " + (skill === "burst" ? "especial" : "preciso") + ": " + damage + " de dano em " + monster.name + "."), ...next.log];
      play(monster.hp === 0 ? "success" : "impact");
    }
    if (monster.hp <= 0) {
      next.phase = "explore";
      next.activeMonster = null;
      next.defeated += 1;
      next.map[monster.y] = next.map[monster.y].slice(0, monster.x) + "." + next.map[monster.y].slice(monster.x + 1);
      next.log = [(monster.name + " foi derrotado. A galeria está segura."), ...next.log].slice(0, 6);
      setNotice(monster.name + " derrotado!");
      setGame(next);
      play("discovery");
      return;
    }
    const defending = next.guarding[activeHero];
    const damage = defending ? Math.max(0, monster.attack - 2) : monster.attack;
    next.hp[activeHero] = Math.max(0, next.hp[activeHero] - damage);
    next.guarding[activeHero] = false;
    if (next.hp.every((hp) => hp <= 0)) next.phase = "lost";
    next.log = [monster.name + " contra-atacou e causou " + damage + " de dano.", ...next.log].slice(0, 6);
    setNotice(next.phase === "lost" ? "A equipe foi vencida pelas criaturas da fenda." : "Contra-ataque: " + damage + " de dano.");
    setGame(next);
    if (next.phase !== "lost") play("impact");
  }

  function switchHero() {
    if (sync.online) return;
    setGame((current) => ({ ...current, activeHero: current.activeHero === 0 ? 1 : 0 }));
    play("tap");
  }

  function restart() {
    setGame(createFloor(0));
    setNotice("A expedição recomeçou. Explore as galerias e procure os selos.");
    play("tap");
  }

  function visibleTile(x: number, y: number) {
    const key = x + "," + y;
    if (!game.seen.includes(key)) return "hidden";
    const tile = game.map[y]?.[x] ?? "#";
    if (tile === "g" && game.monsters.some((monster) => monster.x === x && monster.y === y && monster.hp > 0)) return "monster";
    return tile;
  }

  const currentPlayer = game.positions[activeHero];
  const victoryStats = [
    { label: "Câmaras", value: "3/3" },
    { label: "Criaturas", value: game.defeated },
    { label: "Cristais", value: game.crystals },
    { label: "Movimentos", value: game.moves },
  ];

  return (
    <section className="cave-expedition-game">
      {game.phase === "won" && (
        <GameVictoryScreen won title="A fenda foi selada!" subtitle="O Coração de Basalto voltou a pulsar em equilíbrio. Vocês atravessaram as três câmaras e saíram da montanha juntos." eyebrow="EXPEDIÇÃO CONCLUÍDA" stats={victoryStats} onReplay={restart} onExit={() => window.dispatchEvent(new Event("morados:game-exit"))}/>
      )}
      {game.phase === "lost" && (
        <GameVictoryScreen won={false} title="A expedição foi interrompida" subtitle="As criaturas dominaram a galeria. Reorganizem o equipamento e tentem outra rota." eyebrow="FIM DA EXPEDIÇÃO" stats={victoryStats} onReplay={restart} onExit={() => window.dispatchEvent(new Event("morados:game-exit"))}/>
      )}
      {game.phase !== "won" && game.phase !== "lost" && (
        <>
          <header className="cave-expedition-heading">
            <div><span className="cave-game-kicker">RPG COOPERATIVO · CÂMARA {game.floor + 1}/3</span><h2>As Profundezas de Basalto</h2><p>{floorInfo.name} · Encontrem o selo, derrotem os guardiões e alcancem a saída.</p></div>
            <div className="cave-expedition-progress"><strong>{progress}%</strong><span>expedição</span></div>
          </header>

          <div className="cave-party-hud">
            {game.hp.map((hp, index) => (
              <button type="button" key={index} className={"cave-party-member" + (activeHero === index ? " is-active" : "")} onClick={() => !sync.online && setGame((current) => ({ ...current, activeHero: index as 0 | 1 }))}>
                <span className={"cave-avatar avatar-" + index}>{index === 0 ? "⚔" : "✦"}</span>
                <span><strong>{index === 0 ? "Vanguarda" : "Arcanista"}</strong><small>{hp}/{MAX_HP} PV · {game.energy[index]} EN</small></span>
                <span className="cave-health-track"><i style={{ width: (hp / MAX_HP * 100) + "%" }}/></span>
              </button>
            ))}
            <div className="cave-inventory"><span><Gem/> {game.crystals}</span><span><Sparkles/> {game.relics}</span><span><Heart/> {game.potions}</span></div>
          </div>

          <div className="cave-game-layout">
            <section className="cave-map-panel">
              <div className="cave-panel-heading"><span><Map/> MAPA DA CÂMARA</span><small>{game.seen.length} áreas reveladas</small></div>
              <div className="cave-map-grid" style={{ gridTemplateColumns: "repeat(" + game.map[0].length + ", minmax(0, 1fr))" }}>
                {game.map.flatMap((row, y) => row.split("").map((_, x) => {
                  const tile = visibleTile(x, y);
                  const point: CavePoint = { x, y };
                  const heroAt = game.positions.findIndex((position) => position.x === x && position.y === y);
                  const symbol = heroAt >= 0 ? (heroAt === 0 ? "⚔" : "✦") :
                    tile === "hidden" ? "" : tile === "#" ? " " : tile === "monster" ? "◆" :
                    tile === "c" ? "✧" : tile === "r" ? "✥" : tile === "E" ? "⇧" : "";
                  const cls = heroAt >= 0 ? "hero hero-" + heroAt : tile === "hidden" ? "unseen" : tile === "#" ? "tile-wall" : "tile-" + (tile === "monster" ? "monster" : tile);
                  return <button type="button" key={x + "-" + y} className={"cave-map-tile " + cls} disabled={tile === "hidden" || tile === "#"} onClick={() => {
                    const current = game.positions[activeHero];
                    const dx = point.x - current.x, dy = point.y - current.y;
                    if (Math.abs(dx) + Math.abs(dy) === 1) move(dx, dy);
                  }} aria-label={"Área " + (x + 1) + ", " + (y + 1)}>
                    <span>{symbol}</span>
                  </button>;
                }))}
              </div>
              <div className="cave-map-legend"><span>⚔ Vanguarda</span><span>✦ Arcanista</span><span>◆ Criatura</span><span>✧ Cristal</span><span>⇧ Saída</span></div>
            </section>

            <aside className="cave-action-panel">
              <div className="cave-panel-heading"><span>{game.phase === "battle" ? <Swords/> : <Compass/>} {game.phase === "battle" ? "COMBATE" : "EXPLORAÇÃO"}</span><small>{sync.online ? "Explorador " + (activeHero + 1) : "Explorador " + (activeHero + 1)}</small></div>
              {game.phase === "explore" ? (
                <>
                  <div className="cave-current-hero"><span className={"cave-avatar avatar-" + activeHero}>{activeHero === 0 ? "⚔" : "✦"}</span><div><strong>{activeHero === 0 ? "Vanguarda" : "Arcanista"}</strong><small>Posição {currentPlayer.x + 1} · {currentPlayer.y + 1}</small></div></div>
                  <div className="cave-dpad">
                    <span/>
                    <button type="button" onClick={() => move(0, -1)} aria-label="Mover para cima"><ArrowUp/></button>
                    <span/>
                    <button type="button" onClick={() => move(-1, 0)} aria-label="Mover para a esquerda"><ArrowLeft/></button>
                    <button type="button" className="cave-dpad-center" onClick={switchHero} disabled={sync.online}>⇄</button>
                    <button type="button" onClick={() => move(1, 0)} aria-label="Mover para a direita"><ArrowRight/></button>
                    <span/>
                    <button type="button" onClick={() => move(0, 1)} aria-label="Mover para baixo"><ArrowDown/></button>
                    <span/>
                  </div>
                  <p className="cave-control-help">{sync.online ? "Cada pessoa move seu próprio explorador pelo mapa compartilhado." : "Use as setas para explorar. Alterne entre os dois integrantes para abrir caminhos."}</p>
                  <div className="cave-objective"><strong>Objetivo da câmara</strong><span>{exitOpen ? "A saída está aberta. Alcancem o portal ⇧" : "Encontrem " + floorInfo.requiredCrystals + " cristal e derrotem " + aliveMonsters.length + " guardião(ões)."}</span></div>
                </>
              ) : (
                <div className="cave-battle-card">
                  <div className="cave-monster-art">{activeMonster?.icon ?? "◆"}</div>
                  <span className="cave-game-kicker">AMEAÇA IDENTIFICADA</span>
                  <h3>{activeMonster?.name}</h3>
                  <div className="cave-monster-health"><i style={{ width: ((activeMonster?.hp ?? 0) / (activeMonster?.maxHp ?? 1) * 100) + "%" }}/></div>
                  <small>{activeMonster?.hp ?? 0}/{activeMonster?.maxHp ?? 0} PV</small>
                  <div className="cave-battle-actions">
                    <button type="button" onClick={() => attack("strike")}><Sword/> Golpe comum <small>sem custo</small></button>
                    <button type="button" onClick={() => attack("burst")} disabled={game.energy[activeHero] < 2}><Zap/> Ruptura <small>−2 energia</small></button>
                    <button type="button" onClick={() => attack("guard")}><Shield/> Defender <small>reduz dano</small></button>
                    <button type="button" onClick={() => attack("potion")} disabled={game.potions <= 0 || game.hp[activeHero] >= MAX_HP}><Heart/> Poção <small>+5 PV</small></button>
                  </div>
                </div>
              )}
            </aside>
          </div>

          <div className="cave-log-panel"><strong>REGISTRO DA EXPEDIÇÃO</strong>{game.log.map((line, index) => <p key={index}>{line}</p>)}</div>
          {notice && <p className="cave-status" role="status">{notice}</p>}
          <footer className="cave-game-footer"><span>Exploração 2D · mapa compartilhado · {game.moves} movimentos</span><button type="button" onClick={restart}>Reiniciar expedição</button></footer>
        </>
      )}
    </section>
  );
}
