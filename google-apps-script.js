// ============================================================
//  BS Tech Solutions — Google Apps Script Backend v2.0
//  FIXED: reply-to header, ₹ symbol, source tracking,
//         header auto-size, businessName fallback,
//         unified single deployment for both forms
//
//  ══ SETUP STEPS (read carefully) ══════════════════════════
//
//  STEP 1 — Create Google Sheet
//    • Go to sheets.google.com → create a new blank sheet
//    • Name it "BS Tech Leads" (or anything you prefer)
//    • Copy the Sheet ID from the URL:
//        https://docs.google.com/spreadsheets/d/ ←COPY THIS PART→ /edit
//    • Paste it below as SHEET_ID
//
//  STEP 2 — Open Apps Script
//    • In the Sheet: Extensions → Apps Script
//    • Delete all existing code and paste THIS entire file
//    • Update SHEET_ID and ADMIN_EMAIL below, then Save (Ctrl+S)
//
//  STEP 3 — Deploy as Web App
//    • Click "Deploy" → "New Deployment"
//    • Type: Web App
//    • Description: BS Tech Forms v1
//    • Execute as: Me
//    • Who has access: Anyone  ← IMPORTANT
//    • Click "Deploy" → copy the Web App URL
//
//  STEP 4 — Connect your HTML forms
//    • Open contact.html and find:  const WEBHOOK_URL = '...'
//    • Replace the URL with your Web App URL
//    • Do the same in enquiry.html
//    • Both forms use ONE single URL — you're done!
//
//  STEP 5 — Test it
//    • Submit a test enquiry on your website
//    • Check your email for the lead notification
//    • Check the Google Sheet — a new row should appear
//
//  NOTE: Every time you edit this script, you must:
//    Deploy → Manage Deployments → Edit → Version: New Version → Deploy
// ============================================================

// ─── YOUR SETTINGS ─────────────────────────────────────────
const SHEET_ID    = '1sXA_wBiB4o4Zc87OVrzw-v40YYMqC_DQD7f-vqaYMkE';
//                   ↑ Paste your Sheet ID between the quotes

const ADMIN_EMAIL = 'bhanuthammai26012@gmail.com';
//                   ↑ Change to your email address
// ───────────────────────────────────────────────────────────

const SHEET_TAB = 'Leads';

// ─── MAIN POST HANDLER ─────────────────────────────────────
function doPost(e) {
  try {
    // Parse incoming JSON body
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (_) {
      return respond({ success: false, error: 'Invalid JSON payload.' });
    }

    // Extract and sanitise every field
    const timestamp    = getISTTime();
    const source       = clean(data.source       || 'Contact Form');
    const fullName     = clean(data.fullName     || '');
    const phone        = clean(data.phone        || '');
    const email        = clean(data.email        || '').toLowerCase();
    const businessName = clean(data.businessName || 'Not provided');
    const service      = clean(data.service      || 'Not specified');
    const budget       = clean(data.budget       || 'Not specified');
    const message      = clean(data.message      || '');

    // Server-side validation
    if (!fullName || !phone || !email || !message) {
      return respond({ success: false, error: 'Required fields missing.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return respond({ success: false, error: 'Invalid email address.' });
    }

    // Get or create the Leads sheet
    const ss  = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_TAB);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_TAB);

      // Write header row
      const headers = [
        'Timestamp', 'Source', 'Full Name', 'Phone', 'Email',
        'Business Name', 'Service', 'Budget', 'Message', 'Status'
      ];
      sheet.appendRow(headers);

      // Style header: dark background, gold text, bold
      const hdrRange = sheet.getRange(1, 1, 1, headers.length);
      hdrRange
        .setFontWeight('bold')
        .setBackground('#091221')
        .setFontColor('#FBBF24')
        .setHorizontalAlignment('center');

      // Freeze header row so it stays visible while scrolling
      sheet.setFrozenRows(1);

      // Set sensible column widths
      const widths = [165, 125, 165, 130, 230, 185, 165, 145, 420, 90];
      widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

      // Add a dropdown for the Status column
      const statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['New', 'Contacted', 'Quoted', 'Won', 'Lost'], true)
        .build();
      sheet.getRange(2, 10, 1000, 1).setDataValidation(statusRule);
    }

    // Append the new lead row
    sheet.appendRow([
      timestamp, source, fullName, phone, email,
      businessName, service, budget, message, 'New'
    ]);

    // Highlight the new row so it stands out
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, 10)
      .setBackground('#0D1A2F')
      .setFontColor('#FFFFFF');

    // Send email notification to admin
    sendLeadEmail({ timestamp, source, fullName, phone, email, businessName, service, budget, message });

    return respond({ success: true, message: 'Lead saved successfully.' });

  } catch (err) {
    console.error('doPost error:', err.toString());
    return respond({ success: false, error: 'Server error: ' + err.toString() });
  }
}

// ─── GET HANDLER (for testing in browser) ─────────────────
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'BS Tech Solutions Lead Webhook v2.0 ✅',
      time:   new Date().toISOString(),
      note:   'POST JSON data to this URL from your HTML forms.'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── EMAIL NOTIFICATION ────────────────────────────────────
