import Tournament from "./tournament.model.js";
import KnockoutStage from "../others/knockoutSchema.model.js";
import Round from "../round/round.model.js";
import Match from "../match/match.model.js";
import TournamentReminder from "./tournamentReminder.model.js";
import sendEmail from "../../lib/sendEmail.js";
import { logger } from "../../utils/logger.js";
import {
  collectMatchReminderRecipients,
  getReminderTimeZone,
  isReminderDue,
} from "./tournamentReminder.helpers.js";
import { tournamentReminderEmailTemplate } from "./tournamentReminder.template.js";

const STALE_CLAIM_MINUTES = 30;
let reminderIndexesReady;

export async function runTournamentReminderJob({ now = new Date(), force = false } = {}) {
  await ensureReminderIndexes();

  const timeZone = getReminderTimeZone();
  const tournaments = await Tournament.find({
    status: "in progress",
    onHold: { $ne: true },
    rememberEmail: { $gt: 0 },
  }).select("tournamentName rememberEmail status onHold");

  const summary = {
    checkedTournaments: tournaments.length,
    dueTournaments: 0,
    checkedMatches: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const tournament of tournaments) {
    try {
      const tournamentSummary = await processTournamentReminder({
        tournament,
        now,
        timeZone,
        force,
      });

      summary.dueTournaments += tournamentSummary.due ? 1 : 0;
      summary.checkedMatches += tournamentSummary.checkedMatches;
      summary.sent += tournamentSummary.sent;
      summary.skipped += tournamentSummary.skipped;
      summary.failed += tournamentSummary.failed;
    } catch (error) {
      summary.failed++;
      logger.error(
        `Tournament reminder failed for tournament ${tournament._id}: ${error.message}`
      );
    }
  }

  return summary;
}

async function processTournamentReminder({ tournament, now, timeZone, force }) {
  const summary = {
    due: false,
    checkedMatches: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  const knockoutStage = await KnockoutStage.findOne({
    tournamentId: tournament._id,
    isActive: true,
    onHold: { $ne: true },
  }).select("currentRound isActive onHold");

  if (!knockoutStage) return summary;

  const currentRound = await Round.findOne({
    tournamentId: tournament._id,
    roundNumber: knockoutStage.currentRound,
  }).select("roundName roundNumber date");

  if (
    !currentRound ||
    (!force && !isReminderDue({
      deadline: currentRound.date,
      reminderDays: tournament.rememberEmail,
      now,
      timeZone,
    }))
  ) {
    return summary;
  }

  summary.due = true;

  const matches = await Match.find({
    tournamentId: tournament._id,
    round: knockoutStage.currentRound,
    status: { $ne: "completed" },
  })
    .populate("player1Id", "fullName email")
    .populate("player2Id", "fullName email")
    .populate({
      path: "pair1Id",
      select: "teamName player1 player2",
      populate: { path: "player1 player2", select: "fullName email" },
    })
    .populate({
      path: "pair2Id",
      select: "teamName player1 player2",
      populate: { path: "player1 player2", select: "fullName email" },
    })
    .sort({ matchNumber: 1 });

  summary.checkedMatches = matches.length;

  for (const match of matches) {
    const recipients = collectMatchReminderRecipients(match);

    for (const recipient of recipients) {
      const delivery = await claimReminderDelivery({
        tournamentId: tournament._id,
        matchId: match._id,
        roundNumber: knockoutStage.currentRound,
        recipientEmail: recipient.email,
        now: new Date(),
      });

      if (!delivery) {
        summary.skipped++;
        continue;
      }

      try {
        await sendEmail({
          to: recipient.email,
          subject: `Match Reminder: ${tournament.tournamentName} - ${
            currentRound.roundName || `Round ${currentRound.roundNumber}`
          }`,
          html: tournamentReminderEmailTemplate({
            playerName: recipient.playerName,
            opponentName: recipient.opponentName,
            tournamentName: tournament.tournamentName,
            tournamentId: tournament._id,
            roundName: currentRound.roundName,
            roundNumber: currentRound.roundNumber,
            deadline: currentRound.date,
            timeZone,
          }),
        });

        await TournamentReminder.updateOne(
          { _id: delivery._id, status: "processing" },
          {
            $set: { status: "sent", sentAt: new Date(), lastError: null },
            $unset: { failedAt: 1 },
          }
        );
        summary.sent++;
      } catch (error) {
        await TournamentReminder.updateOne(
          { _id: delivery._id },
          {
            $set: {
              status: "failed",
              failedAt: new Date(),
              lastError: String(error.message || error).slice(0, 1000),
            },
          }
        );
        summary.failed++;
        logger.error(
          `Tournament reminder email failed for match ${match._id}: ${error.message}`
        );
      }
    }
  }

  return summary;
}

async function claimReminderDelivery({
  tournamentId,
  matchId,
  roundNumber,
  recipientEmail,
  now,
}) {
  const staleBefore = new Date(
    now.getTime() - STALE_CLAIM_MINUTES * 60 * 1000
  );

  try {
    return await TournamentReminder.findOneAndUpdate(
      {
        tournamentId,
        roundNumber,
        recipientEmail,
        $or: [
          { status: "failed" },
          { status: "processing", claimedAt: { $lte: staleBefore } },
          { status: { $exists: false } },
        ],
      },
      {
        $set: {
          matchId,
          status: "processing",
          claimedAt: now,
          lastError: null,
        },
        $inc: { attempts: 1 },
        $unset: { failedAt: 1 },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    // A unique-key collision means this recipient was already claimed or sent
    // by this process or another live server instance.
    if (error?.code === 11000) return null;
    throw error;
  }
}

function ensureReminderIndexes() {
  if (!reminderIndexesReady) {
    reminderIndexesReady = TournamentReminder.init();
  }
  return reminderIndexesReady;
}
