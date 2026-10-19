"use client";
import { Button } from "@/components/ui";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <div className="mx-auto flex min-h-80 max-w-lg flex-col items-center justify-center text-center"><p className="text-xs uppercase tracking-[.15em] text-white/35">Something went wrong</p><h2 className="mt-3 text-xl font-medium">This view couldn’t load</h2><p className="mt-2 text-sm text-white/45">Try again in a moment.</p><Button onClick={reset} variant="secondary" className="mt-6">Try again</Button></div>; }
