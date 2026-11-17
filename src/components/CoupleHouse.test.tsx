import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CoupleHouse } from "./CoupleHouse";

describe("CoupleHouse", () => {
  it("lets the user select a ground location and enter the residence", () => {
    render(<CoupleHouse />);

    const gardens = screen.getByRole("button", { name: "Jardins" });
    fireEvent.click(gardens);

    expect(gardens).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("A área verde ao redor da residência.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Residência" }));
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByRole("heading", { name: "Salão de entrada" })).toBeInTheDocument();
  });

  it("changes the selected interior feature and returns to the grounds", () => {
    render(<CoupleHouse />);
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    const stainedGlass = screen.getByRole("button", { name: "Explorar Vitral" });
    fireEvent.click(stainedGlass);

    expect(stainedGlass).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/A luz atravessa as peças coloridas/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Voltar ao terreno" }));
    expect(screen.getByRole("heading", { name: "Casa" })).toBeInTheDocument();
  });

  it("preserves lighting and zoom controls", () => {
    render(<CoupleHouse />);

    fireEvent.click(screen.getByRole("button", { name: "Luz da noite" }));
    expect(document.querySelector(".house-map-shell")).toHaveClass("is-night");

    fireEvent.click(screen.getByRole("button", { name: "Aproximar mapa" }));
    expect(screen.getByText("115%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restaurar escala do mapa" }));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
