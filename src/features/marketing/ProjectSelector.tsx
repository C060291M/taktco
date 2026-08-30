"use client";
import { useRouter } from "next/navigation";

type ProjectOption = { id: string; label: string };

export function ProjectSelector({ projects, selectedJobId }: { projects: ProjectOption[]; selectedJobId?: string }) {
  const router = useRouter();

  return (
    <div className="card p-5">
      <label className="block text-xs text-graphite-400 mb-2">Generate from a completed project</label>
      <select
        className="input"
        value={selectedJobId || ""}
        onChange={function (e) {
          const value = e.target.value;
          router.push(value ? "/marketing?jobId=" + value : "/marketing");
        }}
      >
        <option value="">Write a general post instead...</option>
        {projects.map(function (p) {
          return <option key={p.id} value={p.id}>{p.label}</option>;
        })}
      </select>
      {projects.length === 0 && (
        <p className="text-[11px] text-graphite-500 mt-2">No projects with photos yet - add before/after photos on a job to see it here.</p>
      )}
    </div>
  );
}
