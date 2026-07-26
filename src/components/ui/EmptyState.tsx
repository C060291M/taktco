export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-sm text-graphite-300 font-medium">{title}</p>
      {description && <p className="text-sm text-graphite-500 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