function sendLeadEmail(lead) {
  const subject = `🔔 New Lead [${lead.source}]: ${lead.fullName} — ${lead.service}`;

  // Build one-click WhatsApp reply URL
  const cleanPhone = lead.phone.replace(/\D/g, '').slice(-10);
  const waMsg      = encodeURIComponent(
    `Hi ${lead.fullName}, this is BS Tech Solutions! Thank you for your enquiry. We'd love to discuss your project. When would be a good time to chat?`
  );
  const waUrl = `https://wa.me/91${cleanPhone}?text=${waMsg}`;

  // Build one-click email reply URL
  const emailSubject = encodeURIComponent(`Re: Your Enquiry — BS Tech Solutions`);
  const emailBody    = encodeURIComponent(
    `Hi ${lead.fullName},\n\nThank you for contacting BS Tech Solutions!\n\nWe've received your enquiry regarding ${lead.service} and will get back to you within 2 hours.\n\nBest regards,\nBS Tech Solutions Team\nbhanuthammai26012@gmail.com`
  );
  const mailUrl = `mailto:${lead.email}?subject=${emailSubject}&body=${emailBody}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif}
  .wrap{max-width:620px;margin:0 auto}
  .card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.12)}
  .hdr{background:linear-gradient(135deg,#050B18 0%,#0D1A2F 100%);padding:28px 32px}
  .hdr h1{color:#FBBF24;font-size:22px;margin:0 0 6px;font-weight:700}
  .hdr p{color:#94A3B8;font-size:13px;margin:0}
  .badge{display:inline-flex;align-items:center;gap:8px;background:#FBBF24;color:#050B18;
         padding:5px 14px;border-radius:20px;font-size:12px;font-weight:800;margin-top:12px}
  .body{padding:28px 32px}
  .urgency{background:#FFF7ED;border-left:4px solid #F59E0B;border-radius:0 8px 8px 0;
           padding:12px 16px;margin-bottom:24px;font-size:13px;color:#92400E;font-weight:600}
  table{width:100%;border-collapse:collapse;margin-bottom:4px}
  td{padding:13px 0;border-bottom:1px solid #E2E8F0;font-size:14px;vertical-align:top;line-height:1.5}
  td.lbl{font-weight:700;color:#475569;width:34%;padding-right:16px;white-space:nowrap}
  td.val{color:#1E293B}
  tr:last-child td{border-bottom:none}
  .msg-box{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;
           padding:14px;margin-top:4px;font-size:13px;color:#475569;white-space:pre-wrap;line-height:1.7}
  .actions{display:flex;gap:12px;margin-top:24px;flex-wrap:wrap}
  .btn{display:inline-block;padding:13px 26px;border-radius:30px;font-weight:700;
       font-size:14px;text-decoration:none;letter-spacing:.3px}
  .wa{background:#25D366;color:#fff}
  .em{background:#2563EB;color:#fff}
  .footer-note{font-size:11px;color:#94A3B8;margin-top:20px;line-height:1.7;border-top:1px solid #E2E8F0;padding-top:16px}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="hdr">
      <h1>🚀 New Project Enquiry</h1>
      <p>BS Tech Solutions — Lead Capture System</p>
      <div class="badge">📅 ${lead.timestamp} &nbsp;·&nbsp; 📌 ${lead.source}</div>
    </div>
    <div class="body">
      <div class="urgency">⏰ Respond within 2 hours for the best conversion rate!</div>
      <table>
        <tr><td class="lbl">👤 Full Name</td>   <td class="val">${lead.fullName}</td></tr>
        <tr><td class="lbl">📞 Phone</td>        <td class="val">${lead.phone}</td></tr>
        <tr><td class="lbl">📧 Email</td>        <td class="val">${lead.email}</td></tr>
        <tr><td class="lbl">🏢 Business</td>     <td class="val">${lead.businessName}</td></tr>
        <tr><td class="lbl">🛠️ Service</td>      <td class="val">${lead.service}</td></tr>
        <tr><td class="lbl">💰 Budget</td>       <td class="val">${lead.budget}</td></tr>
        <tr>
          <td class="lbl">📝 Message</td>
          <td class="val"><div class="msg-box">${lead.message}</div></td>
        </tr>
      </table>
      <div class="actions">
        <a href="${waUrl}" class="btn wa">💬 Reply on WhatsApp</a>
        <a href="${mailUrl}" class="btn em">📧 Reply via Email</a>
      </div>
      <div class="footer-note">
        ✅ Lead saved to your Google Sheet (Leads tab) — Status set to "New"<br>
        📊 Update the Status column after each follow-up to track your pipeline<br>
        🔁 Hit <strong>Reply</strong> in Gmail to respond directly to the client
      </div>
    </div>
  </div>
</div>
</body></html>`;

  MailApp.sendEmail({
    to:       ADMIN_EMAIL,
    replyTo:  lead.email,     // ← Reply goes straight to the client's inbox
    subject:  subject,
    htmlBody: html,
  });
}

// ─── UTILITIES ─────────────────────────────────────────────

/**
 * Sanitise: strip HTML tags, allow ₹ and safe chars, trim, cap length.
 */
function clean(str) {
  return String(str)
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s@.,₹+\-:!?()&'"\/\r\n]/g, '')
    .trim()
    .slice(0, 3000);
}

/**
 * Returns a human-readable IST timestamp.
 */
function getISTTime() {
  return new Date().toLocaleString('en-IN', {
    timeZone:  'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

/**
 * Returns a text/plain Content Service response.
 * Google Apps Script always returns HTTP 200 — use the success
 * flag in the JSON body to distinguish success from failure.
 */
function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.TEXT);
}
