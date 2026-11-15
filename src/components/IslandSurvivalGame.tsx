import { IslandSurvivalStory } from "@/components/IslandSurvivalStory";

export function IslandSurvivalGame({ solo = false }: { solo?: boolean }) {
  return <IslandSurvivalStory solo={solo} />;
}
