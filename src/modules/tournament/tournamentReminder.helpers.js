const DEFAULT_TIME_ZONE = "UTC";

export function getReminderTimeZone() {
  const configuredTimeZone = process.env.REMINDER_TIMEZONE || DEFAULT_TIME_ZONE;

  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: configuredTimeZone }).format();
    return configuredTimeZone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export function getDateKey(value, timeZone = getReminderTimeZone()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function subtractCalendarDays(dateKey, days) {
  return addCalendarDays(dateKey, -Number(days));
}

export function addCalendarDays(dateKey, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + Number(days));

  return date.toISOString().slice(0, 10);
}

export function getNextDailyRun({
  now = new Date(),
  timeZone = getReminderTimeZone(),
  hour = 8,
  minute = 0,
} = {}) {
  const safeHour = Number.isInteger(Number(hour)) && Number(hour) >= 0 && Number(hour) <= 23
    ? Number(hour)
    : 8;
  const safeMinute =
    Number.isInteger(Number(minute)) && Number(minute) >= 0 && Number(minute) <= 59
      ? Number(minute)
      : 0;

  let targetDateKey = getDateKey(now, timeZone);
  let nextRun = zonedDateTimeToUtc({
    dateKey: targetDateKey,
    hour: safeHour,
    minute: safeMinute,
    timeZone,
  });

  if (nextRun.getTime() <= now.getTime()) {
    targetDateKey = addCalendarDays(targetDateKey, 1);
    nextRun = zonedDateTimeToUtc({
      dateKey: targetDateKey,
      hour: safeHour,
      minute: safeMinute,
      timeZone,
    });
  }

  return nextRun;
}

export function isReminderDue({ deadline, reminderDays, now = new Date(), timeZone }) {
  const days = Number(reminderDays);
  if (!Number.isInteger(days) || days <= 0) return false;

  const zone = timeZone || getReminderTimeZone();
  const deadlineKey = getDateKey(deadline, zone);
  const todayKey = getDateKey(now, zone);
  if (!deadlineKey || !todayKey) return false;

  const reminderKey = subtractCalendarDays(deadlineKey, days);

  // The range allows the job to catch up after temporary server downtime, but
  // never sends a reminder after the round deadline.
  return todayKey >= reminderKey && todayKey <= deadlineKey;
}

export function collectMatchReminderRecipients(match) {
  const recipients = new Map();

  const addRecipient = (player, opponentName) => {
    const email = player?.email?.trim().toLowerCase();
    if (!email || recipients.has(email)) return;

    recipients.set(email, {
      email,
      playerName: player.fullName || "Player",
      opponentName: opponentName || "your opponent",
    });
  };

  if (match.matchType === "Pairs") {
    const pair1Name = getPairName(match.pair1Id);
    const pair2Name = getPairName(match.pair2Id);

    addRecipient(match.pair1Id?.player1, pair2Name);
    addRecipient(match.pair1Id?.player2, pair2Name);
    addRecipient(match.pair2Id?.player1, pair1Name);
    addRecipient(match.pair2Id?.player2, pair1Name);
  } else {
    // Existing Single and Team matches both use player1Id/player2Id.
    addRecipient(match.player1Id, match.player2Id?.fullName);
    addRecipient(match.player2Id, match.player1Id?.fullName);
  }

  return [...recipients.values()];
}

function getPairName(pair) {
  if (!pair) return "your opponent";
  if (pair.teamName) return pair.teamName;

  return [pair.player1?.fullName, pair.player2?.fullName]
    .filter(Boolean)
    .join(" & ") || "your opponent";
}

function zonedDateTimeToUtc({ dateKey, hour, minute, timeZone }) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let candidate = targetAsUtc;

  // Recalculate the timezone offset from Intl data. Repeating the adjustment
  // handles an offset change close to a daylight-saving boundary.
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = getZonedDateTimeParts(new Date(candidate), timeZone);
    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    const adjustment = targetAsUtc - representedAsUtc;
    candidate += adjustment;
    if (adjustment === 0) break;
  }

  return new Date(candidate);
}

function getZonedDateTimeParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
}
