import test from "node:test";
import assert from "node:assert/strict";
import { invitetationEmailTemplate } from "../src/lib/emailTemplates.js";

const tournament = {
  _id: "tournament-id",
  tournamentName: "Autumn Cup",
  location: "Home Golf Club",
};

const renderInvitation = (match, recipientEmail) =>
  invitetationEmailTemplate({
    tournament,
    match: {
      round: 1,
      date: "2026-09-17T00:00:00.000Z",
      ...match,
    },
    updateResultUrl: "https://golfko.co.uk/match/match-id?token=test-token",
    recipientEmail,
  });

test("Team invitation displays the opponent team name", () => {
  const html = renderInvitation(
    {
      matchType: "Team",
      player1Id: {
        fullName: "Captain One",
        email: "one@example.com",
        teamName: "Team Alpha",
      },
      player2Id: {
        fullName: "Captain Two",
        email: "two@example.com",
        teamName: "Team Bravo",
      },
    },
    "one@example.com"
  );

  assert.match(html, /is Team Bravo and you can view/);
  assert.doesNotMatch(html, /is Captain Two and you can view/);
});

test("Team invitation falls back to the opponent player name when team name is missing", () => {
  const html = renderInvitation(
    {
      matchType: "Team",
      player1Id: { fullName: "Captain One", email: "one@example.com" },
      player2Id: { fullName: "Captain Two", email: "two@example.com" },
    },
    "one@example.com"
  );

  assert.match(html, /is Captain Two and you can view/);
});

test("Single invitation continues to display the opponent player name", () => {
  const html = renderInvitation(
    {
      matchType: "Single",
      player1Id: {
        fullName: "Player One",
        email: "one@example.com",
        teamName: "Team Alpha",
      },
      player2Id: {
        fullName: "Player Two",
        email: "two@example.com",
        teamName: "Team Bravo",
      },
    },
    "one@example.com"
  );

  assert.match(html, /is Player Two and you can view/);
  assert.doesNotMatch(html, /is Team Bravo and you can view/);
});

test("Pairs invitation continues to display both opposing player names", () => {
  const html = renderInvitation(
    {
      matchType: "Pairs",
      pair1Id: {
        player1: { fullName: "Alpha One", email: "a1@example.com" },
        player2: { fullName: "Alpha Two", email: "a2@example.com" },
      },
      pair2Id: {
        player1: { fullName: "Bravo One", email: "b1@example.com" },
        player2: { fullName: "Bravo Two", email: "b2@example.com" },
      },
    },
    "a1@example.com"
  );

  assert.match(html, /is Bravo One & Bravo Two and you can view/);
});
