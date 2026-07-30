import test from "node:test";
import assert from "node:assert/strict";
import {
  collectMatchReminderRecipients,
  getNextDailyRun,
  isReminderDue,
  subtractCalendarDays,
} from "../src/modules/tournament/tournamentReminder.helpers.js";

test("subtractCalendarDays handles month boundaries", () => {
  assert.equal(subtractCalendarDays("2026-03-05", 10), "2026-02-23");
});

test("reminder is due from its configured date through the deadline", () => {
  const input = {
    deadline: new Date("2026-08-23T12:00:00.000Z"),
    reminderDays: 10,
    timeZone: "Europe/London",
  };

  assert.equal(
    isReminderDue({ ...input, now: new Date("2026-08-12T12:00:00.000Z") }),
    false
  );
  assert.equal(
    isReminderDue({ ...input, now: new Date("2026-08-13T12:00:00.000Z") }),
    true
  );
  assert.equal(
    isReminderDue({ ...input, now: new Date("2026-08-23T12:00:00.000Z") }),
    true
  );
  assert.equal(
    isReminderDue({ ...input, now: new Date("2026-08-24T12:00:00.000Z") }),
    false
  );
});

test("zero rememberEmail value keeps reminders disabled", () => {
  assert.equal(
    isReminderDue({
      deadline: new Date("2026-08-23T12:00:00.000Z"),
      reminderDays: 0,
      now: new Date("2026-08-23T12:00:00.000Z"),
      timeZone: "Europe/London",
    }),
    false
  );
});

test("daily scheduler targets 08:00 UTC globally", () => {
  assert.equal(
    getNextDailyRun({
      now: new Date("2026-07-30T06:00:00.000Z"),
      timeZone: "UTC",
      hour: 8,
      minute: 0,
    }).toISOString(),
    "2026-07-30T08:00:00.000Z"
  );

  assert.equal(
    getNextDailyRun({
      now: new Date("2026-01-30T06:00:00.000Z"),
      timeZone: "UTC",
      hour: 8,
      minute: 0,
    }).toISOString(),
    "2026-01-30T08:00:00.000Z"
  );
});

test("daily scheduler moves to tomorrow after today's run time", () => {
  assert.equal(
    getNextDailyRun({
      now: new Date("2026-07-30T08:00:00.000Z"),
      timeZone: "UTC",
      hour: 8,
      minute: 0,
    }).toISOString(),
    "2026-07-31T08:00:00.000Z"
  );
});

test("Single and Team recipients use the existing player slots", () => {
  for (const matchType of ["Single", "Team"]) {
    const recipients = collectMatchReminderRecipients({
      matchType,
      player1Id: { fullName: "Player One", email: "ONE@example.com" },
      player2Id: { fullName: "Player Two", email: "two@example.com" },
    });

    assert.deepEqual(recipients, [
      {
        email: "one@example.com",
        playerName: "Player One",
        opponentName: "Player Two",
      },
      {
        email: "two@example.com",
        playerName: "Player Two",
        opponentName: "Player One",
      },
    ]);
  }
});

test("Pairs reminders include all four players and the opposing pair", () => {
  const recipients = collectMatchReminderRecipients({
    matchType: "Pairs",
    pair1Id: {
      teamName: "Alpha",
      player1: { fullName: "A One", email: "a1@example.com" },
      player2: { fullName: "A Two", email: "a2@example.com" },
    },
    pair2Id: {
      teamName: "Beta",
      player1: { fullName: "B One", email: "b1@example.com" },
      player2: { fullName: "B Two", email: "b2@example.com" },
    },
  });

  assert.equal(recipients.length, 4);
  assert.equal(recipients[0].opponentName, "Beta");
  assert.equal(recipients[2].opponentName, "Alpha");
});
