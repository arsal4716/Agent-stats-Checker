const express = require("express");
const axios = require("axios");
const XLSX = require("xlsx");
const path = require("path");

const app = express();
const PORT = 6001;

let statsData = []; 
const baseUrl = "https://hcs.tldcrm.com/api/vendor/ping/27053/bc3e5083362ca17336ce23b73b7793c1";

const numbers = [
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

// Refresh API data
app.get("/refresh", async (req, res) => {
  const results = [];

  for (const entry of numbers) {
    try {
      const resApi = await axios.get(`${baseUrl}/${entry.phone}`);
      results.push({
        state: entry.state,
        phone: entry.phone,
        ready: resApi.data.ready,
        active: resApi.data.active,
      });
    } catch (err) {
      results.push({
        state: entry.state,
        phone: entry.phone,
        ready: "ERR",
        active: "ERR",
      });
    }
  }

  statsData = results;
  res.json(statsData);
});
app.get("/download", (req, res) => {
  const worksheet = XLSX.utils.json_to_sheet(statsData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

  const filePath = path.join(__dirname, "crm_results.xlsx");
  XLSX.writeFile(workbook, filePath);

  res.download(filePath);
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => console.log(`Server running http://localhost:${PORT}`));
