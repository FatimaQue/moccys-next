// Opening hours, in Pakistan time (UTC+5, no daylight saving). Shared by the server (which refuses orders while
// closed) and the pages (which tell the customer why), so there is one place to change them.
export const OPEN_HOUR = 10; // 10:00 AM
export const CLOSE_HOUR = 4; // 4:00 AM, the next morning
export const HOURS_LABEL = "10:00 AM – 04:00 AM";
export const CLOSED_MESSAGE = `We're closed right now. We take orders from ${HOURS_LABEL} (Pakistan time).`;

const PKT_OFFSET_HOURS = 5;

export function isOpenNow(now: Date = new Date()) {
  const hour = (now.getUTCHours() + PKT_OFFSET_HOURS) % 24;
  return hour >= OPEN_HOUR || hour < CLOSE_HOUR;
}
