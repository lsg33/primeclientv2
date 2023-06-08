export { };

const express = require("express");
const app = express.Router();
import functions from "../utilities/structs/functions";
import fs from "fs";
import path from "path";

app.get("/api/v1/events/Fortnite/download/:accountId", async (req, res) => {
    const events = JSON.parse(fs.readFileSync(path.join(__dirname, "../../responses/eventlistactive.json"), "utf8"));
    res.json(events)

});

app.get("/api/v1/players/Fortnite/tokens", async (req, res) => {
    res.json({})
});

app.get("/api/v1/leaderboards/Fortnite/:eventId/:eventWindowId/:accountId", async (req, res) => {
    res.json({})
});

app.get("/api/v1/events/Fortnite/data/", async (req, res) => {
    res.json({})
});

app.get("/api/v1/events/Fortnite/:eventId/:eventWindowId/history/:accountId", async (req, res) => {
    res.json({})
});

app.get("/api/v1/players/Fortnite/:accountId", async (req, res) => {
    res.json({
        "result": true,
        "region": "ALL",
        "lang": "en",
        "season": "12",
        "events": []
    })
});

module.exports = app;