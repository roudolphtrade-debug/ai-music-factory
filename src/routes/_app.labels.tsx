import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/labels")({
  head: () => ({
    meta: [
      { title: "Virtual Labels — Ai Music Factory" },
      { name: "description", content: "Premium virtual labels — houses with their own roster, specialty, reputation and revenue." },
    ],
  }),
  component: () => <Outlet />,
});
