const express = require("express");
const axios = require("axios");
const XLSX = require("xlsx");
const path = require("path");
const session = require("express-session");

const app = express();
const PORT = 6001;

app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "super_secret_key_123",
    resave: false,
    saveUninitialized: true,
  })
);

const ADMIN_USER = "fsinta@hlgsolutions.net";
const ADMIN_PASS = "HlgAdmin123!@#";

function requireLogin(req, res, next) {
  if (req.session.loggedIn) {
    return next();
  }
  res.redirect("/login");
}

let statsData = [];

const hcBase =
  "https://hcs.tldcrm.com/api/public/dialer/ready/"; 
const lmBase = "https://lm360.tldcrm.com/api/public/dialer/ready";

const hcNumbers = [
  { state: "MO", phone: "16602510000" },
  { state: "AZ", phone: "15204060000" },
  { state: "SC", phone: "18036650000" },
  { state: "TX", phone: "14696610000" },
  { state: "IN", phone: "15743030000" },
  { state: "OH", phone: "14192030000" },
  { state: "AL", phone: "12562950000" },
  { state: "NE", phone: "15312190000" },
  { state: "MS", phone: "16629130000" },
  { state: "LA", phone: "13186080000" },
  { state: "TN", phone: "16153880000" },
  { state: "OK", phone: "15806700000" },
];

const lmNumbers = [
  { state: "TX", phone: "12108600000" },
  { state: "TN", phone: "18658980000" },
  { state: "MS", phone: "16623360000" },
  { state: "FL", phone: "13529420000" },
  { state: "LA", phone: "12252260000" },
  { state: "SC", phone: "18436240000" },
  { state: "MI", phone: "13135760000" },
  { state: "OK", phone: "15807400000" },
];

app.get("/refresh", async (req, res) => {
  const type = req.query.type || "hc";
  const list = type === "lm" ? lmNumbers : hcNumbers;
  const results = [];

  for (const entry of list) {
    try {
      if (type === "lm") {
        const apiRes = await axios.get(
          `${lmBase}/${entry.phone}?ava=1&ing=SRI_&sta=true&adg=true&cnt=true&act=true&rsn=true`
        );

        results.push({
          state: entry.state,
          phone: entry.phone,
          ready: apiRes.data.ready,
          active: apiRes.data.active,
          reason: apiRes.data.reason,
          cause: apiRes.data.cause,
        });
      } else {
        const apiRes = await axios.get(
          `${hcBase}${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`
        );

        results.push({
          state: entry.state,
          phone: entry.phone,
          ready: apiRes.data.ready,
          active: apiRes.data.active,
          reason: apiRes.data.reason,
          cause: apiRes.data.cause,
        });
      }
    } catch (err) {
      results.push({
        state: entry.state,
        phone: entry.phone,
        ready: "ERR",
        active: "ERR",
        reason: type === "lm" ? "ERR" : undefined,
        cause: type === "lm" ? "ERR" : undefined,
      });
    }
  }

  statsData = results;
  res.json(statsData);
});
app.get("/download", (req, res) => {
  const type = req.query.type || "hc";
  const worksheet = XLSX.utils.json_to_sheet(statsData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

  const filename =
    type === "lm" ? "lm360_results.xlsx" : "healthconnect_results.xlsx";
  const filePath = path.join(__dirname, filename);

  XLSX.writeFile(workbook, filePath);
  res.download(filePath);
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.loggedIn = true;
    return res.redirect("/admin");
  }
  res.send("<h3>Invalid credentials! <a href='/login'>Try again</a></h3>");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});
let publisherData = [];

app.get("/publisher", (req, res) => {
  res.sendFile(path.join(__dirname, "publisher.html"));
});

app.get("/publisher/refresh", async (req, res) => {
  try {
    const hcPromises = hcNumbers.map(async (entry) => {
      try {
        const apiRes = await axios.get(
          `${hcBase}${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`
        );
        return { state: entry.state, ready: apiRes.data.ready, active: apiRes.data.active };
      } catch {
        return { state: entry.state, ready: 0, active: 0 };
      }
    });

    const lmPromises = lmNumbers.map(async (entry) => {
      try {
        const apiRes = await axios.get(
          `${lmBase}/${entry.phone}?ava=1&ing=SRI_&sta=true&adg=true&cnt=true&act=true&rsn=true`
        );
        return { state: entry.state, ready: apiRes.data.ready, active: apiRes.data.active };
      } catch {
        return { state: entry.state, ready: 0, active: 0 };
      }
    });

    const allData = await Promise.all([...hcPromises, ...lmPromises]);

    // Combine by state
    const combined = {};
    allData.forEach((entry) => {
      if (!combined[entry.state]) combined[entry.state] = { state: entry.state, ready: 0, active: 0 };
      combined[entry.state].ready += Number(entry.ready);
      combined[entry.state].active += Number(entry.active);
    });

    publisherData = Object.values(combined).sort((a, b) => b.active - a.active);

    res.json(publisherData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch combined agent data" });
  }
});

app.get("/publisher/download", (req, res) => {
  const worksheet = XLSX.utils.json_to_sheet(publisherData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

  const filename = "ACA_SCRUB_results.xlsx";
  const filePath = path.join(__dirname, filename);
  XLSX.writeFile(workbook, filePath);
  res.download(filePath);
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/admin", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.listen(PORT, () => console.log(`Server running http://localhost:${PORT}`));
