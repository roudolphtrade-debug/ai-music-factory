import { demoPageHead } from "@/i18n/demo-details";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/labels")({
  head: () => demoPageHead("labels"),
  component: () => <Outlet />,
});
