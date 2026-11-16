import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MoradosMemoriesHeader } from "./MoradosMemoriesHeader";

describe("MoradosMemoriesHeader", () => {
  it("introduces the memory archive with one clear page heading", () => {
    render(<MoradosMemoriesHeader count={3} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Há momentos que merecem ficar." }),
    ).toBeInTheDocument();
    expect(screen.getByText("O CADERNO DE VOCÊS")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("lembranças guardadas")).toBeInTheDocument();
  });

  it("keeps the decorative vector artwork out of the accessibility tree", () => {
    const { container } = render(<MoradosMemoriesHeader count={0} />);

    expect(container.querySelector(".morados-memories-art")).toHaveAttribute("aria-hidden", "true");
  });
});
