"use client";

// Lightweight modal shell - the app's existing forms (NewCustomerForm, NewEstimateForm,
// etc.) each implement this same overlay pattern inline. This component is the
// reusable version for new forms going forward; existing ones are left as-is
// rather than force-migrated (see Phase 1 completion notes on migration risk).
export function Dialog({ open, onClose, children, maxWidth = "max-w-md" }: { open: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`card w-full ${maxWidth} p-6 max-h-[85vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
