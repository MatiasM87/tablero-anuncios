// Per-page schedule helpers. A schedule looks like:
//   { enabled, days: [0-6], start: 'HH:MM', end: 'HH:MM', hideOutside }
// days uses getDay() numbering (0 = domingo). An end earlier than start means
// the range crosses midnight (e.g. 22:00 → 06:00).

export const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export function isScheduleActive(schedule, now = new Date()) {
  if (!schedule?.enabled || !schedule.days?.length || !schedule.start || !schedule.end) return false;
  const start = toMinutes(schedule.start);
  const end = toMinutes(schedule.end);
  if (start === end) return false;

  const minutes = now.getHours() * 60 + now.getMinutes();
  const day = now.getDay();

  if (start < end) {
    return schedule.days.includes(day) && minutes >= start && minutes < end;
  }
  // Overnight range: active from `start` on a selected day until `end` the
  // morning after (which lands on the following weekday).
  return (
    (schedule.days.includes(day) && minutes >= start) ||
    (schedule.days.includes((day + 6) % 7) && minutes < end)
  );
}
