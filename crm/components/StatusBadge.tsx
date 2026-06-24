"use client";

import type { LeadStatus } from "@/app/page";

const STATUS_STYLES: Record<LeadStatus, string> = {
  "New Lead":      "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Quote Sent":    "bg-[#f0c040]/20 text-[#f0c040] border-[#f0c040]/30",
  "Quote Approved":"bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Deposit Paid":  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Confirmed":     "bg-emerald-600/30 text-emerald-200 border-emerald-500/40",
  "Ghosting":      "bg-red-500/20 text-red-300 border-red-500/30",
  "Invoice Sent":  "bg-sky-500/20 text-sky-300 border-sky-500/30",
  "Completed":     "bg-[#2d5040]/60 text-[#7aab8a] border-[#2d5040]",
  "Lost":          "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

interface Props {
  status: LeadStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30"} ${className}`}
    >
      {status}
    </span>
  );
}
