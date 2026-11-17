import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MoradosPlansHeader } from "./MoradosPlansHeader";

describe("MoradosPlansHeader", () => {
  it("shows the count for the visible month", () => {
    render(
      <MoradosPlansHeader
        eventCount={3}
        monthLabel="novembro de 2026"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Planos" })).toBeInTheDocument();
    expect(screen.getByText("3", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("compromissos em novembro de 2026")).toBeInTheDocument();
  });

  it("uses the singular label for one commitment", () => {
    render(
      <MoradosPlansHeader
        eventCount={1}
        monthLabel="novembro de 2026"
      />,
    );

    expect(screen.getByText("compromisso em novembro de 2026")).toBeInTheDocument();
  });

  it("does not present an unavailable count as zero", () => {
    render(
      <MoradosPlansHeader
        eventCount={null}
        monthLabel="novembro de 2026"
      />,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("contagem em atualização")).toBeInTheDocument();
  });
});
