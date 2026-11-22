(function (root) {
  const options = { timeZone: 'America/Chicago' };
  const dayFormat = new Intl.DateTimeFormat('en-CA', {
    ...options, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const visitFormat = new Intl.DateTimeFormat('en-US', {
    ...options, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  const kindLabels = {
    'private-athlete': 'Private athlete',
    parent: 'Parent access',
    'school-athlete': 'School athlete',
    'school-staff': 'School staff',
  };
  const feedbackLabels = {
    mandatory_week_start: 'Readiness',
    mandatory_week_end: 'Weekly review',
    athlete_weekly: 'Weekly check-in',
    parent_weekly: 'Parent check-in',
    athlete_biweekly: 'Biweekly check-in',
    coach_weekly: 'Coach check-in',
  };
  const key = (kind, id) => [kind, id].join(':');

  function weekStart(now) {
    const date = new Date(dayFormat.format(now) + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    return date.toISOString().slice(0, 10);
  }

  function feedbackSummary(rows, now = Date.now()) {
    const start = weekStart(now);
    const today = dayFormat.format(now);
    const recent = new Set();
    let latest;
    for (const row of rows) {
      if (!Object.hasOwn(feedbackLabels, row.feedback_type)) continue;
      const time = Date.parse(row.created_at);
      if (!Number.isFinite(time)) continue;
      if (!latest || time > latest.time) latest = { time, label: feedbackLabels[row.feedback_type] };
      const day = dayFormat.format(time);
      if (day >= start && day <= today) recent.add(feedbackLabels[row.feedback_type]);
    }
    if (recent.size) return Array.from(recent).sort().join(', ') + ' submitted this week';
    if (latest) return 'None this week · Last ' + latest.label.toLowerCase() + ' ' + visitFormat.format(latest.time);
    return 'No submission recorded';
  }

  const api = { key, kindLabels, visitFormat, feedbackSummary };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DuHubEngagement = api;
})(globalThis);
