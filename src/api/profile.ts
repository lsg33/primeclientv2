import log from "../utilities/structs/log";
import Safety from "../utilities/safety";

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

        Profile.findOne(query, { password: 0, _id: 0 }, (err, profile) => {
            if (err) return res.status(500).json({ error: "Internal server error" });
            if (!profile) return res.status(404).json({ error: "Profile not found" });
            profile = profile;
        });


    res.status(200).json(profile);
});

app.post("/api/profile/mtx/:accountId", verifyApikey, async (req, res) => {

    const mtxMethod = req.body.operation;
    const mtxAmount = req.body.amount;

    if (isNaN(mtxAmount)) {
        return res.status(400).end();
    }

    const accountId = req.params.accountId;
    const incValue = parseInt(mtxAmount);

    let updateQuery;

    if (mtxMethod === "set") {
        updateQuery = {
            $set: {
                [`profiles.common_core.items.Currency:MtxPurchased.quantity`]: incValue
            }
        };
    } else {
        updateQuery = {
            $inc: {
                [`profiles.common_core.items.Currency:MtxPurchased.quantity`]: mtxMethod === "remove" ? -incValue : incValue
            }
        };
    }

    const result = await Profile.updateOne({ accountId }, updateQuery);

    if (result.modifiedCount === 0) {
        return res.status(400).end();
    }

    res.json({
        status: "ok",
        message: "Amount of currency successfully updated",
        newAmount: incValue,
        result: result
    })
});

module.exports = app;
