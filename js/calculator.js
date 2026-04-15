/* ═══════════════════════════════════════════════════════
   Zerocode — Operational Bottleneck Calculator
   calculator.js  |  Pure JS, no frameworks, no CDN
═══════════════════════════════════════════════════════ */

'use strict';

// Emails are sent via /api/send-email (Vercel serverless function).
// The Brevo API key lives in Vercel Environment Variables — never in this file.

// ── State ───────────────────────────────────────────────
const state = {
  currentScreen: 0,
  industry:      null,       // raw value from radio
  industryTerm:  'client',   // INDUSTRY_TERM
  bottleneckType: null,      // BOTTLENECK_TYPE
  // Screen 3 inputs
  inputA: 0, inputB: 0, inputC: 0, confidence3: 3,
  // Screen 4 inputs
  inputD: 0, inputE: 0, sliderF: 60, confidence4: 3,
  // Screen 5 inputs
  inputG: 0, sliderH: 70, confidence5: 3,
  // Lead
  leadName: '', leadEmail: '', leadLinkedIn: '',
  // Results
  monthlyRevenueMissed:    0,
  monthlyLaborRecoverable: 0,
  monthlyFeesRecoverable:  0,
  monthlyTotal:  0,
  annualTotal:   0,
};

const INDUSTRY_TERM_MAP = {
  fintech:     'client',
  realestate:  'investor',
  healthcare:  'patient',
  logistics:   'merchant',
  other:       'client',
};

// Total navigable steps (screens 1-7, so 7 steps)
const TOTAL_STEPS = 7;

// ── Init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNavButtons();
  setupRadioAutoHighlight();
  setupSliders();
  setupNumericInputs();
  setupEnterKey();
  updateProgressBar();
});

// ── Navigation Setup ────────────────────────────────────
function setupNavButtons() {
  // Wire all data-action="next" and data-action="back" buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'next')  advance();
    if (btn.dataset.action === 'back')  retreat();
  });

  // Special: Start button on screen 0
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.addEventListener('click', advance);

  // Special: Show Results button on screen 6
  const resultsBtn = document.getElementById('showResultsBtn');
  if (resultsBtn) resultsBtn.addEventListener('click', handleShowResults);

  // Share button
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) shareBtn.addEventListener('click', shareToLinkedIn);
}

// ── Radio Auto-Highlight ────────────────────────────────
function setupRadioAutoHighlight() {
  document.querySelectorAll('.option-card input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      // Remove selected from siblings in the same group
      const group = document.querySelectorAll(`input[name="${radio.name}"]`);
      group.forEach(r => r.closest('.option-card').classList.remove('selected'));
      radio.closest('.option-card').classList.add('selected');
    });
  });
}

// ── Enter Key Navigation ────────────────────────────────
function setupEnterKey() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.target.tagName === 'TEXTAREA') return;
    // Don't fire if focus is on a button (let the button handle it)
    if (e.target.tagName === 'BUTTON') return;

    const s = state.currentScreen;
    if (s === 6) { handleShowResults(); return; }
    if (s > 0 && s < 6) { advance(); }
  });
}

// ── Advance / Retreat ───────────────────────────────────
function advance() {
  const s = state.currentScreen;
  if (!validateScreen(s)) return;
  collectScreenData(s);
  if (s >= 6) return; // Screen 6 handled by handleShowResults
  goTo(s + 1);
}

function retreat() {
  if (state.currentScreen <= 0) return;
  goTo(state.currentScreen - 1);
}

function goTo(index) {
  const from = document.getElementById(`screen-${state.currentScreen}`);
  const to   = document.getElementById(`screen-${index}`);
  if (!to) return;

  if (from) from.classList.remove('active');
  to.classList.add('active');
  state.currentScreen = index;

  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });

  updateProgressBar();
  updateIndustryTerms();
  syncProgressBarVisibility();
}

