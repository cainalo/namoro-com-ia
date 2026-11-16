import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MoradosConversationWelcome } from "./MoradosConversationWelcome";

describe("MoradosConversationWelcome", () => {
  it("introduces the private conversation with a clear message", () => {
    render(<MoradosConversationWelcome />);

    expect(
      screen.getByText("UM LUGAR PARA CONVERSAR"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Um cantinho só de vocês."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Mensagens, fotos e áudios/),
    ).toBeInTheDocument();
  });

  it("keeps the decorative speech-bubble illustration out of the accessibility tree", () => {
    const { container } = render(<MoradosConversationWelcome />);

    expect(
      container.querySelector(".conversation-first-message-art"),
    ).toHaveAttribute("aria-hidden", "true");
  });

  it("does not advertise removed stickers or gifts", () => {
    const { container } = render(<MoradosConversationWelcome />);

    expect(container.textContent?.toLowerCase()).not.toMatch(/adesivo|presente|sticker|gift/);
  });
});
