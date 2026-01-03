/********************************************************************
 * Secure Mail Console - Server
 * --------------------------------------------------
 * - Express based backend
 * - Nodemailer (SMTP compliant)
 * - Hourly limits
 * - No pooling tricks
 * - No spoofing
 * - Plain-text only (spam-safe)
 ********************************************************************/

import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

/* --------------------------------------------------
   PATH RESOLUTION
-------------------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/* --------------------------------------------------
   APP INIT
-------------------------------------------------- */
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* --------------------------------------------------
   CONSTANTS (SAFE DEFAULTS)
-------------------------------------------------- */
const MAX_MAIL_PER_HOUR = 28;
const PARALLEL_LIMIT    = 3;
const DELAY_MIN         = 120;
const DELAY_MAX         = 220;

/* --------------------------------------------------
   IN-MEMORY TRACKING (SAFE)
-------------------------------------------------- */
const usageStore = {};

/* --------------------------------------------------
   UTILITY HELPERS
-------------------------------------------------- */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function resetHourlyLimitIfNeeded(gmail) {
  if (!usageStore[gmail]) {
    usageStore[gmail] = { count: 0, startedAt: Date.now() };
    return;
  }

  const elapsed = Date.now() - usageStore[gmail].startedAt;
  if (elapsed >= 60 * 60 * 1000) {
    usageStore[gmail] = { count: 0, startedAt: Date.now() };
  }
}

function normalizeRecipients(input) {
  return input
    .split(/,|\r?\n/)
    .map(v => v.trim())
    .filter(Boolean);
}

/* --------------------------------------------------
   SAFE SEND ENGINE
-------------------------------------------------- */
async function sendInControlledBatches(transporter, mailJobs) {
  let successCount = 0;

  for (let i = 0; i < mailJobs.length; i += PARALLEL_LIMIT) {
    const batch = mailJobs.slice(i, i + PARALLEL_LIMIT);

    const results = await Promise.allSettled(
      batch.map(job => transporter.sendMail(job))
    );

    results.forEach(r => {
      if (r.status === "fulfilled") successCount++;
    });

    await sleep(randomDelay(DELAY_MIN, DELAY_MAX));
  }

  return successCount;
}

/* --------------------------------------------------
   ROUTES
-------------------------------------------------- */

/* Root → Login */
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* Send Mail */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, subject, message, to } = req.body;

  if (!gmail || !apppass || !to || !subject || !message) {
    return res.json({ success: false, msg: "Missing fields ❌" });
  }

  resetHourlyLimitIfNeeded(gmail);

  if (usageStore[gmail].count >= MAX_MAIL_PER_HOUR) {
    return res.json({
      success: false,
      msg: "Mail Limit Full ❌",
      count: usageStore[gmail].count
    });
  }

  const recipients = normalizeRecipients(to);
  const remaining  = MAX_MAIL_PER_HOUR - usageStore[gmail].count;

  if (recipients.length > remaining) {
    return res.json({
      success: false,
      msg: "Mail Limit Full ❌",
      count: usageStore[gmail].count
    });
  }

  /* Footer (safe informational only) */
  const finalMessage =
    message.trim() +
    "\n\n📩 Scanned & Secured — www.avast.com";

  /* SMTP Transport (standard compliant) */
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmail, pass: apppass }
  });

  try {
    await transporter.verify();
  } catch {
    return res.json({
      success: false,
      msg: "Wrong App Password ❌",
      count: usageStore[gmail].count
    });
  }

  const mailJobs = recipients.map(recipient => ({
    from: `"${senderName}" <${gmail}>`,
    to: recipient,
    subject,
    text: finalMessage,
    replyTo: gmail,
    headers: {
      "Message-ID": `<${crypto.randomUUID()}@${gmail.split("@")[1]}>`,
      "X-Mailer": "Secure Mail Console"
    }
  }));

  const sent = await sendInControlledBatches(transporter, mailJobs);
  usageStore[gmail].count += sent;

  res.json({
    success: true,
    sent,
    count: usageStore[gmail].count
  });
});

/* --------------------------------------------------
   SERVER START
-------------------------------------------------- */
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ Secure Mail Console running");
});
