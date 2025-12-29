// ✅ ESM
export const verificationCodeTemplate = (code) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; background-color: #f9f9f9;">
    <h1 style="color: #333; text-align: center;">Verification Code</h1>
    <p style="font-size: 16px; color: #555;">Hello,</p>
    <p style="font-size: 16px; color: #555;">Thank you for using our services. Your verification code is:</p>
    <p style="font-size: 24px; font-weight: bold; text-align: center; color: #007BFF;">${code}</p>
    <p style="font-size: 16px; color: #555;">Please enter this code within 5 minutes to verify your account.</p>
    <p style="font-size: 16px; color: #555;">If you did not request this code, please ignore this email.</p>
    <footer style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 20px; text-align: center; font-size: 12px; color: #aaa;">
      &copy; 2023 Your Company Name. All rights reserved.
    </footer>
  </div>
`;



export const getPaymentSuccessTemplate = ({ name, eventId, slots }) => {
  const slotDetails = slots
    .map(
      (slot, index) =>
        `<li><strong>Slot ${index + 1}:</strong> ${slot.date} from ${slot.startTime} to ${slot.endTime}</li>`
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>✅ Booking Confirmed</h2>
      <p>Dear ${name},</p>
      <p>Your payment has been successfully received and your booking has been confirmed.</p>
      <p><strong>Event ID:</strong> ${eventId}</p>
      <p><strong>Slot(s) Booked:</strong></p>
      <ul>
        ${slotDetails}
      </ul>
      <br />
      <p>Thank you for choosing our service.</p>
      <p>We look forward to seeing you at the event.</p>
      <br />
    
      
    </div>
  `;
};

