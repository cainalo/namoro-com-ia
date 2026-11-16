import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MoradosFeedHeader } from "./MoradosFeedHeader";

describe("MoradosFeedHeader", () => {
  it("introduces the shared mural with one clear page heading", () => {
    render(<MoradosFeedHeader />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "O que vale a pena guardar." })).toBeInTheDocument();
    expect(screen.getByText("O MURAL DE VOCÊS")).toBeInTheDocument();
  });

  it("keeps the decorative vector artwork out of the accessibility tree", () => {
    render(<MoradosFeedHeader />);

    expect(screen.getByRole("banner").querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
