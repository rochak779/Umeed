/**
 * "Today", "Tomorrow" or the weekday name for a local calendar date
 * (YYYY-MM-DD), judged in the given IANA timezone — so an older adult
 * reading "09:00" late in the evening knows it means tomorrow morning.
 */
export function relativeDayLabel(localDate: string, now: Date, timezone: string): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
  const days = Math.round((Date.parse(localDate) - Date.parse(today)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${localDate}T00:00:00Z`),
  );
}
