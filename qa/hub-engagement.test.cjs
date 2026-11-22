const test = require('node:test');
const assert = require('node:assert/strict');
const { feedbackSummary, key } = require('../hub-engagement.js');

test('weekly feedback uses Chicago Monday and reports the check-ins actually submitted', () => {
  const monday = Date.parse('2026-11-23T06:05:00Z');
  const sundayReview = { feedback_type: 'mandatory_week_end', created_at: '2026-11-23T05:59:00Z' };
  const mondayReadiness = { feedback_type: 'mandatory_week_start', created_at: '2026-11-23T06:01:00Z' };
  const mondayIssue = { feedback_type: 'athlete_issue', created_at: '2026-11-23T06:02:00Z' };
  assert.match(feedbackSummary([sundayReview, mondayIssue], monday), /^None this week · Last weekly review/);
  assert.equal(feedbackSummary([sundayReview, mondayIssue, mondayReadiness], monday), 'Readiness submitted this week');
  assert.equal(feedbackSummary([mondayIssue], monday), 'No submission recorded');
});

test('a parent visit and a private athlete visit have distinct keys for a shared profile', () => {
  assert.notEqual(key('parent', 'profile-1'), key('private-athlete', 'profile-1'));
});
