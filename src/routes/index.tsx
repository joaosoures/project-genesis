import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "App" },
      { name: "description", content: "A blank app." },
      { property: "og:title", content: "App" },
      { property: "og:description", content: "A blank app." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
});

function Index() {
  return <div className="min-h-screen bg-background" />;
}
