// Vercel serverless function — sends emails via Brevo
// The API key lives in Vercel Environment Variables, never in the code.

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const SENDER_NAME  = 'Zerocode';
const SENDER_EMAIL = 'andres@zerocode.la';
const NOTIFY_EMAIL = 'andres@zerocode.la';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const { userEmail, payload } = req.body;
  if (!userEmail || !payload) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Send both emails in parallel
    await Promise.all([
      brevoSend(apiKey, {
        to:      [{ email: userEmail, name: payload.firstName }],
        subject: 'Your operational bottleneck report — Zerocode',
        html:    buildUserEmail(payload),
      }),
      brevoSend(apiKey, {
        to:      [{ email: NOTIFY_EMAIL, name: 'Andres — Zerocode' }],
        subject: `New lead: ${payload.leadName || userEmail} — ${payload.monthlyTotal}`,
        html:    buildLeadEmail(payload),
      }),
    ]);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[send-email]', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

async function brevoSend(apiKey, { to, subject, html }) {
  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
      to,
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Brevo error: ${text}`);
  }

  return response;
}

function buildUserEmail(p) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f3f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
      <tr>
        <td style="background:#001B43;padding:28px 32px;">
          <p style="margin:0;color:#17DBFB;font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Zerocode — The Operational Fix</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 32px 8px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#001B43;line-height:1.3;">
            Hi ${p.firstName}, here's your bottleneck report
          </h1>
          <p style="margin:0;font-size:15px;color:#495057;line-height:1.6;">
            Based on the numbers you entered, here's what your operational bottleneck is costing you every month.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#303481;border-radius:10px;padding:20px;text-align:center;width:30%;">
                <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:rgba(255,255,255,0.75);">Monthly cost</p>
                <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${p.monthlyTotal}</p>
              </td>
              <td width="12"></td>
              <td style="background:#303481;border-radius:10px;padding:20px;text-align:center;width:30%;">
                <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:rgba(255,255,255,0.75);">Annual cost</p>
                <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${p.annualTotal}</p>
              </td>
              <td width="12"></td>
              <td style="background:#303481;border-radius:10px;padding:20px;text-align:center;width:30%;">
                <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:rgba(255,255,255,0.75);">Break-even</p>
                <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">${p.breakeven}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 24px;">
          <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#001B43;">Cost Breakdown</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            <tr><td style="padding:9px 0;color:#495057;">Revenue you can't capture</td><td style="padding:9px 0;text-align:right;font-weight:600;color:#212529;">${p.bdRevenue}/mo</td></tr>
            <tr><td style="padding:9px 0;color:#495057;">Manual work cost</td><td style="padding:9px 0;text-align:right;font-weight:600;color:#212529;">${p.bdLabor}/mo</td></tr>
            <tr><td style="padding:9px 0;color:#495057;">Platform fees</td><td style="padding:9px 0;text-align:right;font-weight:600;color:#212529;">${p.bdFees}/mo</td></tr>
            <tr><td style="padding:11px 0 0;font-weight:700;color:#001B43;font-size:15px;">Total</td><td style="padding:11px 0 0;text-align:right;font-weight:700;color:#001B43;font-size:15px;">${p.monthlyTotal}/mo</td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#001B43;border-radius:10px;padding:28px 24px;">
            <tr>
              <td>
                <h2 style="margin:0 0 10px;font-size:18px;font-weight:700;color:#ffffff;line-height:1.3;">Want to know exactly what it would take to fix this?</h2>
                <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.78);line-height:1.6;">Book a free 30-minute consultation. We map the exact bottleneck, validate your numbers, and tell you honestly whether we're the right fit to remove it.</p>
                <a href="https://calendly.com/andres-diaz-/discoverycall" style="display:inline-block;background:#17DBFB;color:#001B43;font-weight:700;font-size:15px;padding:13px 28px;border-radius:8px;text-decoration:none;">Book your free consultation →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;border-top:1px solid #e9ecef;text-align:center;">
          <p style="margin:0;font-size:12px;color:#adb5bd;">Zerocode · The Operational Fix<br/>You received this because you used our free Bottleneck Calculator.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildLeadEmail(p) {
  const submitted = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f3f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
      <tr>
        <td style="background:#17DBFB;padding:20px 28px;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#001B43;text-transform:uppercase;letter-spacing:0.8px;">New Lead — Bottleneck Calculator</p>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 28px 12px;">
          <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#001B43;">Contact Information</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            ${row('Name',      p.leadName     || '(not provided)')}
            ${row('Email',     `<a href="mailto:${p.leadEmail}" style="color:#303481;">${p.leadEmail}</a>`)}
            ${row('LinkedIn',  p.leadLinkedIn || '(not provided)')}
            ${row('Industry',  p.industry     || '—')}
            ${row('Situation', p.bottleneck   || '—')}
            ${row('Submitted', submitted)}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 28px 28px;">
          <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#001B43;">Their Numbers</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            ${row('Monthly total',       `<strong style="color:#303481;font-size:16px;">${p.monthlyTotal}/mo</strong>`)}
            ${row('Annual total',        `<strong>${p.annualTotal}/yr</strong>`)}
            ${row('Break-even',          p.breakeven)}
            ${row('Revenue missed',      p.bdRevenue + '/mo')}
            ${row('Manual work cost',    p.bdLabor   + '/mo')}
            ${row('Platform fees',       p.bdFees    + '/mo')}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 28px;">
          <a href="mailto:${p.leadEmail}?subject=Re: Your Zerocode bottleneck report" style="display:inline-block;background:#303481;color:#ffffff;font-weight:700;font-size:14px;padding:11px 22px;border-radius:8px;text-decoration:none;margin-right:10px;">Reply to lead</a>
          <a href="https://calendly.com/andres-diaz-/discoverycall" style="display:inline-block;background:#001B43;color:#ffffff;font-weight:700;font-size:14px;padding:11px 22px;border-radius:8px;text-decoration:none;">Open Calendly</a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function row(label, value) {
  return `<tr>
    <td style="padding:8px 0;color:#6c757d;width:38%;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:#212529;font-weight:600;">${value}</td>
  </tr>`;
}
