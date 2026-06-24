"use client";

interface Props {
  onConnect: () => void;
}

export function AuthBanner({ onConnect }: Props) {
  return (
    <div className="rounded-xl bg-[#1a3a2a] border border-[#f0c040]/40 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#f0c040]/10 border border-[#f0c040]/40 flex items-center justify-center text-xl">
          📧
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Connect Gmail to get started</p>
          <p className="text-[#7aab8a] text-xs mt-0.5">
            Authorize once — your token is stored locally and never expires.
          </p>
        </div>
      </div>
      <button
        onClick={onConnect}
        className="flex-shrink-0 px-4 py-2 rounded-lg bg-[#f0c040] text-[#1a3a2a] font-semibold text-sm hover:bg-[#f5d06a] transition-colors"
      >
        Connect Gmail
      </button>
    </div>
  );
}
