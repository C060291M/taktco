import { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead><tr className="text-left text-graphite-400 border-b border-graphite-700">{children}</tr></thead>;
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr className="border-b border-graphite-700 last:border-0 hover:bg-graphite-800/60">{children}</tr>;
}
