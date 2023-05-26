export { };

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fs = require("fs");
import path from 'path';
import logger from './structs/log';
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const error = require("./structs/error.js");
const functions = require("./structs/functions.js");
import kv from './utilities/kv';
import log from './structs/log';
import safety from './utilities/safety';
import update from './utilities/update';
import process from 'node:process';
import { GeneratedAlways, Kysely } from "kysely"
import { NeonDialect } from "kysely-neon"
import ws from "ws"

interface Database {
    users: UserTable
}

interface UserTable {
    created: Date,
    banned: Boolean,
    discordId: String,
    accountId: String,
    username: String,
    username_lower: String,
    email: String,
    password: String,
    mfa: Boolean,
    gameserver: String
    canCreateCodes: Boolean
    isServer: Boolean
}

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json")).toString());

async function main() {

    await safety.airbag();

    try {
        await update.checkForUpdate(packageJson.version);
    } catch (err) {
        log.error("Failed to check for updates");
    }

    global.JWT_SECRET = functions.MakeID();
    const PORT = safety.env.PORT;

    let redisTokens: any;
    let tokens: any;

    if (safety.env.USE_REDIS == true) {
        redisTokens = JSON.parse(JSON.stringify(await kv.get('tokens')));
        try {
            tokens = JSON.parse(JSON.stringify(redisTokens))
        } catch (err) {
            await kv.set('tokens', fs.readFileSync(path.join(__dirname, "../tokens.json")).toString());
            log.error("Redis tokens error, resetting tokens.json");
        }
    } else {
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

    //Cannot use MemoryKV for this because it doesnt stay after restart
    if (process.env.USE_REDIS?.toString() === "true") {
        logger.debug("REDIS SET TOKENS");
        await kv.set('tokens', JSON.stringify(tokens, null, 2));
    } else {
        logger.debug("File SET TOKENS");
        fs.writeFileSync(path.join(__dirname, "../tokens.json"), JSON.stringify(tokens, null, 2) || "");
    };

    global.accessTokens = tokens.accessTokens;
    global.refreshTokens = tokens.refreshTokens;
    global.clientTokens = tokens.clientTokens;

    global.exchangeCodes = [];

    if (safety.env.DATABASE === "mongodb") {
        mongoose.set("strictQuery", true);

        mongoose
            .connect(safety.env.MONGO_URI)
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
    } else {
        logger.backend("Using PostgreSQL");
    }

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

        require("./xmpp/xmpp");
        require("./bot/index");
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