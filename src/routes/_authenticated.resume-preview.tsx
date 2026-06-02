import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/resume-preview")({
  beforeLoad: () => { throw redirect({ to: "/resume-builder" }); },
});
