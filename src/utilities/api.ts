const Api = require("../model/api.js");

async function verifyApikey(req, res, next) {

    const apikey = req.headers["x-api-key"];
    if (!apikey) return res.status(401).json({ error: "No api key provided" });

    Api.findOne({ apikey: apikey }, (err, api) => {
        if (err) return res.status(500).json({ error: "Internal server error" });
        if (!api) return res.status(401).json({ error: "Invalid api key" });

        req.api = api;
        next();
    });

};

export { verifyApikey };