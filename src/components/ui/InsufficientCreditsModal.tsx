"use client";

export function InsufficientCreditsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white font-medium">You're out of TAKTCO Credits</h2>
        <p className="text-sm text-graphite-400">
          You've used all of your included TAKTCO Credits for this billing cycle.
        </p>
        <div className="space-y-2">
          <a href="/settings/ai/credits" className="btn-primary w-full text-center block">Purchase additional credits</a>
          <a href="/settings/ai" className="btn-secondary w-full text-center block">Connect your own AI provider</a>
          <button type="button" className="text-xs text-graphite-400 hover:text-white w-full text-center" onClick={onClose}>
            Wait until my monthly reset
          </button>
        </div>
      </div>
    </div>
  );
}