// ── Progress Bar ────────────────────────────────────────
function updateProgressBar() {
  const s = state.currentScreen;
  const pct = s === 0 ? 0 : Math.round((s / TOTAL_STEPS) * 100);
  const bar  = document.getElementById('progressBar');
  const text = document.getElementById('progressText');
  if (bar)  { bar.style.width = `${pct}%`; bar.setAttribute('aria-valuenow', pct); }
  if (text) text.textContent = `${pct}%`;
}

function syncProgressBarVisibility() {
  const container = document.getElementById('progressContainer');
  if (!container) return;
  if (state.currentScreen === 0) {
    container.classList.add('hidden');
    document.querySelector('.app-container').style.paddingTop = '';
  } else {
    container.classList.remove('hidden');
    // Pad screen so content isn't hidden under the fixed bar
    document.querySelector('.app-container').style.paddingTop = '48px';
  }
}

// ── Validation ──────────────────────────────────────────
function validateScreen(s) {
  clearError(s);

  switch (s) {
    case 1: {
      const sel = document.querySelector('input[name="industry"]:checked');
      if (!sel) { setError(s, 'Please select your industry to continue.'); return false; }
      return true;
    }
    case 2: {
      const sel = document.querySelector('input[name="bottleneck"]:checked');
      if (!sel) { setError(s, 'Please select your situation to continue.'); return false; }
      return true;
    }
    case 3: {
      const b = parseNum(document.getElementById('inputB').value);
      const c = parseNum(document.getElementById('inputC').value);
      if (b === null || b < 0) { setError(s, `Please enter how many ${state.industryTerm}s you're unable to serve per month.`); return false; }
      if (c === null || c < 0) { setError(s, `Please enter the average revenue per ${state.industryTerm}.`); return false; }
      return true;
    }
    case 4: {
      const d = parseNum(document.getElementById('inputD').value);
      const e = parseNum(document.getElementById('inputE').value);
      if (d === null || d < 0) { setError(s, 'Please enter the hours per week spent on manual tasks.'); return false; }
      if (e === null || e < 0) { setError(s, 'Please enter the average hourly cost.'); return false; }
      return true;
    }
    case 5: {
      const g = parseNum(document.getElementById('inputG').value);
      if (g === null || g < 0) { setError(s, 'Please enter your monthly third-party platform costs (enter 0 if none).'); return false; }
      return true;
    }
    default: return true;
  }
}

function setError(screen, msg) {
  const el = document.getElementById(`error-${screen}`);
  if (el) el.textContent = msg;
}

function clearError(screen) {
  const el = document.getElementById(`error-${screen}`);
  if (el) el.textContent = '';
}

// ── Collect Screen Data ─────────────────────────────────
function collectScreenData(s) {
  switch (s) {
    case 1: {
      const sel = document.querySelector('input[name="industry"]:checked');
      if (sel) {
        state.industry     = sel.value;
        state.industryTerm = INDUSTRY_TERM_MAP[sel.value] || 'client';
      }
      break;
    }
    case 2: {
      const sel = document.querySelector('input[name="bottleneck"]:checked');
      if (sel) state.bottleneckType = sel.value;
      break;
    }
    case 3:
      state.inputA      = parseNum(document.getElementById('inputA').value) || 0;
      state.inputB      = parseNum(document.getElementById('inputB').value) || 0;
      state.inputC      = parseNum(document.getElementById('inputC').value) || 0;
      state.confidence3 = +document.getElementById('confidence3').value;
      break;
    case 4:
      state.inputD      = parseNum(document.getElementById('inputD').value) || 0;
      state.inputE      = parseNum(document.getElementById('inputE').value) || 0;
      state.sliderF     = +document.getElementById('sliderF').value;
      state.confidence4 = +document.getElementById('confidence4').value;
      break;
    case 5:
      state.inputG      = parseNum(document.getElementById('inputG').value) || 0;
      state.sliderH     = +document.getElementById('sliderH').value;
      state.confidence5 = +document.getElementById('confidence5').value;
      break;
  }
}

