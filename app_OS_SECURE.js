const express = require("express");
const { exec } = require("child_process");
const app = express();

app.use(express.urlencoded({ extended: true }));

function renderPage(body) {
    return `<!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <title>SICHER - Command Injection Schutz</title>
        <style>
            body { font-family: monospace; background: #001a00; color: #ccffcc; padding: 20px; }
            .card { background: #002d00; border: 1px solid #226622; padding: 16px; margin: 10px 0; border-radius: 4px; }
            .error-card { background: #3d0000; border: 2px solid #ff4444; color: #ffcccc; padding: 16px; margin: 10px 0; border-radius: 4px; }
            input { background: #000d00; border: 1px solid #228822; color: #aaffaa; padding: 8px; width: 100%; margin: 4px 0 12px; font-family: monospace; }
            button { background: #22cc22; color: black; font-weight: bold; border: none; padding: 10px 20px; cursor: pointer; font-family: monospace; }
            pre { background: #000; color: #4af74a; padding: 10px; border: 1px solid #22c55e; white-space: pre-wrap; }
        </style>
    </head>
    <body>
        <h1>System-Ping (ABGESICHERT)</h1>
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

    // SCHUTZWALL: Regulärer Ausdruck (Regex) für eine strikte IPv4-Validierung
    // Erlaubt nur Zahlen und Punkte (z.B. 127.0.0.1). Alles andere wird blockiert!
    const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    if (!ipv4Regex.test(ip.trim())) {
        // Wenn die Eingabe KEINE reine IP-Adresse ist, wird die Ausführung blockiert!
        return res.send(renderPage(`
            <div class="error-card">
                <h2>Zugriff verweigert!</h2>
                <p>Möglicher Angriffsversuch erkannt oder ungültiges IP-Format.</p>
                <p>Eingegebener Text: <strong>${ip}</strong></p>
                <a href="/" style="color:#ff8888"><- Zurück</a>
            </div>
        `));
    }

    const isWindows = process.platform === "win32";
    const command = isWindows ? `ping -n 2 ${ip}` : `ping -c 2 ${ip}`;

    exec(command, (error, stdout, stderr) => {
        const output = stdout || stderr || error.message;
        res.send(renderPage(`
            <div class="card">
                <h3>Ausgeführter Befehl (Sicher):</h3>
                <p style="color: #66ff66;">${command}</p>
                <h3>Terminal-Ausgabe:</h3>
                <pre>${output}</pre>
                <a href="/" style="color:#aaffaa"><- Zurück</a>
            </div>
        `));
    });
});

app.listen(3002, () => console.log("Sichere App läuft auf http://localhost:3002"));