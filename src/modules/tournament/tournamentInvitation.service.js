import crypto from "crypto";
import Match from "../match/match.model.js";
import sendEmail from "../../lib/sendEmail.js";
import { invitetationEmailTemplate } from "../../lib/emailTemplates.js";

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function collectRecipientEmails(match) {
  const recipients = new Set();

  match.player1Id?.email && recipients.add(match.player1Id.email);
  match.player2Id?.email && recipients.add(match.player2Id.email);
  match.pair1Id?.player1?.email && recipients.add(match.pair1Id.player1.email);
  match.pair1Id?.player2?.email && recipients.add(match.pair1Id.player2.email);
  match.pair2Id?.player1?.email && recipients.add(match.pair2Id.player1.email);
  match.pair2Id?.player2?.email && recipients.add(match.pair2Id.player2.email);

  return [...recipients];
}

async function getMatchesForInvitation(matchIds) {
  return Match.find({ _id: { $in: matchIds } })
    .populate("player1Id", "fullName email")
    .populate("player2Id", "fullName email")
    .populate("roundId", "roundName roundNumber date")
    .populate({
      path: "pair1Id",
      populate: { path: "player1 player2", select: "fullName email" },
    })
    .populate({
      path: "pair2Id",
      populate: { path: "player1 player2", select: "fullName email" },
    })
    .sort({ round: 1, matchNumber: 1 });
}

export async function sendMatchInvitationEmails({ tournament, matchIds }) {
  const frontendUrl = process.env.FRONTEND_URL;
  const matches = await getMatchesForInvitation(matchIds);
  let emailCount = 0;

  for (const match of matches) {
    const verifyToken = generateToken();
    const updateResultUrl = `${frontendUrl}/match/${match._id}?token=${verifyToken}`;

    match.verifyToken = verifyToken;
    await match.save();

    const recipients = collectRecipientEmails(match);

    for (const email of recipients) {
      await sendEmail({
        to: email,
        subject: `Update Match Results: ${tournament.tournamentName}`,
        html: invitetationEmailTemplate({
          tournament,
          match,
          updateResultUrl,
          recipientEmail: email,
        }),
      });
      emailCount++;
    }
  }

  return {
    totalMatches: matches.length,
    totalEmails: emailCount,
  };
}
