import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/resume-download")({
  beforeLoad: () => { throw redirect({ to: "/resume-builder" }); },
});
