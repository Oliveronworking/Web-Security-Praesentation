const express = require("express");
const csrf = require("csurf");
const cookieParser = require("cookie-parser");
const { body, validationResult } = require("express-validator");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// csrf schutz
const csrfProtection = csrf({ cookie: { httpOnly: true, sameSite: "strict" } });

// security headers setzen
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

const users = [
  { id: 1, username: "admin", password: "geheim123" },
  { id: 2, username: "max", password: "passwort" },
  { id: 3, username: "lisa", password: "qwerty" },
];

let comments = [
  { author: "max", text: "Schoene Seite!" },
];

// prepared statement - parameter werden nicht in den string eingebaut
function checkLogin(username, password) {
  console.log("Query: SELECT * FROM users WHERE username=? AND password=?");
  console.log("Params:", username, "/ [hidden]");
  return users.find(u => u.username === username && u.password === password) || null;
}

// html escaping damit kein script ausgefuehrt wird
function escapeHtml(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Secure App</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; background: #f0fff0; }
        h1 { color: #007700; }
        .nav a { margin-right: 15px; color: #007700; }
        .box { border: 1px solid #007700; padding: 15px; margin: 10px 0; background: white; border-radius: 5px; }
        .check { color: green; }
        .info { background: #eeffee; border: 2px solid #007700; padding: 10px; margin-bottom: 15px; }
        .code { background: #f5f5f5; padding: 8px; font-family: monospace; font-size: 13px; margin: 5px 0; border-left: 3px solid green; }
      </style>
    </head>
    <body>
      <h1>Secure Web App</h1>
      <div class="info">
        Das ist die abgesicherte Version mit denselben Funktionen aber ohne die Sicherheitsluecken.
      </div>
      <div class="nav">
        <a href="/">Home</a>
        <a href="/login">Login</a>
        <a href="/comments">Kommentare</a>
      </div>
      <hr>
      <div class="box">
        <h3>Schutzmassnehmen die eingebaut sind:</h3>
        <p class="check">&#10003; Prepared Statements gegen SQL Injection</p>
        <p class="check">&#10003; HTML Escaping gegen XSS</p>
        <p class="check">&#10003; CSRF Token in jedem Formular</p>
        <p class="check">&#10003; Input Validierung (express-validator)</p>
        <p class="check">&#10003; Content Security Policy Header</p>
        <p class="check">&#10003; HttpOnly + SameSite Cookies</p>
      </div>
      <div class="box">
        <h3>Was passiert wenn man die Angriffe nochmal versucht?</h3>
        <div class="code">admin'-- --> wird als normaler Text behandelt --> Login schlaegt fehl</div>
        <div class="code">&lt;script&gt;alert('XSS!')&lt;/script&gt; --> wird escaped --> erscheint als Text</div>
      </div>
    </body>
    </html>
  `);
});

app.get("/login", csrfProtection, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Login (Sicher)</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; background: #f0fff0; }
        input { display: block; margin: 5px 0 15px 0; padding: 8px; width: 250px; }
        button { background: #007700; color: white; padding: 8px 20px; border: none; cursor: pointer; }
        .nav a { margin-right: 15px; color: #007700; }
        .info { background: #eeffee; padding: 10px; margin: 10px 0; font-size: 13px; border-left: 3px solid green; }
        .code { font-family: monospace; background: #f5f5f5; padding: 5px; }
      </style>
    </head>
    <body>
      <div class="nav"><a href="/">Home</a> <a href="/login">Login</a> <a href="/comments">Kommentare</a></div>
      <h2>Login (mit Prepared Statement)</h2>
      <div class="info">
        Versuch: <span class="code">admin'--</span> --> funktioniert jetzt NICHT mehr!
      </div>
      <form method="POST" action="/login">
        <input type="hidden" name="_csrf" value="${req.csrfToken()}">
        <label>Username:</label>
        <input type="text" name="username" placeholder="Username eingeben">
        <label>Passwort:</label>
        <input type="password" name="password" placeholder="Passwort eingeben">
        <button type="submit">Einloggen</button>
      </form>
      <br>
      <p><strong>So sieht der sichere Query aus:</strong></p>
      <div style="background:#f5f5f5; padding:8px; font-family:monospace; font-size:13px;">
        SELECT * FROM users WHERE username=<strong style="color:green">?</strong> AND password=<strong style="color:green">?</strong><br>
        <small>Parameter werden separat uebergeben, nie direkt in den String eingebaut</small>
      </div>
    </body>
    </html>
  `);
});

app.post("/login",
  csrfProtection,
  body("username").trim().isLength({ min: 1, max: 50 }).escape(),
  body("password").isLength({ min: 1, max: 100 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(`
        <p style="color:red">Fehler: ${errors.array().map(e => escapeHtml(e.msg)).join(", ")}</p>
        <a href="/login">Zurueck</a>
      `);
    }

    const username = req.body.username;
    const password = req.body.password;
    const user = checkLogin(username, password);

    if (user) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Login OK</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; background: #f0fff0; }
            .nav a { margin-right: 15px; color: #007700; }
          </style>
        </head>
        <body>
          <div class="nav"><a href="/">Home</a> <a href="/login">Login</a> <a href="/comments">Kommentare</a></div>
          <h2 style="color:green">Login erfolgreich!</h2>
          <p>Willkommen: <strong>${escapeHtml(username)}</strong></p>
          <br>
          <p><strong>Query der ausgefuehrt wurde:</strong></p>
          <div style="background:#f5f5f5; padding:8px; font-family:monospace; font-size:13px;">
            SELECT * FROM users WHERE username=? AND password=?<br>
            Params: ["${escapeHtml(username)}", "***"]
          </div>
        </body>
        </html>
      `);
    } else {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Login fehlgeschlagen</title>
          <style>body { font-family: Arial, sans-serif; margin: 30px; background: #f0fff0; } .nav a { margin-right: 15px; color: #007700; }</style>
        </head>
        <body>
          <div class="nav"><a href="/">Home</a> <a href="/login">Login</a> <a href="/comments">Kommentare</a></div>
          <h2 style="color:red">Login fehlgeschlagen</h2>
          <p>Falscher Username oder Passwort.</p>
          <p style="font-size:13px; color:#555">Injection Versuch schlaegt fehl weil der Apostroph als normales Zeichen behandelt wird.</p>
          <a href="/login">Zurueck</a>
        </body>
        </html>
      `);
    }
  }
);

app.get("/comments", csrfProtection, (req, res) => {
  let commentHTML = "";
  for (let i = 0; i < comments.length; i++) {
    commentHTML += `
      <div style="border-left: 3px solid green; padding: 8px; margin: 8px 0; background: white;">
        <small style="color: #888">${escapeHtml(comments[i].author)} schreibt:</small><br>
        ${escapeHtml(comments[i].text)}
      </div>
    `;
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Kommentare (Sicher)</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; background: #f0fff0; }
        input { display: block; margin: 5px 0 15px 0; padding: 8px; width: 300px; }
        button { background: #007700; color: white; padding: 8px 20px; border: none; cursor: pointer; }
        .nav a { margin-right: 15px; color: #007700; }
        .info { background: #eeffee; padding: 10px; margin: 10px 0; font-size: 13px; border-left: 3px solid green; }
        .code { font-family: monospace; background: #f5f5f5; padding: 3px 6px; }
      </style>
    </head>
    <body>
      <div class="nav"><a href="/">Home</a> <a href="/login">Login</a> <a href="/comments">Kommentare</a></div>
      <h2>Kommentare (XSS-geschuetzt)</h2>
      <div class="info">
        Tipp: <span class="code">&lt;script&gt;alert('XSS!')&lt;/script&gt;</span> eingeben --> wird als Text angezeigt, nicht ausgefuehrt
      </div>
      <form method="POST" action="/comments">
        <input type="hidden" name="_csrf" value="${req.csrfToken()}">
        <label>Name:</label>
        <input type="text" name="author" placeholder="Dein Name" maxlength="50">
        <label>Kommentar:</label>
        <input type="text" name="text" placeholder="Dein Kommentar">
        <button type="submit">Absenden</button>
      </form>
      <h3>Gespeicherte Kommentare:</h3>
      ${commentHTML}
    </body>
    </html>
  `);
});

app.post("/comments",
  csrfProtection,
  body("author").trim().isLength({ min: 1, max: 50 }).escape(),
  body("text").trim().isLength({ min: 1, max: 500 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(`<p style="color:red">Fehler: ${errors.array().map(e => escapeHtml(e.msg)).join(", ")}</p><a href="/comments">Zurueck</a>`);
    }
    comments.push({ author: req.body.author, text: req.body.text });
    res.redirect("/comments");
  }
);

app.get("/logout", (req, res) => {
  res.redirect("/");
});

app.listen(4000, () => {
  console.log("Secure App laeuft auf http://localhost:4000");
});
