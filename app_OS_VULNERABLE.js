const express = require("express");
const { exec } = require("child_process");
const app = express();

app.use(express.urlencoded({ extended: true }));

// HTML-Template für die Demo
function renderPage(body) {
    return `<!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <title>UNSICHER - Command Injection</title>
        <style>
            body { font-family: monospace; background: #1a0000; color: #ffcccc; padding: 20px; }
            .card { background: #2d0000; border: 1px solid #662222; padding: 16px; margin: 10px 0; border-radius: 4px; }
            input { background: #0d0000; border: 1px solid #882222; color: #ffaaaa; padding: 8px; width: 100%; margin: 4px 0 12px; font-family: monospace; }
            button { background: #cc2222; color: white; border: none; padding: 10px 20px; cursor: pointer; font-family: monospace; }
            pre { background: #000; color: #4af74a; padding: 10px; border: 1px solid #22c55e; white-space: pre-wrap; }
        </style>
    </head>
    <body>
        <h1>System-Ping (UNSICHER)</h1>
        ${body}
    </body>
    </html>`;
}

app.get("/", (req, res) => {
    res.send(renderPage(`
        <div class="card">
            <h2>Netzwerk-Ping ausführen</h2>
            <form method="POST" action="/ping">
                <label>IP-Adresse:</label>
                <input type="text" name="ip" value="8.8.8.8">
                <button type="submit">Absenden</button>
            </form>
        </div>
    `));
});

app.post("/ping", (req, res) => {
    const { ip } = req.body;

    //UNSICHER: Direkte Verkettung des Inputs mit dem Befehl
    const isWindows = process.platform === "win32";
    const command = isWindows ? `ping -n 2 ${ip}` : `ping -c 2 ${ip}`;

    exec(command, (error, stdout, stderr) => {
        const output = stdout || stderr || error.message;
        res.send(renderPage(`
            <div class="card">
                <h3>Ausgeführter Befehl:</h3>
                <p style="color: #ff6666;">${command}</p>
                <h3>Terminal-Ausgabe:</h3>
                <pre>${output}</pre>
                <a href="/" style="color:#ff8888"><- Zurück</a>
            </div>
        `));
    });
});

app.listen(3001, () => console.log("Unsichere App läuft auf http://localhost:3001"));