// ── Show Results (Screen 6 → 7) ─────────────────────────
async function handleShowResults() {
  clearError(6);
  const name     = document.getElementById('inputName').value.trim();
  const email    = document.getElementById('inputEmail').value.trim();
  const linkedin = document.getElementById('inputLinkedIn').value.trim();

  if (!email || !isValidEmail(email)) {
    setError(6, 'Please enter a valid email address to see your results.');
    return;
  }

  state.leadName     = name;
  state.leadEmail    = email;
  state.leadLinkedIn = linkedin;

  // Persist lead to localStorage
  try {
    localStorage.setItem('zerocode_lead', JSON.stringify({
      name:      state.leadName,
      email:     state.leadEmail,
      linkedIn:  state.leadLinkedIn,
      industry:  state.industry,
      timestamp: new Date().toISOString(),
    }));
  } catch (_) { /* storage quota / private mode — silently ignore */ }

  calculateResults();
  renderResults();

  // Show results immediately — don't block on email delivery
  goTo(7);

  // Send emails in background (non-blocking)
  sendEmails();
}

// ── Email Sending (via Vercel serverless function) ───────
function sendEmails() {
  const bottleneckLabels = {
    cant_keep_up:  "Can't keep up with existing demand",
    want_to_enter: "Want to enter a new market",
    both:          "Both — existing demand + new market",
  };

  const payload = {
    firstName:   state.leadName || 'there',
    leadName:    state.leadName,
    leadEmail:   state.leadEmail,
    leadLinkedIn: state.leadLinkedIn,
    industry:    (state.industry || 'other').replace(/_/g, ' '),
    bottleneck:  bottleneckLabels[state.bottleneckType] || state.bottleneckType || '—',
    monthlyTotal: fmt(state.monthlyTotal),
    annualTotal:  fmt(state.annualTotal),
    breakeven:    buildBreakevenText(),
    bdRevenue:    fmt(state.monthlyRevenueMissed),
    bdLabor:      fmt(state.monthlyLaborRecoverable),
    bdFees:       fmt(state.monthlyFeesRecoverable),
  };

  fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userEmail: state.leadEmail, payload }),
  }).catch(err => console.warn('[Zerocode] Email send failed:', err));
}

// ── Email HTML Builders ──────────────────────────────────

