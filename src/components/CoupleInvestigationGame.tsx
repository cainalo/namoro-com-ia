import { CoupleInvestigationBook } from "@/components/InteractiveCaseBook";

export function CoupleInvestigationGame({ solo = false }: { solo?: boolean }) {
  return <CoupleInvestigationBook solo={solo} />;
}
