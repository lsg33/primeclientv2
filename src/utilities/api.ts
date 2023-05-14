const Api = require("../model/api.js");
import { Redis } from "@upstash/redis"
import path from "path";
const dotenv = require("dotenv");
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const redis = new Redis({
    url: 'https://suited-grizzly-30318.upstash.io',
    token: 'AXZuASQgNTBiNzBiY2QtMTFhYS00NjM5LThmMzktOTJhYTE0YjRmYzdiNzRkYTk1MjVjMDRkNDEwNTg0MzY4ZDFiMjdlNWRiNmY=',
})

async function verifyApikey(req, res, next) {

    const apikey = req.headers["x-api-key"];
    if (!apikey) return res.status(401).json({ error: "No api key provided" });

    const cachedApi = await redis.get(apikey);
    if (cachedApi) {
        return next();
    }

    Api.findOne({ apikey: apikey }, (err, api) => {
        if (err) return res.status(500).json({ error: "Internal server error" });
        if (!api) return res.status(401).json({ error: "Invalid api key" });

        redis.set(apikey, JSON.stringify(api));
        next();
    });
};

export { verifyApikey };
