export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card p-5 border-red-500/30 bg-red-500/5">
      <p className="text-sm text-red-300">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-red-300 underline mt-2">
          Try again
        </button>
      )}
    </div>
  );
}