function buildUserEmail(firstName, breakevenTx) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f3f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:#001B43;padding:28px 32px;">
          <img src="https://zerocode.com/logo-white.png" alt="Zerocode" height="32" style="display:block;margin-bottom:4px;" onerror="this.style.display='none'"/>
          <p style="margin:0;color:#17DBFB;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">The Operational Fix</p>
        </td>
      </tr>

      <!-- Intro -->
      <tr>
        <td style="padding:32px 32px 8px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#001B43;line-height:1.3;">
            Hi ${firstName}, here's your bottleneck report
          </h1>
          <p style="margin:0;font-size:15px;color:#495057;line-height:1.6;">
            Based on the numbers you entered, here's what your operational bottleneck is costing you every month.
          </p>
        </td>
      </tr>

      <!-- Result Cards -->
      <tr>
        <td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#303481;border-radius:10px;padding:20px;text-align:center;width:30%;">
                <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:rgba(255,255,255,0.75);">Monthly cost</p>
                <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${fmt(state.monthlyTotal)}</p>
              </td>
              <td width="12"></td>
              <td style="background:#303481;border-radius:10px;padding:20px;text-align:center;width:30%;">
                <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:rgba(255,255,255,0.75);">Annual cost</p>
                <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${fmt(state.annualTotal)}</p>
              </td>
              <td width="12"></td>
              <td style="background:#303481;border-radius:10px;padding:20px;text-align:center;width:30%;">
                <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:rgba(255,255,255,0.75);">Break-even</p>
                <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">${breakevenTx}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Breakdown -->
      <tr>
        <td style="padding:0 32px 24px;">
          <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#001B43;">Cost Breakdown</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            <tr style="border-bottom:1px solid #e9ecef;">
              <td style="padding:9px 0;color:#495057;">Revenue you can't capture</td>
              <td style="padding:9px 0;text-align:right;font-weight:600;color:#212529;">${fmt(state.monthlyRevenueMissed)}/mo</td>
            </tr>
            <tr style="border-bottom:1px solid #e9ecef;">
              <td style="padding:9px 0;color:#495057;">Manual work cost</td>
              <td style="padding:9px 0;text-align:right;font-weight:600;color:#212529;">${fmt(state.monthlyLaborRecoverable)}/mo</td>
            </tr>
            <tr style="border-bottom:1px solid #e9ecef;">
              <td style="padding:9px 0;color:#495057;">Platform fees</td>
              <td style="padding:9px 0;text-align:right;font-weight:600;color:#212529;">${fmt(state.monthlyFeesRecoverable)}/mo</td>
            </tr>
            <tr>
              <td style="padding:11px 0 0;font-weight:700;color:#001B43;font-size:15px;">Total</td>
              <td style="padding:11px 0 0;text-align:right;font-weight:700;color:#001B43;font-size:15px;">${fmt(state.monthlyTotal)}/mo</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="padding:0 32px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#001B43;border-radius:10px;padding:28px 24px;">
            <tr>
              <td>
                <h2 style="margin:0 0 10px;font-size:18px;font-weight:700;color:#ffffff;line-height:1.3;">Want to know exactly what it would take to fix this?</h2>
                <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.78);line-height:1.6;">Book a free 30-minute consultation. We map the exact bottleneck, validate your numbers, and tell you honestly whether we're the right fit to remove it.</p>
                <a href="https://calendly.com/andres-diaz-/discoverycall"
                   style="display:inline-block;background:#17DBFB;color:#001B43;font-weight:700;font-size:15px;padding:13px 28px;border-radius:8px;text-decoration:none;">
                  Book your free consultation →
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 32px;border-top:1px solid #e9ecef;text-align:center;">
          <p style="margin:0;font-size:12px;color:#adb5bd;">
            Zerocode · The Operational Fix<br/>
            You received this because you used our free Bottleneck Calculator.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildLeadEmail(industry, bottleneck, breakevenTx) {
  const submitted = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f3f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:#17DBFB;padding:20px 28px;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#001B43;text-transform:uppercase;letter-spacing:0.8px;">🔔 New Lead — Bottleneck Calculator</p>
        </td>
      </tr>

      <!-- Lead Details -->
      <tr>
        <td style="padding:28px 28px 12px;">
          <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#001B43;">Contact Information</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            ${buildRow('Name',      state.leadName     || '(not provided)')}
            ${buildRow('Email',     `<a href="mailto:${state.leadEmail}" style="color:#303481;">${state.leadEmail}</a>`)}
            ${buildRow('LinkedIn',  state.leadLinkedIn ? `<a href="${state.leadLinkedIn}" style="color:#303481;">${state.leadLinkedIn}</a>` : '(not provided)')}
            ${buildRow('Industry',  industry)}
            ${buildRow('Situation', bottleneck)}
            ${buildRow('Submitted', submitted)}
          </table>
        </td>
      </tr>

      <!-- Results -->
      <tr>
        <td style="padding:12px 28px 28px;">
          <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#001B43;">Their Numbers</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            ${buildRow('Monthly total',           `<strong style="color:#303481;font-size:16px;">${fmt(state.monthlyTotal)}/mo</strong>`)}
            ${buildRow('Annual total',            `<strong>${fmt(state.annualTotal)}/yr</strong>`)}
            ${buildRow('Break-even estimate',     breakevenTx)}
            ${buildRow('Revenue missed',          fmt(state.monthlyRevenueMissed) + '/mo')}
            ${buildRow('Manual work cost',        fmt(state.monthlyLaborRecoverable) + '/mo')}
            ${buildRow('Platform fees',           fmt(state.monthlyFeesRecoverable) + '/mo')}
          </table>
        </td>
      </tr>

      <!-- Quick Actions -->
      <tr>
        <td style="padding:0 28px 28px;">
          <a href="mailto:${state.leadEmail}?subject=Re: Your Zerocode bottleneck report"
             style="display:inline-block;background:#303481;color:#ffffff;font-weight:700;font-size:14px;padding:11px 22px;border-radius:8px;text-decoration:none;margin-right:10px;">
            Reply to lead
          </a>
          <a href="https://calendly.com/andres-diaz-/discoverycall"
             style="display:inline-block;background:#001B43;color:#ffffff;font-weight:700;font-size:14px;padding:11px 22px;border-radius:8px;text-decoration:none;">
            Open Calendly
          </a>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// Helper for table rows in lead email
function buildRow(label, value) {
  return `<tr>
    <td style="padding:8px 0;color:#6c757d;width:38%;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:#212529;font-weight:600;">${value}</td>
  </tr>`;
}

function buildBreakevenText() {
  if (state.monthlyTotal <= 0) return 'N/A';
  const fast = Math.ceil(20000 / state.monthlyTotal);
  const full  = Math.ceil(60000 / state.monthlyTotal);
  return `Between ${fast} and ${full} months`;
}

// ── Confidence Multiplier ────────────────────────────────
// Maps confidence 1–5 to a conservative weight: 1 → 0.65, 5 → 1.00
// Low confidence = results discounted to keep estimates honest.
function confidenceMultiplier(c) {
  return 0.65 + 0.35 * ((c - 1) / 4);
}

// ── Calculations ────────────────────────────────────────
function calculateResults() {
  const m3 = confidenceMultiplier(state.confidence3);
  const m4 = confidenceMultiplier(state.confidence4);
  const m5 = confidenceMultiplier(state.confidence5);

  const B = Math.max(0, state.inputB);
  const C = Math.max(0, state.inputC);

  // Revenue missed — scaled by confidence in screen 3 numbers
  state.monthlyRevenueMissed = Math.max(0, B * C * m3);

  // Labor recoverable  D × 4.3 weeks/month × E × (F%) — scaled by confidence in screen 4
  const D = Math.max(0, state.inputD);
  const E = Math.max(0, state.inputE);
  const F = state.sliderF;
  state.monthlyLaborRecoverable = Math.max(0, D * 4.3 * E * (F / 100) * m4);

  // Fees recoverable — scaled by confidence in screen 5
  const G = Math.max(0, state.inputG);
  const H = state.sliderH;
  state.monthlyFeesRecoverable = Math.max(0, G * (H / 100) * m5);

  state.monthlyTotal = state.monthlyRevenueMissed + state.monthlyLaborRecoverable + state.monthlyFeesRecoverable;
  state.annualTotal  = state.monthlyTotal * 12;
}

// ── Render Results ──────────────────────────────────────
function renderResults() {
  // Greeting
  const greetEl = document.getElementById('resultsGreeting');
  if (greetEl) greetEl.textContent = state.leadName ? `Here's your personalised report, ${state.leadName}.` : '';

  // Cards
  setText('cardMonthly', fmt(state.monthlyTotal) + ' / month');
  setText('cardAnnual',  fmt(state.annualTotal)  + ' / year');

  // Break-even
  let breakevenText;
  if (state.monthlyTotal > 0) {
    const fast = Math.ceil(20000 / state.monthlyTotal);
    const full = Math.ceil(60000 / state.monthlyTotal);
    breakevenText = `Between ${fast} and ${full} months`;
  } else {
    breakevenText = 'Enter your numbers to calculate';
  }
  setText('cardBreakeven', breakevenText);

  // Breakdown
  setText('bdRevenue', fmt(state.monthlyRevenueMissed)    + '/mo');
  setText('bdLabor',   fmt(state.monthlyLaborRecoverable) + '/mo');
  setText('bdFees',    fmt(state.monthlyFeesRecoverable)  + '/mo');
  setText('bdTotal',   fmt(state.monthlyTotal)            + '/mo');

  // Insight
  const term = state.industryTerm + 's';
  const insights = {
    cant_keep_up:  `Your operation is turning away ${term} that are already looking for what you offer. Every month you wait is another month of revenue that goes to whoever can serve them.`,
    want_to_enter: `The market you want to serve already exists. The only thing between your business and that revenue is the infrastructure to reach it.`,
    both:          `You have demand you can't serve and a market you can't enter. Both are costing you every single day.`,
  };
  const fallback = `Your operational bottleneck is a solvable problem. The question is how much longer you'll let it run.`;
  setText('insightText', insights[state.bottleneckType] || fallback);
}

// ── Share to LinkedIn ───────────────────────────────────
function shareToLinkedIn() {
  const monthly = fmt(state.monthlyTotal);
  const annual  = fmt(state.annualTotal);
  const url     = window.location.href.split('?')[0]; // clean URL

  const text = `My operational bottleneck is costing me ${monthly}/month — ${annual}/year.\n\nI calculated it in 10 minutes using this free tool from Zerocode.\n\nIf you run an established business and suspect something is quietly capping your growth, this is worth 10 minutes:\n${url}\n\n#operations #business #growth`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(showToast)
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); showToast(); }
  catch (_) { alert('Copy this text to share on LinkedIn:\n\n' + text); }
  document.body.removeChild(ta);
}

