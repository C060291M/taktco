const styles: Record<string, string> = {
  gray: "bg-graphite-700 text-graphite-200",
  blue: "bg-blue-500/15 text-blue-400",
  green: "bg-emerald-500/15 text-emerald-400",
  yellow: "bg-amber-500/15 text-amber-400",
  red: "bg-red-500/15 text-red-400"
};

export function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: keyof typeof styles }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styles[color]}`}>
      {children}
    </span>
  );
}
