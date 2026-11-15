import { CoupleTrainInvestigationBook } from "@/components/InteractiveCaseBook";

export function CoupleInvestigationTrainGame({ solo = false }: { solo?: boolean }) {
  return <CoupleTrainInvestigationBook solo={solo} />;
}