export const getContractResponseTemplate = ({ fullName, email, occupation, message, responseMessage }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media only screen and (max-width: 600px) {
          .container {
            width: 100% !important;
            border-radius: 0 !important;
          }
          .content {
            padding: 30px 20px !important;
          }
          .header {
            padding: 30px 20px !important;
          }
          h1 {
            font-size: 24px !important;
          }
          .icon-circle {
            width: 60px !important;
            height: 60px !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      
      <table role="presentation" style="width: 100%; border-collapse: collapse; padding: 20px 10px;">
        <tr>
          <td align="center">
            
            <!-- Main Container -->
            <table role="presentation" class="container" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              
              <!-- Header -->
              <tr>
                <td class="header" style="background-color: #111827; padding: 40px 30px; text-align: center;">
                  <div class="icon-circle" style="background-color: #ffffff; width: 70px; height: 70px; border-radius: 50%; margin: 0 auto 20px; display: inline-flex; align-items: center; justify-content: center;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="#111827" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Message Received</h1>
                </td>
              </tr>
              
              <!-- Content Section -->
              <tr>
                <td class="content" style="padding: 40px 30px;">
                  
                  <!-- Greeting -->
                  <p style="margin: 0 0 24px; font-size: 16px; color: #374151; line-height: 1.6;">
                    Hi <strong style="color: #111827;">${fullName}</strong>,
                  </p>
                  
                  <!-- Response Message -->
                  <div style="background-color: #f9fafb; border-left: 3px solid #111827; padding: 16px 20px; margin: 0 0 32px;">
                    <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.7;">
                      ${responseMessage}
                    </p>
                  </div>
                  
                  <!-- Details -->
                  <div style="margin: 0 0 32px;">
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Your Details</h2>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Email</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-size: 14px;">${email}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Occupation</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-size: 14px;">${occupation}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Message</td>
                        <td style="padding: 10px 0; text-align: right; color: #111827; font-size: 14px;">${message}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <!-- Footer -->
                  <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6; text-align: center;">
                    Thank you for reaching out. We'll be in touch soon.
                  </p>
                  
                </td>
              </tr>
              
              <!-- Bottom Border -->
              <tr>
                <td style="background-color: #111827; height: 4px;"></td>
              </tr>
              
            </table>
            
          </td>
        </tr>
      </table>
      
    </body>
    </html>
  `;
};
// auto refunded template

export const getConflictAfterPaymentTemplate = ({
  name,
  email,
  phone,
  eventId,
  eventTitle,
  selectedDate,
  selectedSlots = [],
  sessionId,
  paymentIntentId,
  refundAmount,
}) => {
  const slotDetails = selectedSlots
    .map(
      (slot, index) =>
        `<li><strong>Slot ${index + 1}:</strong> ${slot.date} from ${slot.startTime} to ${slot.endTime}</li>`
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>⚠️ Booking Conflict Detected After Payment</h2>

      <p><strong>Customer Details:</strong></p>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Phone:</strong> ${phone}</li>
      </ul>

      <p><strong>Event Details:</strong></p>
      <ul>
        <li><strong>Event ID:</strong> ${eventId}</li>
        <li><strong>Event Title:</strong> ${eventTitle || 'N/A'}</li>
        <li><strong>Date:</strong> ${selectedDate}</li>
      </ul>

      <p><strong>Attempted Slot(s):</strong></p>
      <ul>
        ${slotDetails}
      </ul>

      <p><strong>Stripe Info:</strong></p>
      <ul>
        <li><strong>Session ID:</strong> ${sessionId}</li>
        <li><strong>Payment Intent ID:</strong> ${paymentIntentId}</li>
        ${
          refundAmount
            ? `<li><strong>Refund Amount:</strong> $${(refundAmount / 100).toFixed(2)}</li>`
            : ''
        }
        <li><strong>Refund Status:</strong> Refund automatically processed</li>
      </ul>

      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>

      <br />
      <p style="color: red;">
        ⚠️ Some of the selected slots were already booked by the time payment completed.<br/>
        The booking was not created, and the payment has been refunded.
      </p>
    </div>
  `;
};

export const getPaymentSuccessForAdminTemplate = ({ name, email, phone, eventId, slots }) => {
  const slotDetails = slots
    .map(
      (slot, index) =>
        `<li><strong>Slot ${index + 1}:</strong> ${slot.date} from ${slot.startTime} to ${slot.endTime}</li>`
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>📥 New Booking Received</h2>
      <p><strong>User Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Event ID:</strong> ${eventId}</p>
      <p><strong>Slot(s) Booked:</strong></p>
      <ul>
        ${slotDetails}
      </ul>
      <br />
      <p>This booking has been paid and confirmed via Stripe.</p>
      <p>Please make necessary arrangements for the event.</p>
    </div>
  `;
};

export const welcomeEmailTemplate = ({ user, verifyToken }) => {
  const setPasswordUrl = `${process.env.FRONTEND_URL}/set-password?token=${verifyToken}`;
  const accountUrl = `${process.env.FRONTEND_URL}/login`;
  const logoUrl = `${process.env.LOGO || ""}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title style="text-align:center">Welcome to GolfKO</title>
</head>

<body style="margin:0; padding:0; background-color:#f5f5f5; font-family: Arial, Helvetica, sans-serif; color:#333;">
  
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; padding:40px;">
          
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:30px; align-items: center;">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" alt="GolfKO Logo" style="max-width:150px; height:auto; align-items: center;" />`
                  : `<strong>GolfKO</strong>`
              }
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="font-size:16px; padding-bottom:20px;">
              Hi ${user.fullName || "Player"},
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="font-size:16px; padding-bottom:15px;">
              Thanks for creating an account on GolfKO. Here’s a copy of your user details.
            </td>
          </tr>

          <!-- Username -->
          <tr>
            <td style="font-size:16px; padding-bottom:25px;">
              <strong>Username:</strong> ${user.fullName || "Player"}
            </td>
          </tr>

          <!-- Set Password -->
          <tr>
            <td style="padding-bottom:25px;">
              <a href="${setPasswordUrl}" style="color:#0066cc; text-decoration:underline; font-size:16px;">
                Set your new password.
              </a>
            </td>
          </tr>

          <!-- Account Info -->
          <tr>
            <td style="font-size:16px; padding-bottom:15px;">
              You can access your account area to view tournaments, update match results,
              change your password, and more via the link below:
            </td>
          </tr>

          <!-- My Account -->
          <tr>
            <td style="padding-bottom:30px;">
              <a href="${accountUrl}" style="color:#0066cc; text-decoration:underline; font-size:16px;">
                My account
              </a>
            </td>
          </tr>

          <!-- Closing -->
          <tr>
            <td style="font-size:16px;">
              We look forward to seeing you soon.
            </td>
          </tr>

          <tr>
            <td style="padding-top:20px; font-size:16px; font-weight:bold;">
              GolfKO Team
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;
};


export const invitetationEmailTemplate = ({tournament, match, updateResultUrl, user}) =>{
  
  const tournamentUrl = `${process.env.FRONTEND_URL}/tournament/${tournament._id}`;
  const dashboardUrl = `${process.env.FRONTEND_URL}`;
  const contactUrl = `${process.env.FRONTEND_URL}/contact`;
  const logoUrl = `${process.env.LOGO || ""}`;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .subject-line {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 30px;
            color: #000000;
        }

        .logo {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 40px;
            color: #333333;
        }

        .content {
            line-height: 1.6;
            color: #333333;
            font-size: 14px;
        }

        .content p {
            margin-bottom: 15px;
        }

        .content a {
            color: #4a90e2;
            text-decoration: none;
        }

        .content a:hover {
            text-decoration: underline;
        }

        .section-title {
            font-weight: bold;
            margin-top: 20px;
            margin-bottom: 5px;
            color: #000000;
        }

        .highlight {
            background-color: #fff9e6;
            padding: 2px 4px;
            border-radius: 3px;
        }

        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
        }

        .contact-info {
            color: #666666;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Subject Line -->
        <div class="subject-line">
            Subject: ${tournament.tournamentName} UK Men's Pairs Opponent
        </div>

        <tr>
            <td style="padding-bottom:30px; align-items: center;">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" alt="GolfKO Logo" style="max-width:150px; height:auto; align-items: center;" />`
                  : `<strong>GolfKO</strong>`
              }
            </td>
        </tr>

        <!-- Main Content -->
        <div class="content">
            <p>
                Hi. Your opponent in ${match.round} of the UK Men's Pairs Knockout is <strong>${tournament.tournamentName}</strong> and 
                you can view the full draw at 
                <a href="${tournamentUrl}" target="_blank">${tournamentUrl}</a>
            </p>

            <p>
                Your match is due to be played at ${tournament.location}
            </p>

            <p>
                Please contact your opponent and arrange for the match to be played before the 
                deadline of <strong>${match.date}</strong>. When you have arranged your match please enter the 
                date in the draw on Golfko website to avoid reminders.
            </p>

            <p class="section-title">Register As A Player</p>
            <p>
                If you register as a player you can view your opponent's details, enter the date of 
                your match and submit the result of your match. To register click this link here. 
                <a href="${dashboardUrl}" target="_blank">${dashboardUrl}</a>
            </p>

            <p>
                If your opponent is also a registered player then you can view their contact details 
                by logging into the Golfko site and clicking your opponent's profile.
            </p>

            <p>
                When you have played your match, please enter the result on the GolfKO as soon 
                as possible.
            </p>

            <p>
                <a href="${updateResultUrl}" target="_blank">${updateResultUrl}</a>
            </p>

            <p>
                For any questions please contact your event organiser.
            </p>

            <p>
                Thank you and good luck!
            </p>

            <!-- Footer -->
            <div class="footer">
                <p class="contact-info">
                    GolfKO – <a href="mailto:info@golfko.co.uk">info@golfko.co.uk</a>
                </p>
                <p class="contact-info">
                   Contact Us: <a href="${contactUrl}" target="_blank">${contactUrl}</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

export const matchResultUpdateTemplate = ({ 
  matchDetails
}) => {
  const logoUrl = `${process.env.LOGO || ""}`;
  const websiteUrl = `${process.env.WEBSITE_URL || "http://www.golfko.co.uk"}`;
  const matchReportUrl = `${process.env.FRONTEND_URL}/event/match`;

  console.log(logoUrl);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
</head>

<body style="margin:0; padding:0; background-color:#f5f5f5; font-family: Arial, Helvetica, sans-serif; color:#333;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">

          <!-- Horizontal Line -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px; background-color:#e0e0e0; margin:20px 0;"></div>
            </td>
          </tr>

          <!-- Logo -->
         <tr>
          <td style="padding:20px 40px 30px 40px; align-items: center;">
            ${
              logoUrl
                ? `<img src="${logoUrl}" alt="Golfko logo" style="max-width:120px; height:auto; display:block; align-items: center;" />`
                : `<span style="font-size:14px; color:#666;">Golfko logo</span>`
            }
          </td>
        </tr>


          <!-- Horizontal Line -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:3px; background-color:#d0d0d0; margin:20px 0;"></div>
            </td>
          </tr>

          <!-- Match Details -->
          <tr>
            <td style="padding:20px 40px; font-size:15px; line-height:1.6;">
              <p style="margin:0 0 5px 0; font-weight:bold; color:#333;">
                ${matchDetails.eventName} - Round ${matchDetails.matchRound}
              </p>
              <p style="margin:0 0 20px 0; color:#333;">
                ${matchDetails.location} ${matchDetails.date} at ${matchDetails.location}
              </p>
              
              <p style="margin:0 0 15px 0; color:#333;">
                Thank you for submitting the result of the match between ${matchDetails.player1} and ${matchDetails.player2}
              </p>
              
              <p style="margin:0 0 5px 0; color:#333;">
                <strong>Winner:</strong> <span style="text-decoration:underline;">${matchDetails.winner}</span>
              </p>
              <p style="margin:0 0 20px 0; color:#333;">
                <strong>Score:</strong> ${matchDetails.player1Score} - ${matchDetails.player2Score}
              </p>
              
              <p style="margin:0 0 10px 0; color:#333;">
                You can view the Match Play Moments report for this match here
              </p>
              <p style="margin:0 0 25px 0;">
                <a href="${matchReportUrl}" style="color:#0066cc; text-decoration:underline; font-size:15px;">
                  ${matchReportUrl}
                </a>
              </p>
              
              <p style="margin:0 0 10px 0; color:#333;">
                For any queries please contact your event organiser.
              </p>
              
              <p style="margin:0 0 5px 0; color:#333;">
                Golfko – info@golfko.co.uk
              </p>
              <p style="margin:0;">
                <a href="${websiteUrl}" style="color:#0066cc; text-decoration:underline; font-size:15px;">
                  ${websiteUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Bottom Spacing -->
          <tr>
            <td style="padding:0 0 40px 0;"></td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;
};

export const eventStartInvitationTemplate = ({ 
  eventName,
  eventDrawUrl,
  dashboardUrl,
  contactUrl,
  createEventUrl 
}) => {
  const logoUrl = `${process.env.LOGO || ""}`;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>You're Playing In A Golfko Event</title>
</head>

<body style="margin:0; padding:0; background-color:#f5f5f5; font-family: Arial, Helvetica, sans-serif; color:#333;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
          
          <!-- Subject Header -->
          <tr>
            <td style="padding:30px 40px 20px 40px; font-size:18px; font-weight:bold; color:#333;">
              Subject: You're Playing In A Golfko Event – ${eventName}
            </td>
          </tr>

          <!-- Horizontal Line -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px; background-color:#e0e0e0; margin:20px 0;"></div>
            </td>
          </tr>

          <!-- Logo -->
          <tr>
            <td style="padding:20px 40px 30px 40px;">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" alt="Golfko Logo" style="max-width:120px; height:auto;" />`
                  : `<span style="font-size:14px; color:#666;">Golfko Logo</span>`
              }
            </td>
          </tr>

          <!-- Horizontal Line -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:3px; background-color:#d0d0d0; margin:20px 0;"></div>
            </td>
          </tr>

          <!-- Event Details -->
          <tr>
            <td style="padding:20px 40px; font-size:15px; line-height:1.6;">
              <p style="margin:0 0 20px 0; color:#333;">
                You have been added to the ${eventName} event on Golfko!
              </p>
              
              <p style="margin:0 0 5px 0; color:#333;">
                You can see the draw here;
              </p>
              <p style="margin:0 0 25px 0;">
                <a href="${eventDrawUrl}" style="color:#0066cc; text-decoration:underline; font-size:15px;">
                  ${eventDrawUrl}
                </a>
              </p>
              
              <p style="margin:0 0 5px 0; color:#333;">
                Please sign in with your account by clicking on the link below;
              </p>
              <p style="margin:0 0 25px 0;">
                <a href="${dashboardUrl}" style="color:#0066cc; text-decoration:underline; font-size:15px;">
                  ${dashboardUrl}
                </a>
              </p>
              
              <p style="margin:0 0 5px 0; color:#333;">
                For more information or if you need to contact us
              </p>
              <p style="margin:0 0 25px 0;">
                <a href="${contactUrl}" style="color:#0066cc; text-decoration:underline; font-size:15px;">
                  ${contactUrl}
                </a>
              </p>
              
              <p style="margin:0 0 5px 0; color:#333;">
                Create your own event at Golfko
              </p>
              <p style="margin:0;">
                <a href="${createEventUrl}" style="color:#0066cc; text-decoration:underline; font-size:15px;">
                  ${createEventUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Bottom Spacing -->
          <tr>
            <td style="padding:0 0 40px 0;"></td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;
};
