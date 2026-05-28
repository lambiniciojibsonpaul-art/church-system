import { restSelect } from "../supabaseRest";

function toMinutes(value) {
  if (!value) return null;
  const raw = String(value).slice(0, 5);
  const [h, m] = raw.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function normalizeDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

export function buildDateSpan(startDate, endDate) {
  const s = normalizeDate(startDate);
  const e = normalizeDate(endDate) || s;
  if (!s) return null;
  return { startDate: s, endDate: e || s };
}

export function timeRangesOverlap(startA, endA, startB, endB) {
  const aStart = toMinutes(startA);
  const bStart = toMinutes(startB);
  if (aStart == null || bStart == null) return false;
  const aEnd = toMinutes(endA) ?? aStart + 60;
  const bEnd = toMinutes(endB) ?? bStart + 60;
  return aStart < bEnd && bStart < aEnd;
}

export function dateRangesOverlap(aStartDate, aEndDate, bStartDate, bEndDate) {
  const as = normalizeDate(aStartDate);
  const ae = normalizeDate(aEndDate) || as;
  const bs = normalizeDate(bStartDate);
  const be = normalizeDate(bEndDate) || bs;
  if (!as || !bs) return false;
  return as <= be && bs <= ae;
}

export function detectEventConflicts({
  events,
  startDate,
  endDate,
  startTime,
  endTime,
  priestName,
  locationKey,
  ignoreEventId,
  indoorOnly = false,
}) {
  return (events || []).filter((ev) => {
    if (!ev) return false;
    if (ignoreEventId && ev.id === ignoreEventId) return false;
    if (ev.status === "Cancelled" || ev.status === "Rejected") return false;
    if (!dateRangesOverlap(startDate, endDate, ev.event_date, ev.event_end_date || ev.event_date)) return false;
    if (!timeRangesOverlap(startTime, endTime, ev.event_time, ev.end_time)) return false;

    const samePriest = priestName && ev.priest_name && String(ev.priest_name) === String(priestName);
    const targetLoc = String(locationKey || "");
    const targetFacility = targetLoc.startsWith("inside:") ? targetLoc.slice("inside:".length) : "";
    const sameIndoorFacility = Boolean(
      targetFacility &&
      (
        String(ev.setting || "").trim() === targetFacility ||
        String(ev.location || "").trim() === targetFacility
      )
    );
    const sameOutsidePin = Boolean(
      targetLoc.startsWith("outside:") &&
      `outside:${ev.latitude || ""},${ev.longitude || ""}` === targetLoc
    );
    const sameLocation = sameIndoorFacility || sameOutsidePin;

    if (indoorOnly) return sameLocation && locationKey.startsWith("inside:");
    return samePriest || sameLocation;
  });
}

export async function fetchActiveEventsForConflict() {
  const { data, error } = await restSelect("events", {
    select: "id,title,status,event_date,event_end_date,event_time,end_time,priest_name,setting,location,latitude,longitude",
    timeoutMs: 10000,
  });
  if (error) throw new Error(error.message || "Failed to load events for conflict checking.");
  return data || [];
}

export function formatConflictWarning(conflicts, contextLabel = "schedules") {
  if (!conflicts || conflicts.length === 0) return "";
  const preview = conflicts
    .slice(0, 3)
    .map((c) => `"${c.title || "Untitled Event"}" on ${String(c.event_date || "").slice(0, 10)} at ${String(c.event_time || "").slice(0, 5)}`)
    .join("\n- ");
  return `Potential time conflict detected with existing ${contextLabel}:\n- ${preview}${conflicts.length > 3 ? `\n...and ${conflicts.length - 3} more.` : ""}\n\nYou can continue anyway.`;
}
