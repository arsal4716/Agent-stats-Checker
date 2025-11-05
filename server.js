const express = require("express");
const axios = require("axios");
const XLSX = require("xlsx");
const path = require("path");

const app = express();
const PORT = 6001;

let statsData = [];

const hcBase = "https://hcs.tldcrm.com/api/vendor/ping/27053/bc3e5083362ca17336ce23b73b7793c1";
const lmBase = "https://lm360.tldcrm.com/api/public/dialer/ready";

const hcNumbers = [
  { state: "MO", phone: "16602518046" },
  { state: "AZ", phone: "15204064418" },
  { state: "SC", phone: "18036650720" },
  { state: "TX", phone: "14696615905" },
  { state: "IN", phone: "15743033814" },
  { state: "OH", phone: "14192036465" },
  { state: "AL", phone: "12562956109" },
  { state: "NE", phone: "15312191819" },
  { state: "MS", phone: "16629139355" },
  { state: "LA", phone: "13186088211" },
  { state: "TN", phone: "16153880180" },
  { state: "OK", phone: "15806705140" },
];

const lmNumbers = [
  { state: "TX", phone: "12108606652" },
  { state: "TN", phone: "18658983761" },
  { state: "MS", phone: "16623367555" },
  { state: "FL", phone: "13529421278" },
  { state: "LA", phone: "12252262995" },
  { state: "SC", phone: "18436245103" },
  { state: "MI", phone: "13135766764" },
  { state: "OK", phone: "15807402987" },
];

app.get("/refresh", async (req, res) => {
  const type = req.query.type || "hc";
  const list = type === "lm" ? lmNumbers : hcNumbers;
  const results = [];

  for (const entry of list) {
    try {
      if (type === "lm") {
        const apiRes = await axios.get(`${lmBase}/${entry.phone}?ava=1&ing=SRI_&sta=true&adg=true&cnt=true&act=true&rsn=true`);
        results.push({
          state: entry.state,
          phone: entry.phone,
          ready: apiRes.data.ready,
          active: apiRes.data.active,
          reason: apiRes.data.reason,
          cause: apiRes.data.cause,
        });
      } else {
        const apiRes = await axios.get(`${hcBase}/${entry.phone}`);
        results.push({
          state: entry.state,
          phone: entry.phone,
          ready: apiRes.data.ready,
          active: apiRes.data.active,
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

  const filename = type === "lm" ? "lm360_results.xlsx" : "healthconnect_results.xlsx";
  const filePath = path.join(__dirname, filename);

  XLSX.writeFile(workbook, filePath);
  res.download(filePath);
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => console.log(`Server running http://localhost:${PORT}`));
