export type CaveFloor = {
  name: string;
  map: string[];
  monsters: Array<{ x: number; y: number; hp: number; attack: number; name: string; icon: string }>;
  requiredCrystals: number;
};
export type CavePoint = { x: number; y: number };

export const CAVE_FLOORS: CaveFloor[] = [
  {
    name: "Galeria das Raízes",
    map: [
      "##########",
      "#P...#...#",
      "#.#..#...#",
      "#.#..#g..#",
      "#...c...E#",
      "#.##...#.#",
      "#...r....#",
      "##########",
    ],
    monsters: [{ x: 6, y: 3, hp: 5, attack: 1, name: "Sentinela de Musgo", icon: "🌿" }],
    requiredCrystals: 1,
  },
  {
    name: "Fornalha Submersa",
    map: [
      "##########",
      "#P....#..#",
      "#.##..#g.#",
      "#..c.....#",
      "###.###E.#",
      "#...g....#",
      "#...r....#",
      "##########",
    ],
    monsters: [
      { x: 7, y: 2, hp: 7, attack: 2, name: "Escavador de Cinzas", icon: "🦂" },
      { x: 4, y: 5, hp: 6, attack: 2, name: "Vigia das Brasas", icon: "🦇" },
    ],
    requiredCrystals: 1,
  },
  {
    name: "Câmara do Coração",
    map: [
      "##########",
      "#P....#..#",
      "#.##..#..#",
      "#..g.....#",
      "#...c##E.#",
      "#.g......#",
      "#...r....#",
      "##########",
    ],
    monsters: [
      { x: 3, y: 3, hp: 8, attack: 2, name: "Guardião de Basalto", icon: "🗿" },
      { x: 2, y: 5, hp: 7, attack: 2, name: "Lobo da Fenda", icon: "🐺" },
    ],
    requiredCrystals: 1,
  },
];

export function caveCell(map: string[], point: CavePoint) {
  return map[point.y]?.[point.x] ?? "#";
}

export function revealCave(map: string[], positions: CavePoint[], radius = 1) {
  const found = new Set<string>();
  positions.forEach((position) => {
    for (let y = position.y - radius; y <= position.y + radius; y += 1) {
      for (let x = position.x - radius; x <= position.x + radius; x += 1) {
        if (map[y]?.[x] && map[y][x] !== "#") found.add(x + "," + y);
      }
    }
  });
  return [...found];
}

export function isAdjacent(from: CavePoint, to: CavePoint) {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y) === 1;
}

export function caveFloorIsValid(floor: CaveFloor) {
  const width = floor.map[0]?.length ?? 0;
  if (!width || floor.map.some((row) => row.length !== width)) return false;
  const layout = floor.map.join("");
  return layout.includes("P") && layout.includes("E") && layout.includes("r") && layout.includes("c") && floor.monsters.length > 0;
}
