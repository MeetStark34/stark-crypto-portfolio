import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui";

export function SectionPage({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="space-y-7"><div><p className="text-xs text-white/40">Your workspace</p><h2 className="mt-2 text-2xl font-medium tracking-tight">{title}</h2><p className="mt-2 text-sm text-white/42">{description}</p></div>{children ?? <EmptyState title="Nothing to show yet" description="This view will fill in as your portfolio data becomes available."/>}</div>;
}
