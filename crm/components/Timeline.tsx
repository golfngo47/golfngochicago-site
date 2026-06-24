"use client";

import type { TimelineEvent } from "@/app/page";

const TYPE_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  jotform:  { color: "border-blue-400 bg-blue-500/10",         dot: "bg-blue-400",     label: "JotForm Submission" },
  outbound: { color: "border-[#f0c040] bg-[#f0c040]/10",       dot: "bg-[#f0c040]",    label: "Jake Outreach" },
  inbound:  { color: "border-emerald-400 bg-emerald-500/10",   dot: "bg-emerald-400",  label: "Client Reply" },
  quote:    { color: "border-orange-400 bg-orange-500/10",     dot: "bg-orange-400",   label: "Quote Sent" },
  approved: { color: "border-emerald-300 bg-emerald-500/15",   dot: "bg-emerald-300",  label: "Quote Approved" },
  deposit:  { color: "border-emerald-500 bg-emerald-600/20",   dot: "bg-emerald-500",  label: "Deposit Received" },
  invoice:  { color: "border-sky-400 bg-sky-500/10",           dot: "bg-sky-400",      label: "Invoice Sent" },
  paid:     { color: "border-emerald-400 bg-emerald-500/20",   dot: "bg-emerald-400",  label: "Invoice Paid ✓" },
  voicemail:{ color: "border-purple-400 bg-purple-500/10",     dot: "bg-purple-400",   label: "Voicemail" },
  noReply:  { color: "border-gray-500 bg-gray-500/10",         dot: "bg-gray-500",     label: "No Reply" },
  unknown:  { color: "border-[#2d5040] bg-[#1a3a2a]",         dot: "bg-[#4a7a5a]",    label: "Email" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  events: TimelineEvent[];
}

export function Timeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-[#4a7a5a] text-sm text-center py-4">No timeline events yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, i) => {
        const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.unknown;
        return (
          <div key={event.id} className="flex gap-3 relative">
            {/* Connector line */}
            {i < events.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-[-12px] w-0.5 bg-[#2d5040]" />
            )}
            {/* Dot */}
            <div className={`flex-shrink-0 w-6 h-6 rounded-full ${cfg.dot} mt-0.5 z-10 shadow-sm`} />
            {/* Content */}
            <div className={`flex-1 rounded-lg border px-3 py-2 ${cfg.color}`}>
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-semibold text-white/80">{cfg.label}</span>
                <span className="text-xs text-[#4a7a5a]">{formatDate(event.date)}</span>
              </div>
              <p className="text-sm text-[#c8e0d0]">{event.summary}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
