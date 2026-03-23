// ============================================================
//  BS Tech Solutions — Google Apps Script Backend
//  Receives form data → saves to Google Sheets → sends email
//
//  HOW TO USE:
//   1. Open script.google.com → New Project
//   2. Paste this entire file into Code.gs
//   3. Update SHEET_ID and ADMIN_EMAIL below
//   4. Deploy as Web App (see SETUP_GUIDE.md)
// ============================================================

// ─── CONFIGURATION ───────────────────────────────────────────
// ⚠️  REQUIRED: Replace with your actual Google Sheet URL/ID
const SHEET_ID = '1SOl_gyZGdcyX6MzgHd2S-M6P9VXDZ54FOXfDRLvwxWM';
// ⚠️  REQUIRED: Replace with your email address for notifications
const ADMIN_EMAIL = 'bhanuthammali26012@gmail.com'; // 🔧 TEST: change to info@bstechsolutions.in when going live
// Optional: name of the sheet tab (default is "Sheet1")
const SHEET_TAB = 'Leads';
// ─────────────────────────────────────────────────────────────

/**
 * Handles HTTP POST requests from the enquiry form.
 * Google Apps Script calls this function automatically on POST.
 */
function doPost(e) {
    try {
        // ── 1. Parse the incoming JSON body ─────────────────────
        let data;
        try {
            data = JSON.parse(e.postData.contents);
        } catch (parseErr) {
            return jsonResponse({ success: false, error: 'Invalid JSON payload.' }, 400);
        }

        // ── 2. Extract & sanitise fields ────────────────────────
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const fullName = sanitise(data.fullName || '');
        const phone = sanitise(data.phone || '');
        const email = sanitise(data.email || '').toLowerCase();
        const businessName = sanitise(data.businessName || '');
        const service = sanitise(data.service || '');
        const budget = sanitise(data.budget || '');
        const message = sanitise(data.message || '');

        // ── 3. Basic server-side validation ─────────────────────
        if (!fullName || !phone || !email || !businessName || !service || !budget || !message) {
            return jsonResponse({ success: false, error: 'All required fields must be filled.' }, 422);
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return jsonResponse({ success: false, error: 'Invalid email address.' }, 422);
        }

        // ── 4. Append row to Google Sheet ───────────────────────
        const ss = SpreadsheetApp.openById(SHEET_ID);
        let sheet = ss.getSheetByName(SHEET_TAB);

        // Auto-create the sheet tab if it does not exist
        if (!sheet) {
            sheet = ss.insertSheet(SHEET_TAB);
            // Add header row on first creation
            sheet.appendRow([
                'Timestamp',
                'Name',
                'Phone',
                'Email',
                'Business Name',
                'Service',
                'Budget',
                'Message'
            ]);
            // Style header row
            const header = sheet.getRange(1, 1, 1, 8);
            header.setFontWeight('bold');
            header.setBackground('#1E3A5F');
            header.setFontColor('#FFFFFF');
            sheet.setFrozenRows(1);
            // Auto-resize columns
            sheet.autoResizeColumns(1, 8);
        }

        // Add the lead data row
        sheet.appendRow([
            timestamp,
            fullName,
            phone,
            email,
            businessName,
            service,
            budget,
            message
        ]);

        // ── 5. Send email notification to Admin ─────────────────
        sendAdminEmail({ timestamp, fullName, phone, email, businessName, service, budget, message });

        // ── 6. Return success response ───────────────────────────
        return jsonResponse({ success: true, message: 'Lead saved successfully.' }, 200);

    } catch (err) {
        // Log error to Apps Script execution log
        console.error('doPost error:', err.toString());
        return jsonResponse({ success: false, error: 'Internal server error: ' + err.toString() }, 500);
    }
}

/**
 * Handles GET requests — useful for testing the script URL in browser.
 */
