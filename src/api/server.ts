const express = require("express");
const app = express.Router();
const { verifyApikey } = require("../utilities/api.js");
const MMCodes = require("../model/mmcodes");
const Users = require("../model/user");
import Redis from "ioredis";
import safety from "../utilities/safety";

const redis = new Redis(safety.env.REDIS_URL);

app.post("/api/servers/:playlist", verifyApikey, async (req, res) => {

    let playlist = req.params.playlist;

    if (!playlist) return res.status(400).json({ error: "No playlist provided" });

    let status = req.body.status;

    if (!status) return res.status(400).json({ error: "No status provided" });

    if (status === "online") {
        await redis.publish(`${playlist}-status`, "online")
    } else if (status === "offline") {
        await redis.publish(`${playlist}-status`, "offline")
    } else return res.status(400).json({ error: "Invalid status" });

    return res.status(200).json({
        status: status,
        playlist: playlist,
        message: "Successfully updated status"
    });

});

module.exports = app;