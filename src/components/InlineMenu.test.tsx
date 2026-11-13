import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InlineMenu } from "./InlineMenu";

describe("InlineMenu", () => {
  it("opens an in-tree menu and closes it after an action", () => {
    const action = vi.fn();
    render(
      <InlineMenu label="Opções" trigger={<span>Mais</span>}>
        {(close) => <button type="button" role="menuitem" onClick={() => { action(); close(); }}>Abrir</button>}
      </InlineMenu>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Opções" }));
    expect(screen.getByRole("menu", { name: "Opções" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Abrir" }));
    expect(action).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu", { name: "Opções" })).not.toBeInTheDocument();
  });

  it("closes on Escape and outside pointer interaction", () => {
    render(
      <div>
        <InlineMenu label="Opções" trigger={<span>Mais</span>}>
          {() => <button type="button" role="menuitem">Ação</button>}
        </InlineMenu>
        <button type="button">Fora</button>
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Opções" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Opções" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Opções" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Fora" }));
    expect(screen.queryByRole("menu", { name: "Opções" })).not.toBeInTheDocument();
  });
});
