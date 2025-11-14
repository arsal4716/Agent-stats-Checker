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

const hcBase = "https://hcs.tldcrm.com/api/public/dialer/ready/";
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
const prosNumbers = [
  { state: "TN", phone: "16158960000" },
  { state: "TX", phone: "17136810000" },
  { state: "OH", phone: "13305740000" },
  { state: "OK", phone: "14055240000" },
  { state: "AZ", phone: "14808940000" },
  { state: "FL", phone: "14076540000" },
  { state: "MS", phone: "16623280000" },
  { state: "NC", phone: "18286870000" },
  { state: "IA", phone: "13196620000" },
  { state: "LA", phone: "13379840000" },
  { state: "SC", phone: "18032540000" },
  { state: "AL", phone: "13342790000" },
  { state: "AR", phone: "14796310000" },
  { state: "CA", phone: "18056760000" },
  { state: "CO", phone: "17196320000" },
  { state: "CT", phone: "18603460000" },
  { state: "DE", phone: "13026550000" },
  { state: "DC", phone: "12025370000" },
  { state: "GA", phone: "17702220000" },
  { state: "ID", phone: "12087730000" },
  { state: "IL", phone: "12172330000" },
  { state: "IN", phone: "13177690000" },
  { state: "KS", phone: "17854250000" },
  { state: "KY", phone: "18592690000" },
  { state: "MD", phone: "14102570000" },
  { state: "MO", phone: "18888430000" },
  { state: "NE", phone: "14026710000" },
  { state: "NV", phone: "17026480000" },
  { state: "NH", phone: "16038820000" },
  { state: "NJ", phone: "12014400000" },
  { state: "NM", phone: "15754370000" },
  { state: "NY", phone: "17188490000" },
  { state: "ND", phone: "17017510000" },
  { state: "OR", phone: "15034720000" },
  { state: "PA", phone: "12157230000" },
  { state: "RI", phone: "14017620000" },
  { state: "SD", phone: "16059960000" },
  { state: "UT", phone: "18019640000" },
  { state: "WV", phone: "13042520000" },
  { state: "WI", phone: "12627860000" },
  { state: "WY", phone: "13077540000" },
];

app.get("/refresh", async (req, res) => {
  const type = req.query.type || "hc";
  let list =
    type === "lm" ? lmNumbers : type === "pros" ? prosNumbers : hcNumbers;

  const results = [];

  if (type === "pros") {
    for (const entry of list) {
      try {
        const apiRes = await axios.get(
          `https://pros.tldcrm.com/api/vendor/ping/31769/ba6cffba7c40fef6eb56846046452913/${entry.phone}`
        );

        let ready = Number(apiRes.data.ready || 0);
        if (ready === 0) continue;

        results.push({
          state: entry.state,
          phone: entry.phone,
          ready: ready,
          active: ready,
          reason: apiRes.data.reason || "",
          cause: apiRes.data.cause || "",
        });
      } catch (err) {
        results.push({
          state: entry.state,
          phone: entry.phone,
          ready: "ERR",
          active: "ERR",
          reason: "ERR",
          cause: "ERR",
        });
      }
    }

    statsData = results;
    return res.json(results);
  }
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
        return {
          state: entry.state,
          ready: Number(apiRes.data.ready || 0),
          active: Number(apiRes.data.active || 0),
        };
      } catch {
        return { state: entry.state, ready: 0, active: 0 };
      }
    });
    const lmPromises = lmNumbers.map(async (entry) => {
      try {
        const apiRes = await axios.get(
          `${lmBase}/${entry.phone}?ava=1&ing=SRI_&sta=true&adg=true&cnt=true&act=true&rsn=true`
        );
        return {
          state: entry.state,
          ready: Number(apiRes.data.ready || 0),
          active: Number(apiRes.data.active || 0),
        };
      } catch {
        return { state: entry.state, ready: 0, active: 0 };
      }
    });
    const prosPromises = prosNumbers.map(async (entry) => {
      try {
        const apiRes = await axios.get(
          `https://pros.tldcrm.com/api/vendor/ping/31769/ba6cffba7c40fef6eb56846046452913/${entry.phone}`
        );

        const ready = Number(apiRes.data.ready || 0);
        if (ready === 0) return null;
        return {
          state: entry.state,
          ready: ready,
          active: ready,
        };
      } catch {
        return null;
      }
    });

    const allData = await Promise.all([
      ...hcPromises,
      ...lmPromises,
      ...prosPromises,
    ]);
    const filtered = allData.filter((x) => x !== null);
    const combined = {};
    filtered.forEach((entry) => {
      if (!combined[entry.state])
        combined[entry.state] = { state: entry.state, ready: 0, active: 0 };

      combined[entry.state].ready += Number(entry.ready);
      combined[entry.state].active += Number(entry.active);
    });

    const stateData = Object.values(combined).sort(
      (a, b) => b.active - a.active
    );
    const totalCombined = {
      ready: stateData.reduce((sum, s) => sum + s.ready, 0),
      active: stateData.reduce((sum, s) => sum + s.active, 0),
    };

    res.json({ stateData, totalCombined });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch combined agent data" });
  }
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
