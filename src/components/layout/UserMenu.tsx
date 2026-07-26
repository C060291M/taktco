"use client";
import { useRouter } from "next/navigation";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";

export function UserMenu({ userName, userRole }: { userName: string; userRole: string }) {
  const router = useRouter();

  return (
    <Dropdown
      trigger={
        <button className="flex items-center gap-2 text-sm text-graphite-200 hover:text-white">
          <div className="h-7 w-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <span className="hidden sm:inline">{userName}</span>
        </button>
      }
    >
      <div className="px-3 py-2 border-b border-graphite-700">
        <p className="text-sm text-white">{userName}</p>
        <p className="text-xs text-graphite-500">{userRole.replace("_", " ")}</p>
      </div>
      <DropdownItem onClick={() => router.push("/settings")}>Settings</DropdownItem>
      <DropdownItem
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.href = "/login";
        }}
      >
        Sign out
      </DropdownItem>
    </Dropdown>
  );
}
