"use client";

import { useState } from "react";
import type { Lead, LeadStatus } from "@/app/page";
import { StatusBadge } from "./StatusBadge";
import { Timeline } from "./Timeline";

type Tab = "overview" | "history" | "contact";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventDate(iso: string | null) {
  if (!iso) return "TBD";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function relativeDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

interface Props {
  lead: Lead;
  expanded: boolean;
  onToggle: () => void;
}

export function LeadCard({ lead, expanded, onToggle }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  const isSilent = lead.daysSilent >= 7;
  const isHighPriority = lead.priority === "high";

  return (
    <div
      className={`rounded-xl border transition-all ${
        isHighPriority
          ? "border-red-500/40 bg-[#1a1a2a]"
          : "border-[#2d5040] bg-[#142a1e]"
      }`}
    >
      {/* Card header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white truncate">{lead.name}</span>
            <StatusBadge status={lead.status as LeadStatus} />
            {isSilent && (
              <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-medium px-2 py-0.5 rounded-full">
                {lead.daysSilent}d silent
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-1 flex-wrap text-sm text-[#7aab8a]">
            {lead.eventType && <span className="capitalize">{lead.eventType}</span>}
            {lead.eventType && (lead.eventDate || lead.location) && (
              <span className="text-[#2d5040]">·</span>
            )}
            {lead.eventDate && (
              <span>{formatEventDate(lead.eventDate)}</span>
            )}
            {lead.location && (
              <>
                <span className="text-[#2d5040]">·</span>
                <span className="truncate max-w-[160px]">{lead.location}</span>
              </>
            )}
          </div>

          <div className="mt-1 text-xs text-[#4a7a5a]">
            {lead.outreachCount > 0 ? (
              <>
                {lead.outreachCount} outreach{lead.outreachCount !== 1 ? "es" : ""}
                {lead.clientResponded && lead.lastClientReply ? (
                  <span className="text-emerald-400"> · Replied {relativeDate(lead.lastClientReply)}</span>
                ) : (
                  <span className="text-orange-400"> · Never replied</span>
                )}
              </>
            ) : (
              <span>No outreach yet</span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          {lead.quoteAmount && (
            <span className="text-[#f0c040] text-sm font-semibold">
              ${lead.quoteAmount.toLocaleString()}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-[#4a7a5a] transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-[#2d5040]">
          {/* Tabs */}
          <div className="flex border-b border-[#2d5040]">
            {(["overview", "history", "contact"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? "text-[#f0c040] border-b-2 border-[#f0c040] -mb-px"
                    : "text-[#4a7a5a] hover:text-[#7aab8a]"
                }`}
              >
                {t === "overview" ? "Overview" : t === "history" ? "History" : "Contact"}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === "overview" && (
              <OverviewTab lead={lead} />
            )}
            {tab === "history" && (
              <Timeline events={lead.timeline} />
            )}
            {tab === "contact" && (
              <ContactTab lead={lead} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ lead }: { lead: Lead }) {
  return (
    <div className="space-y-4">
      {/* AI Summary */}
      {lead.currentSituation && (
        <div className="rounded-lg bg-[#1a3a2a] border border-[#2d5040] p-3">
          <p className="text-xs font-semibold text-[#f0c040] mb-1.5 uppercase tracking-wide">
            Where things stand
          </p>
          <p className="text-sm text-[#c8e0d0] leading-relaxed">{lead.currentSituation}</p>
        </div>
      )}

      {/* Event details grid */}
      <div className="grid grid-cols-2 gap-2">
        <DetailItem label="Event Date" value={formatEventDate(lead.eventDate)} />
        <DetailItem label="Event Type" value={lead.eventType} capitalize />
        <DetailItem label="Guests" value={lead.guestCount ? `${lead.guestCount} people` : null} />
        <DetailItem label="Location" value={lead.location} />
        <DetailItem label="Package" value={lead.packageInterest} />
        <DetailItem label="Source" value={lead.leadSource} capitalize />
        {lead.quoteAmount && (
          <DetailItem label="Quote" value={`$${lead.quoteAmount.toLocaleString()}`} />
        )}
        {lead.depositAmount && (
          <DetailItem label="Deposit" value={`$${lead.depositAmount.toLocaleString()}`} />
        )}
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string | number | null | undefined;
  capitalize?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="bg-[#1a3a2a] rounded-lg p-2.5">
      <p className="text-xs text-[#4a7a5a] mb-0.5">{label}</p>
      <p className={`text-sm text-white font-medium ${capitalize ? "capitalize" : ""}`}>
        {String(value)}
      </p>
    </div>
  );
}

function ContactTab({ lead }: { lead: Lead }) {
  return (
    <div className="space-y-4">
      {/* Tap-to links */}
      <div className="space-y-2">
        <a
          href={`mailto:${lead.email}`}
          className="flex items-center gap-3 rounded-lg bg-[#1a3a2a] border border-[#2d5040] px-4 py-3 hover:border-[#f0c040]/50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-[#f0c040]/10 border border-[#f0c040]/30 flex items-center justify-center text-sm">
            ✉
          </div>
          <div>
            <p className="text-xs text-[#4a7a5a]">Email</p>
            <p className="text-sm text-white group-hover:text-[#f0c040] transition-colors">
              {lead.email}
            </p>
          </div>
        </a>

        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            className="flex items-center gap-3 rounded-lg bg-[#1a3a2a] border border-[#2d5040] px-4 py-3 hover:border-[#f0c040]/50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-[#f0c040]/10 border border-[#f0c040]/30 flex items-center justify-center text-sm">
              📞
            </div>
            <div>
              <p className="text-xs text-[#4a7a5a]">Phone</p>
              <p className="text-sm text-white group-hover:text-[#f0c040] transition-colors">
                {lead.phone}
              </p>
            </div>
          </a>
        )}
      </div>

      {/* Outreach summary */}
      <div className="rounded-lg bg-[#1a3a2a] border border-[#2d5040] p-3 space-y-2">
        <p className="text-xs font-semibold text-[#f0c040] uppercase tracking-wide">
          Outreach Summary
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-[#4a7a5a] text-xs">Times Reached Out</p>
            <p className="text-white font-medium">{lead.outreachCount}</p>
          </div>
          <div>
            <p className="text-[#4a7a5a] text-xs">Ever Responded</p>
            <p className={`font-medium ${lead.clientResponded ? "text-emerald-400" : "text-orange-400"}`}>
              {lead.clientResponded ? "Yes" : "No"}
            </p>
          </div>
          <div>
            <p className="text-[#4a7a5a] text-xs">Last Outreach</p>
            <p className="text-white font-medium">{formatDate(lead.lastOutreach) || "—"}</p>
          </div>
          <div>
            <p className="text-[#4a7a5a] text-xs">Last Reply</p>
            <p className="text-white font-medium">{formatDate(lead.lastClientReply) || "—"}</p>
          </div>
          <div>
            <p className="text-[#4a7a5a] text-xs">First Contact</p>
            <p className="text-white font-medium">{formatDate(lead.firstContact) || "—"}</p>
          </div>
          {lead.daysSilent > 0 && (
            <div>
              <p className="text-[#4a7a5a] text-xs">Days Silent</p>
              <p className={`font-medium ${lead.daysSilent >= 7 ? "text-red-400" : "text-white"}`}>
                {lead.daysSilent}d
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
