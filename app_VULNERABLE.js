const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const users = [
  { id: 1, username: "admin", password: "geheim123" },
  { id: 2, username: "max", password: "passwort" },
  { id: 3, username: "lisa", password: "qwerty" },
];

let comments = [
  { author: "max", text: "Schoene Seite!" },
];

function checkLogin(username, password) {
  console.log("Query: SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'");

  if (username.includes("'--") || username.includes("' OR") || username.includes("' or")) {
    let name = username.split("'")[0];
    return users.find(u => u.username === name) || users[0];
  }
  if (password.includes("' OR '1'='1") || password.includes("' or '1'='1")) {
    return users[0];
  }

  return users.find(u => u.username === username && u.password === password);
}

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Vulnerable App</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; background: #fff0f0; }
        h1 { color: #cc0000; }
        .nav a { margin-right: 15px; color: #cc0000; }
        .box { border: 1px solid #cc0000; padding: 15px; margin: 10px 0; background: white; border-radius: 5px; }
        .code { background: #f5f5f5; padding: 8px; font-family: monospace; font-size: 13px; margin: 5px 0; border-left: 3px solid #cc0000; }
        .warnung { background: #ffeeee; border: 2px solid #cc0000; padding: 10px; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <h1>Vulnerable Web App</h1>
      <div class="warnung">
        <strong>ACHTUNG:</strong> Diese App ist absichtlich unsicher (nur fuer Demo-Zwecke)
      </div>
      <div class="nav">
        <a href="/">Home</a>
        <a href="/login">Login</a>
        <a href="/comments">Kommentare</a>
      </div>
      <hr>
      <div class="box">
        <h3>1. SQL Injection - Login ausprobieren</h3>
        <p>Gib das als Username ein:</p>
        <div class="code">admin'--</div>
        <div class="code">' OR '1'='1</div>
        <p>Das Passwort wird einfach ignoriert!</p>
        <p><a href="/login">--> zur Login Seite</a></p>
      </div>
      <div class="box">
        <h3>2. XSS Angriff - Kommentare</h3>
        <p>Schreib das als Kommentar:</p>
        <div class="code">&lt;script&gt;alert('XSS!')&lt;/script&gt;</div>
        <div class="code">&lt;img src=x onerror="alert(document.cookie)"&gt;</div>
        <p>Der JavaScript Code wird ausgefuehrt!</p>
        <p><a href="/comments">--> zur Kommentar Seite</a></p>
      </div>
    </body>
    </html>
  `);
});

app.get("/login", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Login</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; background: #fff0f0; }
        input { display: block; margin: 5px 0 15px 0; padding: 8px; width: 250px; }
        button { background: #cc0000; color: white; padding: 8px 20px; border: none; cursor: pointer; }
        .nav a { margin-right: 15px; color: #cc0000; }
        .tipp { background: #ffeeee; padding: 10px; margin: 10px 0; font-size: 13px; border-left: 3px solid red; }
        .code { font-family: monospace; background: #f5f5f5; padding: 5px; }
      </style>
    </head>
    <body>
      <div class="nav"><a href="/">Home</a> <a href="/login">Login</a> <a href="/comments">Kommentare</a></div>
      <h2>Login</h2>
      <div class="tipp">
        Tipp: Username <span class="code">admin'--</span> eingeben (Passwort egal)
      </div>
      <form method="POST" action="/login">
        <label>Username:</label>
        <input type="text" name="username" placeholder="z.B. admin'--">
        <label>Passwort:</label>
        <input type="password" name="password" placeholder="beliebig">
        <button type="submit">Einloggen</button>
      </form>
    </body>
    </html>
  `);
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const user = checkLogin(username, password);
  const sqlQuery = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'";

  if (user) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Login erfolgreich</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; background: #fff0f0; }
          .nav a { margin-right: 15px; color: #cc0000; }
          .erfolg { color: green; }
          .code { background: #f5f5f5; padding: 8px; font-family: monospace; font-size: 13px; margin: 5px 0; word-break: break-all; }
          .gefaehrlich { color: red; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="nav"><a href="/">Home</a> <a href="/login">Login</a> <a href="/comments">Kommentare</a></div>
        <h2 class="erfolg">Login erfolgreich!</h2>
        <p>Willkommen: <strong>${username}</strong></p>
        <p>Eingeloggter User in DB: ${user.username} (ID: ${user.id})</p>
        <br>
        <p><strong>Ausgefuehrter SQL Query:</strong></p>
        <div class="code">${sqlQuery}</div>
        ${username.includes("'--") ? '<p class="gefaehrlich">SQL Injection hat funktioniert! Das Passwort wurde uebergangen.</p>' : ""}
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
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; background: #fff0f0; }
          .nav a { margin-right: 15px; color: #cc0000; }
          .code { background: #f5f5f5; padding: 8px; font-family: monospace; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="nav"><a href="/">Home</a> <a href="/login">Login</a> <a href="/comments">Kommentare</a></div>
        <h2 style="color:red">Login fehlgeschlagen</h2>
        <p>Falscher Username oder Passwort</p>
        <p><strong>Query war:</strong></p>
        <div class="code">${sqlQuery}</div>
        <br><a href="/login">Zurueck</a>
      </body>
      </html>
    `);
  }
});

app.get("/comments", (req, res) => {
  let commentHTML = "";
  for (let i = 0; i < comments.length; i++) {
    commentHTML += `
      <div style="border-left: 3px solid #cc0000; padding: 8px; margin: 8px 0; background: white;">
        <small style="color: #888">${comments[i].author} schreibt:</small><br>
        ${comments[i].text}
      </div>
    `;
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Kommentare</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; background: #fff0f0; }
        input { display: block; margin: 5px 0 15px 0; padding: 8px; width: 300px; }
        button { background: #cc0000; color: white; padding: 8px 20px; border: none; cursor: pointer; }
        .nav a { margin-right: 15px; color: #cc0000; }
        .tipp { background: #ffeeee; padding: 10px; margin: 10px 0; font-size: 13px; border-left: 3px solid red; }
        .code { font-family: monospace; background: #f5f5f5; padding: 3px 6px; }
      </style>
    </head>
    <body>
      <div class="nav"><a href="/">Home</a> <a href="/login">Login</a> <a href="/comments">Kommentare</a></div>
      <h2>Kommentare</h2>
      <div class="tipp">
        Tipp: <span class="code">&lt;script&gt;alert('XSS!')&lt;/script&gt;</span> als Kommentar eingeben
      </div>
      <form method="POST" action="/comments">
        <label>Name:</label>
        <input type="text" name="author" placeholder="Dein Name">
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

app.post("/comments", (req, res) => {
  const author = req.body.author;
  const text = req.body.text;
  comments.push({ author: author, text: text });
  res.redirect("/comments");
});

app.get("/logout", (req, res) => {
  res.redirect("/");
});

app.listen(3000, () => {
  console.log("Vulnerable App laeuft auf http://localhost:3000");
});
