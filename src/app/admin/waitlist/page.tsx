import { db } from "@/database/client";

export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  const entries = await db.waitlistEntry.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-white">Waitlist</h1>
        <p className="text-sm text-graphite-400">
          {entries.length} {entries.length === 1 ? "person" : "people"} waiting for a beta spot.
        </p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-graphite-400">
              <th className="p-3 font-medium">Joined</th>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Company</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td className="p-3 text-graphite-400" colSpan={4}>No one yet.</td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-t border-graphite-700 text-graphite-200">
                  <td className="p-3">{e.createdAt.toLocaleString("en-US", { timeZone: "America/Chicago" })}</td>
                  <td className="p-3">{e.name || "-"}</td>
                  <td className="p-3">{e.email}</td>
                  <td className="p-3">{e.company || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}