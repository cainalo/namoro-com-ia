import { createFileRoute } from "@tanstack/react-router";
import { AiChat } from "@/components/AiChat";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NAMORO" },
      { name: "description", content: "NAMORO — converse com uma IA sobre amor e relacionamentos." },
      { property: "og:title", content: "NAMORO" },
      { property: "og:description", content: "Converse com uma IA sobre amor e relacionamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <h1 className="namoro-word font-display text-foreground">NAMORO</h1>
      <AiChat />
    </main>
  );
}
