function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function sanitize(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return sanitize(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  var chunks = [];
  for await (var chunk of req) {
    chunks.push(chunk);
  }

  var raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  var body;
  try {
    body = await parseBody(req);
  } catch (error) {
    return sendJson(res, 400, { error: "Invalid request body" });
  }

  var name = sanitize(body.name);
  var email = sanitize(body.email);
  var message = sanitize(body.message);
  var website = sanitize(body.website);

  if (website) {
    return sendJson(res, 200, { ok: true });
  }

  if (!name || !email || !message) {
    return sendJson(res, 400, { error: "Name, email, and message are required" });
  }

  if (name.length > 120 || email.length > 254 || message.length > 4000 || !isValidEmail(email)) {
    return sendJson(res, 400, { error: "Invalid contact details" });
  }

  var apiKey = process.env.RESEND_API_KEY;
  var toEmail = process.env.CONTACT_TO_EMAIL;
  var fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !toEmail || !fromEmail) {
    console.error("Missing contact form environment variables");
    return sendJson(res, 500, { error: "Contact form is not configured" });
  }

  var safeName = escapeHtml(name);
  var safeEmail = escapeHtml(email);
  var safeMessage = escapeHtml(message).replace(/\n/g, "<br />");
  var subject = "Portfolio message from " + name;
  var text = [
    "New portfolio contact message",
    "",
    "Name: " + name,
    "Email: " + email,
    "",
    message
  ].join("\n");

  var response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: subject,
        html:
          "<h2>New portfolio contact message</h2>" +
          "<p><strong>Name:</strong> " +
          safeName +
          "</p>" +
          "<p><strong>Email:</strong> " +
          safeEmail +
          "</p>" +
          "<p><strong>Message:</strong></p><p>" +
          safeMessage +
          "</p>",
        text: text
      })
    });
  } catch (error) {
    console.error("Resend request failed", error);
    return sendJson(res, 502, { error: "Failed to send message" });
  }

  if (!response.ok) {
    var details = await response.text();
    console.error("Resend rejected contact email", response.status, details);
    return sendJson(res, 502, { error: "Failed to send message" });
  }

  return sendJson(res, 200, { ok: true });
};
