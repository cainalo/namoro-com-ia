export const ISLAND_STORY_PAGE_COUNT = 8;

export type IslandTutorialStep =
  | "story"
  | "forage"
  | "water"
  | "shelter"
  | "night"
  | "forest"
  | "wreck"
  | "signal"
  | "free";

export type IslandTutorialTask =
  | "begin"
  | "forage"
  | "water"
  | "shelter"
  | "night"
  | "forest"
  | "wreck"
  | "signal";

const NEXT_STEP: Record<IslandTutorialTask, IslandTutorialStep> = {
  begin: "forage",
  forage: "water",
  water: "shelter",
  shelter: "night",
  night: "forest",
  forest: "wreck",
  wreck: "signal",
  signal: "free",
};

/** Só avança quando a ação correspondente ao capítulo foi concluída. */
export function advanceIslandTutorial(
  current: IslandTutorialStep,
  completed: IslandTutorialTask,
): IslandTutorialStep {
  const expected: Record<IslandTutorialStep, IslandTutorialTask | null> = {
    story: "begin",
    forage: "forage",
    water: "water",
    shelter: "shelter",
    night: "night",
    forest: "forest",
    wreck: "wreck",
    signal: "signal",
    free: null,
  };
  return expected[current] === completed ? NEXT_STEP[completed] : current;
}

export const ISLAND_TUTORIAL_ORDER: readonly IslandTutorialStep[] = [
  "forage",
  "water",
  "shelter",
  "night",
  "forest",
  "wreck",
  "signal",
  "free",
];

export function islandTutorialProgress(step: IslandTutorialStep) {
  const index = ISLAND_TUTORIAL_ORDER.indexOf(step);
  return index < 0 ? 0 : Math.round((index / (ISLAND_TUTORIAL_ORDER.length - 1)) * 100);
}
