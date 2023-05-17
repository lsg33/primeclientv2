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
import kv from './utilities/kv';
import log from './structs/log';

async function main() {

    if (!fs.existsSync("./ClientSettings")) fs.mkdirSync("./ClientSettings");

    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json")).toString());
    global.version = packageJson.version;

    global.JWT_SECRET = functions.MakeID();
    const PORT = 8080;

    let redisTokens;
    let tokens;

    //Cannot use MemoryKV for this because it doesnt stay after restart
    if (process.env.USE_REDIS === "true") {
        redisTokens = await kv.get('tokens') || {};
        logger.debug("Redis tokens");
        try {
            tokens = JSON.parse(JSON.stringify(redisTokens))
        } catch(err) {
            await kv.set('tokens', fs.readFileSync(path.join(__dirname, "../tokens.json")).toString());
            log.error("Redis tokens error, resetting tokens.json");
        }
    } else {
        logger.debug("File tokens");
        tokens = JSON.parse(fs.readFileSync(path.join(__dirname, "../tokens.json")).toString());
    };

    for (let tokenType in tokens) {
        for (let tokenIndex in tokens[tokenType]) {
            let decodedToken = jwt.decode(tokens[tokenType][tokenIndex].token.replace("eg1~", ""));

            if (DateAddHours(new Date(decodedToken.creation_date), decodedToken.hours_expire).getTime() <= new Date().getTime()) {
                tokens[tokenType].splice(Number(tokenIndex), 1);
            }
        }
    }

    let setTokens: Boolean = false;

    logger.debug("Use Redis: " + process.env.USE_REDIS);

    //Cannot use MemoryKV for this because it doesnt stay after restart
    if (process.env.USE_REDIS === "true") {
        logger.debug("Redis set tokens");
        setTokens = await kv.set('tokens', JSON.stringify(tokens, null, 2));
    } else {
        logger.debug("File set tokens");
        fs.writeFileSync(path.join(__dirname, "../tokens.json"), JSON.stringify(tokens, null, 2) || "");
    };
    logger.debug("Redis set tokens status: " + setTokens);

    global.accessTokens = tokens.accessTokens;
    global.refreshTokens = tokens.refreshTokens;
    global.clientTokens = tokens.clientTokens;

    global.exchangeCodes = [];

    mongoose
        .connect(process.env.MONGO_URI)
        .then(() => {
            logger.backend("Connected to MongoDB");
        })
        .catch((error) => {
            console.error("Error connecting to MongoDB: ", error);
        });

    mongoose.connection.on("error", (err) => {
        logger.error(
            "MongoDB failed to connect, please make sure you have MongoDB installed and running."
        );
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