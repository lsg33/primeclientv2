import log from "../utilities/structs/log";
import safety from "../utilities/safety";

export { };

const express = require("express");
const app = express.Router();
const { verifyApikey } = require("../utilities/api.js");
const Profile = require("../model/profiles.js");

app.get("/api/profile/accountId/:value", verifyApikey, (req, res) => {

    const { value } = req.params;

    const query = {};
    query["accountId"] = value;

    let profile = null as any;

    if (safety.env.DATABASE === "mongodb") {
        Profile.findOne(query, { password: 0, _id: 0 }, (err, profile) => {
            if (err) return res.status(500).json({ error: "Internal server error" });
            if (!profile) return res.status(404).json({ error: "Profile not found" });
            profile = profile;
        });
    } else {
        log.warn("This database is not supported yet! Stay tuned");
    }


    res.status(200).json(profile);
});

module.exports = app;
