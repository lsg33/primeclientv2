export { };

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fs = require("fs");
import path from 'path';
import logger from './utilities/structs/log';
const rateLimit = require("express-rate-limit");
import jwt from 'jsonwebtoken';
import error from "./utilities/structs/error";
import functions from "./utilities/structs/functions";
import kv from './utilities/kv';
import log from './utilities/structs/log';
import Safety from './utilities/safety';
import update from './utilities/update';
import Shop from './utilities/shop';
import { Cron } from "croner";

if(Safety.env.SHOP_API_KEY !== "") {
    Shop.testKey();
    log.backend("Starting shop cron")
    const shopCron = Cron('0 0 * * *', () => {
        console.log("Updating shop");
        Shop.updateShop();
    });    
}

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json")).toString());

async function main() {

    await Safety.airbag();

    try {
        await update.checkForUpdate(packageJson.version);
    } catch (err) {
        log.error("Failed to check for updates");
    }

    global.JWT_SECRET = functions.MakeID();
    const PORT = Safety.env.PORT;

    let redisTokens: any;
    let tokens: any;

    if (Safety.env.USE_REDIS == true) {
        redisTokens = await kv.get('tokens');
        try {
            tokens = JSON.parse(redisTokens);
        } catch (err) {
            await kv.set('tokens', fs.readFileSync(path.join(__dirname, "../tokens.json")).toString());
            log.error("Redis tokens error, resetting tokens.json");
        }
    } else {
        tokens = JSON.parse(fs.readFileSync(path.join(__dirname, "../tokens.json")).toString());
    }

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
    }

    if (!tokens || !tokens.accessTokens) {
        console.log("No access tokens found, resetting tokens.json");
        await kv.set('tokens', fs.readFileSync(path.join(__dirname, "../tokens.json")).toString());
        tokens = JSON.parse(fs.readFileSync(path.join(__dirname, "../tokens.json")).toString());
    }

    global.accessTokens = tokens.accessTokens;
    global.refreshTokens = tokens.refreshTokens;
    global.clientTokens = tokens.clientTokens;
    global.smartXMPP = false;

    global.exchangeCodes = [];

        mongoose.set("strictQuery", true);

        mongoose
            .connect(Safety.env.MONGO_URI)
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

    app.get("/", (req, res) => {

        res.status(200).json({
            status: "ok",
            version: packageJson.version,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            cpuUsage: process.cpuUsage(),
            environment: process.env.NODE_ENV,
        });

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
        require("./xmpp/xmpp");
        require("./bot/index");
    }).on("error", async (err) => {
        if (err.code == "EADDRINUSE") {
            logger.error(`Port ${PORT} is already in use!\nClosing in 3 seconds...`);
            await functions.sleep(3000)
            process.exit(0);
        } else throw err;
    });

    const loggedUrls = new Set<string>();

    app.use((req, res, next) => {
        const url = req.originalUrl;
        if (loggedUrls.has(url)) {
            return next();
        }

        logger.debug(`Missing endpoint: ${req.method} ${url} request port ${req.socket.localPort}`);

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