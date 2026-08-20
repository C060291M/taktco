// Shared date/time formatting that respects a company's chosen IANA time
// zone (Company.timeZone), rather than the server's own time zone (Railway
// runs in UTC) or a browser's local time zone. Critical for anything that
// needs to be legally/contextually accurate to the business - especially
// signature timestamps on contracts, and due dates/created dates on
// estimates and invoices.
export function formatDateInTz(date: Date | string, timeZone: string, options?: Intl.DateTimeFormatOptions) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options
  }).format(d);
}

export function formatDateTimeInTz(date: Date | string, timeZone: string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(d);
}

export const COMMON_US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Mountain Time - Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" }
];