function showToast() {
  const t = document.getElementById('toast');
  if (!t) return;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Industry Term Updates ───────────────────────────────
function updateIndustryTerms() {
  document.querySelectorAll('.industry-term').forEach(el => {
    el.textContent = state.industryTerm;
  });
  // Plural form used on "how many X" questions
  document.querySelectorAll('.industry-term-plural').forEach(el => {
    el.textContent = state.industryTerm + 's';
  });
}

// ── Slider Setup ────────────────────────────────────────
function setupSliders() {
  const configs = [
    { id: 'confidence3', valId: 'confidence3Val', fmt: v => `${v} / 5` },
    { id: 'confidence4', valId: 'confidence4Val', fmt: v => `${v} / 5` },
    { id: 'confidence5', valId: 'confidence5Val', fmt: v => `${v} / 5` },
    { id: 'sliderF',     valId: 'sliderFVal',     fmt: v => `${v}%`    },
    { id: 'sliderH',     valId: 'sliderHVal',     fmt: v => `${v}%`    },
  ];

  configs.forEach(({ id, valId, fmt: fmtFn }) => {
    const slider = document.getElementById(id);
    const valEl  = document.getElementById(valId);
    if (!slider || !valEl) return;

    const update = () => {
      valEl.textContent = fmtFn(slider.value);
      paintSlider(slider);
    };

    slider.addEventListener('input', update);
    update(); // paint initial state
  });
}

function paintSlider(slider) {
  const min = +slider.min || 0;
  const max = +slider.max || 100;
  const val = +slider.value;
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.background =
    `linear-gradient(to right, var(--highlight) ${pct}%, var(--gray-300) ${pct}%)`;
}

// ── Numeric Input Formatting ────────────────────────────
function setupNumericInputs() {
  // All .num-input elements get comma formatting
  document.querySelectorAll('.num-input').forEach(input => {
    input.addEventListener('input',  () => applyCommaFormat(input));
    input.addEventListener('blur',   () => applyCommaFormat(input, true));
    input.addEventListener('focus',  () => {
      // On focus strip commas so editing is easier (for non-decimal fields)
      // Keep caret at end
    });
  });
}

function applyCommaFormat(input, onBlur = false) {
  // Strip everything except digits and one decimal point
  let raw = input.value.replace(/[^0-9.]/g, '');

  // Allow only one decimal point
  const dotIdx = raw.indexOf('.');
  if (dotIdx !== -1) {
    raw = raw.slice(0, dotIdx + 1) + raw.slice(dotIdx + 1).replace(/\./g, '');
  }

  if (!raw) return; // empty is fine

  const parts    = raw.split('.');
  const intPart  = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decPart  = parts.length > 1 ? '.' + parts[1] : '';

  // If blurring and decimal is trailing (e.g. "500."), strip it
  input.value = intPart + (onBlur ? (parts[1] ? decPart : '') : decPart);
}

// ── Helpers ─────────────────────────────────────────────

/** Parse a formatted number string back to float. Returns null on invalid. */
function parseNum(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = parseFloat(String(value).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

/** Format a number as $X,XXX (never negative) */
function fmt(value) {
  const n = Math.max(0, Math.round(value));
  return '$' + n.toLocaleString('en-US');
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
