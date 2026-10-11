import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/labels")({
  head: () => ({
    meta: [
      { property: "og:title", content: "Virtual Labels · Ai Music Factory" },
      { property: "og:description", content: "Premium virtual labels: houses with their own roster, specialty, reputation and revenue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Virtual Labels · Ai Music Factory" },
      { name: "description", content: "Premium virtual labels: houses with their own roster, specialty, reputation and revenue." },
    ],
  }),
  component: () => <Outlet />,
});
