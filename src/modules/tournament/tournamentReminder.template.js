function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDeadline(value, timeZone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "the round deadline";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function tournamentReminderEmailTemplate({
  playerName,
  opponentName,
  tournamentName,
  tournamentId,
  roundName,
  roundNumber,
  deadline,
  timeZone,
}) {
  const frontendUrl = (process.env.FRONTEND_URL || "https://golfko.co.uk").replace(/\/$/, "");
  const drawUrl = `${frontendUrl}/event/${tournamentId}/`;
  const contactUrl = `${frontendUrl}/contact`;
  const supportEmail = process.env.SUPPORT_EMAIL || "info@golfko.co.uk";
  const displayRound = roundName || `Round ${roundNumber}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GolfKO match reminder</title>
</head>
<body style="margin:0; padding:20px; background:#f5f5f5; font-family:Arial,Helvetica,sans-serif; color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; width:100%; background:#fff;">
          <tr>
            <td style="padding:32px 40px; font-size:15px; line-height:1.6;">
              <p style="margin:0 0 18px;">Hi ${escapeHtml(playerName)},</p>
              <p style="margin:0 0 18px;">
                This is a reminder that ${escapeHtml(displayRound)} of
                <strong>${escapeHtml(tournamentName)}</strong> is currently being played.
              </p>
              <p style="margin:0 0 18px;">
                Your opponent is <strong>${escapeHtml(opponentName)}</strong>, and your match must be completed by
                <strong>${escapeHtml(formatDeadline(deadline, timeZone))}</strong>.
              </p>
              <p style="margin:0 0 18px;">
                Please contact your opponent and arrange your match. If you need to change the match date,
                contact your opponent and the GolfKO support team.
              </p>
              <p style="margin:0 0 18px;">
                View the tournament draw:<br />
                <a href="${escapeHtml(drawUrl)}" style="color:#0066cc;">${escapeHtml(drawUrl)}</a>
              </p>
              <p style="margin:0 0 18px;">
                Need help? Email
                <a href="mailto:${escapeHtml(supportEmail)}" style="color:#0066cc;">${escapeHtml(supportEmail)}</a>
                or <a href="${escapeHtml(contactUrl)}" style="color:#0066cc;">contact the support team</a>.
              </p>
              <p style="margin:0;">Thank you and good luck!</p>
              <p style="margin:18px 0 0; font-weight:bold;">GolfKO Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
