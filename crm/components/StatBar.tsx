"use client";

import type { Stats } from "@/app/page";

interface Props {
  stats: Stats;
}

export function StatBar({ stats }: Props) {
  const items = [
    { label: "Active Leads", value: stats.active, color: "text-[#7aab8a]" },
    { label: "Urgent", value: stats.urgent, color: "text-red-400" },
    { label: "Quotes Out", value: stats.quotesOut, color: "text-[#f0c040]" },
    { label: "Confirmed", value: stats.confirmed, color: "text-emerald-400" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-[#1a3a2a] rounded-xl p-3 text-center border border-[#2d5040]"
        >
          <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
          <div className="text-[#4a7a5a] text-xs mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
