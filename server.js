// CLEAN HTML (WITH LEGAL FOOTER)
function cleanHtml(msg){
  const safeMsg = msg
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .split("\n")
    .join("<br>");

  return `
    <div style="font-size:15px; line-height:1.6;">
      ${safeMsg}
    </div>

    <div style="font-size:12px; color:#666; margin-top:20px; padding-top:12px; border-top:1px solid #ddd;">
      —<br>
      <strong>Legal Notice:</strong><br>
      This email and any attachments may contain confidential or legally privileged information.<br>
      If you are not the intended recipient, please delete this message immediately.<br>
      Unauthorized use, disclosure, or copying of this communication is strictly prohibited.
    </div>
  `;
}

// TEXT fallback version (no HTML, no footer)
function cleanText(msg){
  return msg.replace(/<\/?[^>]+>/g,"");
}


// SEND EMAIL (LEGAL FOOTER INCLUDED)
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients)
      return res.json({ success: false, message: "❌ Missing fields" });

    const list = recipients.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
    if (!list.length)
      return res.json({ success: false, message: "❌ No valid recipients" });

    // LIMIT CHECK
    if (!LIMIT[email])
      LIMIT[email] = { count: 0, reset: Date.now() + ONE_HOUR };

    if (Date.now() > LIMIT[email].reset) {
      LIMIT[email].count = 0;
      LIMIT[email].reset = Date.now() + ONE_HOUR;
    }

    if (LIMIT[email].count + list.length > LIMIT_MAX) {
      return res.json({
        success: false,
        message: "❌ Hourly limit reached",
        left: LIMIT_MAX - LIMIT[email].count
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: email, pass: password }
    });

    try {
      await transporter.verify();
    } catch {
      return res.json({ success: false, message: "❌ Wrong App Password" });
    }

    const htmlBody = cleanHtml(message);
    const textBody = cleanText(message);

    let sent = 0, fail = 0;

    for (let i = 0; i < list.length; ) {
      const batch = list.slice(i, i + BATCH);

      const results = await Promise.allSettled(
        batch.map(async to => {
          await delay(rand(50, 120)); // micro delay
          return transporter.sendMail({
            from: `"${senderName || "Sender"}" <${email}>`,
            to,
            subject: subject || " ",
            html: htmlBody,
            text: textBody
          });
        })
      );

      results.forEach(r => r.status === "fulfilled" ? sent++ : fail++);
      LIMIT[email].count += batch.length;

      i += batch.length;
      if (i < list.length) await delay(rand(200, 350));
    }

    return res.json({
      success: true,
      message: `Sent: ${sent} | Failed: ${fail}`,
      left: LIMIT_MAX - LIMIT[email].count
    });

  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});