function doGet(e) {
    return ContentService
        .createTextOutput(JSON.stringify({
            status: 'BS Tech Solutions Webhook is live ✅',
            timestamp: new Date().toISOString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
}

// ─── HELPERS ─────────────────────────────────────────────────

/**
 * Sends a formatted HTML email to the admin with lead details.
 */
function sendAdminEmail(lead) {
    const subject = `🔔 New Lead: ${lead.fullName} — ${lead.service} (${lead.budget})`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; max-width: 580px;
            margin: 0 auto; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #091221 0%, #0D1A2F 100%);
              border-radius: 8px; padding: 24px 28px; margin-bottom: 28px; }
    .header h1 { color: #FBBF24; font-size: 22px; margin: 0 0 4px; }
    .header p  { color: #94A3B8; font-size: 13px; margin: 0; }
    .badge { display: inline-block; background: #FBBF24; color: #050B18;
             padding: 4px 12px; border-radius: 20px; font-size: 12px;
             font-weight: 700; margin-top: 10px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
    td:first-child { font-weight: 700; color: #334155; width: 36%; }
    td:last-child  { color: #1E293B; }
    tr:last-child td { border-bottom: none; }
    .msg-cell { white-space: pre-wrap; line-height: 1.6; color: #475569; }
    .actions  { display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 30px;
           font-weight: 700; font-size: 14px; text-decoration: none; }
    .btn-wa    { background: #25D366; color: #fff; }
    .btn-email { background: #2563EB; color: #fff; }
    .footer-note { font-size: 12px; color: #94A3B8; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🚀 New Project Enquiry</h1>
      <p>BS Tech Solutions — Lead Capture System</p>
      <span class="badge">📅 ${lead.timestamp}</span>
    </div>

    <table>
      <tr><td>👤 Full Name</td><td>${lead.fullName}</td></tr>
      <tr><td>📞 Phone</td><td>${lead.phone}</td></tr>
      <tr><td>📧 Email</td><td>${lead.email}</td></tr>
      <tr><td>🏢 Business</td><td>${lead.businessName}</td></tr>
      <tr><td>🛠️ Service</td><td>${lead.service}</td></tr>
      <tr><td>💰 Budget</td><td>${lead.budget}</td></tr>
      <tr><td>📝 Message</td><td class="msg-cell">${lead.message}</td></tr>
    </table>

    <div class="actions">
      <a href="https://wa.me/91${lead.phone.replace(/\D/g, '').slice(-10)}?text=Hi%20${encodeURIComponent(lead.fullName)}%2C%20this%20is%20BS%20Tech%20Solutions.%20Thank%20you%20for%20your%20enquiry!%20Let%27s%20discuss%20your%20project."
         class="btn btn-wa">💬 Reply on WhatsApp</a>
      <a href="mailto:${lead.email}?subject=Re: Your Enquiry — BS Tech Solutions&body=Hi ${lead.fullName},%0A%0AThank you for reaching out to BS Tech Solutions!%0A%0AWe have received your enquiry for ${lead.service} and will get back to you within 2 hours.%0A%0ABest regards,%0ABS Tech Solutions Team"
         class="btn btn-email">📧 Reply via Email</a>
    </div>

    <p class="footer-note">
      This email was automatically sent by the BS Tech Solutions lead capture system.
      The lead has been saved to your Google Sheet.
    </p>
  </div>
</body>
</html>
`;

    MailApp.sendEmail({
        to: ADMIN_EMAIL,
        subject: subject,
        htmlBody: htmlBody,
    });
}

/**
 * Removes HTML tags and trims whitespace to prevent XSS in the sheet.
 */
function sanitise(str) {
    return String(str)
        .replace(/<[^>]*>/g, '')   // strip HTML tags
        .replace(/[^\w\s@.,₹+\-:!?()&'"/]/g, '') // allow safe chars only
        .trim()
        .slice(0, 1000);           // max 1000 chars per field
}

/**
 * Returns a JSON response with CORS headers.
 * The 'text/plain' MIME type avoids CORS preflight from browsers.
 */
function jsonResponse(obj, statusCode) {
    // Note: Google Apps Script does not support custom HTTP status codes in
    // ContentService. The response is always HTTP 200. Use the `success` flag
    // in the JSON body to determine the actual outcome.
    return ContentService
        .createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.TEXT);
}
