"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLoginAt: Date | string | null;
};

const ALL_ROLES = ["OWNER", "ADMIN", "SALES_REP", "FIELD_TECH"];

function roleColor(role: string) {
  if (role === "OWNER") return "blue";
  if (role === "ADMIN") return "green";
  return "gray";
}

export function TeamTable({
  users,
  currentUserId,
  canManageOwners
}: {
  users: TeamUser[];
  currentUserId: string;
  canManageOwners: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeRole(userId: string, role: string) {
    setBusyId(userId);
    setError(null);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });
    setBusyId(null);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't change that role.");
    }
  }

  async function removeUser(userId: string) {
    if (!confirm("Remove this person's access to the workspace?")) return;
    setBusyId(userId);
    setError(null);
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't remove that person.");
    }
  }

  return (
    <div className="card overflow-hidden">
      {error && <p className="text-sm text-red-400 px-4 pt-4">{error}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-graphite-400 border-b border-graphite-700">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            const roleLocked = u.role === "OWNER" && !canManageOwners;
            return (
              <tr key={u.id} className="border-b border-graphite-700 last:border-0">
                <td className="px-4 py-3 text-graphite-100">
                  {u.name} {isSelf && <span className="text-graphite-500 text-xs">(you)</span>}
                </td>
                <td className="px-4 py-3 text-graphite-300">{u.email}</td>
                <td className="px-4 py-3">
                  {roleLocked ? (
                    <Badge color={roleColor(u.role)}>{u.role.replace("_", " ")}</Badge>
                  ) : (
                    <select
                      className="input py-1 text-xs w-36"
                      value={u.role}
                      disabled={busyId === u.id}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                    >
                      {ALL_ROLES.filter((r) => r !== "OWNER" || canManageOwners).map((r) => (
                        <option key={r} value={r}>{r.replace("_", " ")}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {!isSelf && (
                    <button
                      className="text-xs text-graphite-400 hover:text-red-400"
                      disabled={busyId === u.id}
                      onClick={() => removeUser(u.id)}
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
