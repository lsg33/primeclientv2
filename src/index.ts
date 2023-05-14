export { };

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fs = require("fs");
import { Redis } from '@upstash/redis'
import path from 'path';
import logger from './structs/log';
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const error = require("./structs/error.js");
const functions = require("./structs/functions.js");
const dotenv = require("dotenv");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
import Momentum from 'momentumsdk'

async function main() {

    if (!fs.existsSync("./ClientSettings")) fs.mkdirSync("./ClientSettings");

    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json")).toString());
    global.version = packageJson.version;

    global.JWT_SECRET = functions.MakeID();
    const PORT = 8080;

    //Leaked my password oops, but I already reset it ;) - I'm using upstash.io for redis
    const redis = new Redis({
        url: 'https://suited-grizzly-30318.upstash.io',
        token: 'AXZuASQgNTBiNzBiY2QtMTFhYS00NjM5LThmMzktOTJhYTE0YjRmYzdiY2Y4MGQyZDBmOWZlNDQ3ZjgzMDQyZjMxZjJlNGVhMGY=',
    })
    //const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, "../tokens.json")).toString());
    if (process.env.NODE_ENV !== "production")
        logger.backend("Current directory: " + __dirname);

    const redisTokens = await redis.get('tokens') || {};
    const tokens = JSON.parse(JSON.stringify(redisTokens))

    for (let tokenType in tokens) {
        for (let tokenIndex in tokens[tokenType]) {
            let decodedToken = jwt.decode(tokens[tokenType][tokenIndex].token.replace("eg1~", ""));

            if (DateAddHours(new Date(decodedToken.creation_date), decodedToken.hours_expire).getTime() <= new Date().getTime()) {
                tokens[tokenType].splice(Number(tokenIndex), 1);
            }
        }
    }

    //fs.writeFileSync(path.join(__dirname, "../tokens.json"), JSON.stringify(tokens, null, 2) || "");
    const setTokens = await redis.set('tokens', JSON.stringify(tokens, null, 2));
    if (process.env.NODE_ENV !== "production")
        logger.backend("Redis set tokens status: " + setTokens);

    global.accessTokens = tokens.accessTokens;
    global.refreshTokens = tokens.refreshTokens;
    global.clientTokens = tokens.clientTokens;

    global.exchangeCodes = [];

    mongoose.connect(process.env.MONGO_URI, () => {
        logger.backend("App successfully connected to MongoDB!");
    });

    mongoose.connection.on("error", err => {
        logger.error("MongoDB failed to connect, please make sure you have MongoDB installed and running.");
        throw err;
    });

app.use(rateLimit({ windowMs: 0.5 * 60 * 1000, max: 45 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

fs.readdirSync(path.join(__dirname, "routes")).forEach((fileName) => {
    if (fileName.includes(".map")) return;
    app.use(require(`./routes/${fileName}`));
});

fs.readdirSync(path.join(__dirname, "api")).forEach((fileName) => {
    if (fileName.includes(".map")) return;
    app.use(require(`./api/${fileName}`));
});

app.listen(PORT, () => {
    logger.backend(`App started listening on port ${PORT}`);

    require("./xmpp/xmpp.js");
    require("./bot/index.js");
}).on("error", async (err) => {
    if (err.code == "EADDRINUSE") {
        logger.error(`Port ${PORT} is already in use!\nClosing in 3 seconds...`);
        await functions.sleep(3000)
        process.exit(0);
    } else throw err;
});

// if endpoint not found, return this error
app.use((req, res, next) => {
    error.createError(
        "errors.com.epicgames.common.not_found",
        "Sorry the resource you were trying to find could not be found",
        undefined, 1004, undefined, 404, res
    );
});

function DateAddHours(pdate, number) {
    let date = pdate;
    date.setHours(date.getHours() + number);

    return date;
}

}

main();