"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Button({ children, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const style = variant === "primary" ? "bg-[#d5e2d9] text-[#121714] hover:bg-white" : variant === "secondary" ? "border border-white/10 bg-white/[0.035] text-white/75 hover:bg-white/[0.075]" : "text-white/50 hover:bg-white/[0.06] hover:text-white";
  return <button {...props} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${style} ${props.className ?? ""}`}>{children}</button>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-11 w-full rounded-xl border border-white/10 bg-white/[0.025] px-3.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25 ${props.className ?? ""}`}/>;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-11 rounded-xl border border-white/10 bg-[#111516] px-3.5 text-sm text-white/75 outline-none focus:border-white/25 ${props.className ?? ""}`}/>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} aria-labelledby="modal-title" onClose={onClose} onClick={(event) => { if (event.target === ref.current) onClose(); }} className="w-[min(92vw,480px)] rounded-2xl border border-white/10 bg-[#121617] p-0 text-white shadow-2xl backdrop:bg-black/65"><div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4"><h2 id="modal-title" className="text-sm font-medium">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-white/45 hover:bg-white/[0.06]"><X size={16}/></button></div><div className="p-5">{children}</div></dialog>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.09] px-6 text-center"><p className="text-sm text-white/70">{title}</p><p className="mt-2 max-w-sm text-xs leading-5 text-white/38">{description}</p></div>;
}

export function LoadingState() {
  return <div aria-label="Loading" className="animate-pulse space-y-4"><div className="h-8 w-52 rounded-lg bg-white/[0.06]"/><div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-28 rounded-2xl bg-white/[0.04]"/> )}</div><div className="h-64 rounded-2xl bg-white/[0.04]"/></div>;
}
