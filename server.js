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

  let list = [];
  if (type === "lm") list = lmNumbers;
  else if (type === "pros") list = prosNumbers;
  else list = hcNumbers;

  try {
    const results = await Promise.all(
      list.map(async (entry) => {
        try {
          if (type === "lm") {
            const apiRes = await axios.get(
              `${lmBase}/${entry.phone}?ava=1&ing=SRI_&sta=true&adg=true&cnt=true&act=true&rsn=true`
            );
            return {
              state: entry.state,
              phone: entry.phone,
              ready: apiRes.data.ready,
              active: apiRes.data.active,
              reason: apiRes.data.reason,
              cause: apiRes.data.cause,
            };
          } else if (type === "pros") {
            const apiRes = await axios.get(
              `https://pros.tldcrm.com/api/public/dialer/ready/${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`
            );

            console.log("apiRes", apiRes.data);
            const r = Number(apiRes.data.ready || 0);
            if (r === 0) return null;
            return {
              state: entry.state,
              phone: entry.phone,
              ready: apiRes.data.ready,
              active: apiRes.data.active,
              reason: apiRes.data.reason,
              cause: apiRes.data.cause,
            };
          } else {
            const apiRes = await axios.get(
              `${hcBase}${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`
            );
            return {
              state: entry.state,
              phone: entry.phone,
              ready: apiRes.data.ready,
              active: apiRes.data.active,
              reason: apiRes.data.reason,
              cause: apiRes.data.cause,
            };
          }
        } catch (err) {
          return {
            state: entry.state,
            phone: entry.phone,
            ready: "ERR",
            active: "ERR",
            reason: type === "lm" ? "ERR" : "",
            cause: type === "lm" ? "ERR" : "",
          };
        }
      })
    );
    statsData = results.filter((r) => r !== null);
    res.json(statsData);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch data" });
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

        const r = Number(apiRes.data.ready || 0);
        if (r === 0) return null;

        return {
          state: entry.state,
          ready: r,
          active: r,
        };
      } catch {
        return null;
      }
    });

    const hcData = await Promise.all(hcPromises);
    const lmData = await Promise.all(lmPromises);
    const prosRaw = await Promise.all(prosPromises);

    const prosData = prosRaw.filter((x) => x !== null);

    const combined = {};

    [...hcData, ...lmData, ...prosData].forEach((row) => {
      if (!combined[row.state])
        combined[row.state] = { state: row.state, ready: 0, active: 0 };

      combined[row.state].ready += row.ready;
      combined[row.state].active += row.active;
    });

    const stateData = Object.values(combined).sort(
      (a, b) => b.active - a.active
    );

    const [hcMain, lmMain, prosMain] = await Promise.all([
      axios.get(
        `${hcBase}14696610000?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`
      ),
      axios.get(
        `${lmBase}/2145556666?ava=1&ing=SRI_&sta=true&adg=true&cnt=true&act=true&rsn=true`
      ),
      axios.get(
        `https://pros.tldcrm.com/api/vendor/ping/31769/ba6cffba7c40fef6eb56846046452913/7136818000`
      ),
    ]);

    const prosReady = Number(prosMain.data.ready || 0);

    const totalCombined = {
      hc: hcMain.data,
      lm: lmMain.data,
      pros: {
        ready: prosReady === 0 ? 0 : prosReady,
        active: prosReady === 0 ? 0 : prosReady,
      },
      combined: {
        ready:
          Number(hcMain.data.ready || 0) +
          Number(lmMain.data.ready || 0) +
          (prosReady === 0 ? 0 : prosReady),
        active:
          Number(hcMain.data.active || 0) +
          Number(lmMain.data.active || 0) +
          (prosReady === 0 ? 0 : prosReady),
      },
    };

    res.json({ stateData, totalCombined });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch combined data" });
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
