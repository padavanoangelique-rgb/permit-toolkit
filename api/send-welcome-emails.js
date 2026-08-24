// Sends a one-time welcome email to any Permit Toolkit lead that hasn't
// received one yet. Triggered on a schedule (see project docs) with a
// shared-secret header — not intended to be called by the browser.
//
// Env vars required on this Vercel project:
//   SUPABASE_URL               - PermitAIO-v2 project URL
//   SUPABASE_SERVICE_ROLE_KEY  - service role key for that project
//   RESEND_API_KEY             - shared Resend key (same one PermitAIO uses)
//   CRON_SECRET                - shared secret checked against x-cron-secret header

const BATCH_LIMIT = 25;
const FROM = 'Permit Toolkit <hello@permitaio.com>';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function welcomeEmailHtml() {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#28251D;">
    <p style="font-size:18px;font-weight:600;margin:0 0 16px;">Thanks for grabbing the Permit Toolkit tools.</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      All 9 calculators are unlocked on <a href="https://permittoolkit.com" style="color:#01696F;">permittoolkit.com</a> —
      bookmark it and use it in the field any time. No login needed.
    </p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      Quick tip: the <a href="https://permittoolkit.com/noa-lookup.html" style="color:#01696F;">NOA / FL Product Approval Lookup</a>
      and <a href="https://permittoolkit.com/design-pressure-calculator.html" style="color:#01696F;">Design Pressure Estimator</a>
      are the two most-used tools for window and door jobs — worth trying first.
    </p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      These calculators are built by the same team behind
      <a href="https://permitaio.com" style="color:#01696F;">PermitAIO</a> — software that connects your floor plans,
      county forms, NOAs, permit tracking, and HOA requirements under one Job number, so you're not juggling
      spreadsheets and folders for every job.
    </p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
      We'll send the occasional email when we add a new tool or a code update — nothing more.
    </p>
    <a href="https://permitaio.com" style="display:inline-block;background:#01696F;color:#fff;text-decoration:none;
      padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;">See PermitAIO →</a>
    <p style="font-size:12px;color:#7A7974;margin-top:32px;">
      You're receiving this because you unlocked the tools at permittoolkit.com. Reply to unsubscribe.
    </p>
  </div>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const secret = req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_KEY) {
    return res.status(500).json({ ok: false, error: 'missing_env' });
  }

  try {
    const listResp = await fetch(
      `${SUPABASE_URL}/rest/v1/permit_toolkit_leads?welcome_sent_at=is.null&select=id,email&order=created_at.asc&limit=${BATCH_LIMIT}`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      }
    );

    if (!listResp.ok) {
      const t = await listResp.text();
      return res.status(502).json({ ok: false, error: 'supabase_list_failed', detail: t.slice(0, 300) });
    }

    const leads = await listResp.json();
    let sent = 0;
    const errors = [];

    for (const lead of leads) {
      try {
        const emailResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM,
            to: lead.email,
            subject: 'Your Permit Toolkit tools are unlocked',
            html: welcomeEmailHtml(),
          }),
        });

        if (!emailResp.ok) {
          const t = await emailResp.text();
          errors.push({ email: lead.email, error: t.slice(0, 200) });
          continue;
        }

        const updateResp = await fetch(
          `${SUPABASE_URL}/rest/v1/permit_toolkit_leads?id=eq.${lead.id}`,
          {
            method: 'PATCH',
            headers: {
              apikey: SERVICE_KEY,
              Authorization: `Bearer ${SERVICE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({ welcome_sent_at: new Date().toISOString() }),
          }
        );

        if (updateResp.ok) sent++;
        else errors.push({ email: lead.email, error: 'mark_sent_failed' });
      } catch (e) {
        errors.push({ email: lead.email, error: String(e).slice(0, 200) });
      }
    }

    return res.status(200).json({ ok: true, checked: leads.length, sent, errors });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e).slice(0, 300) });
  }
};
