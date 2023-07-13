import express from "express";
const app = express();
import mongoose from "mongoose";
import fs from "fs";
import path from 'path';
import logger from './utilities/structs/log.js';
import rateLimit from "express-rate-limit";
import jwt, { JwtPayload } from 'jsonwebtoken';
import error from "./utilities/structs/error.js";
import functions from "./utilities/structs/functions.js";
import kv from './utilities/kv.js';
global.kv = kv;
import Safety from './utilities/safety.js';
global.safety = Safety;
import log from './utilities/structs/log.js';
import update from './utilities/update.js';
import Shop from './utilities/shop.js';
import { Cron } from "croner";
import { client } from './bot/index.js';
import modules from './utilities/modules.js';
import { dirname } from 'dirname-filename-esm'

const __dirname = dirname(import.meta);

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json")).toString());

const updateCron = Cron('0 */30 * * * *', () => {
    console.log("Checking for updates");
    update.checkForUpdate(packageJson.version);
});

global.discordClient = client;

await Safety.airbag();

await client.login(Safety.env.BOT_TOKEN);

const LOOP_KEY = await Safety.getLoopKey();

const availabeModules = await modules.getModules(LOOP_KEY);
if (!availabeModules) log.warn("Failed to get modules. You can ignore this warning if you haven't purchased anything. Are you sure you have a valid loop key or a NexusFN account? For support, join https://discord.gg/NexusFN");

modules.configureModules(availabeModules as string[]);

if (Safety.modules.Shop) {
    log.backend("Shop module enabled");
    const shopCron = Cron('0 0 * * *', () => {
        console.log("Updating shop");
        Shop.updateShop(LOOP_KEY);
    });
} else {
    log.warn("Shop module disabled");
}

try {
    await update.checkForUpdate(packageJson.version);
} catch (err) {
    log.error("Failed to check for updates");
}

global.JWT_SECRET = functions.MakeID();
const PORT = Safety.env.PORT;
global.safetyEnv = Safety.env;
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
        let decodedToken: JwtPayload = jwt.decode(tokens[tokenType][tokenIndex].token.replace("eg1~", "")) as JwtPayload;

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

for(const fileName of fs.readdirSync(path.join(__dirname, "routes"))) {
    if (fileName.includes(".map")) continue;;
    try {
        app.use((await import(`file://${__dirname}/routes/${fileName}`)).default);
    } catch (error) {
        console.log(fileName, error)
    }
}

for(const fileName of fs.readdirSync(path.join(__dirname, "api"))) {
    if (fileName.includes(".map")) continue;
    
    try {
        app.use((await import(`file://${__dirname}/api/${fileName}`)).default);
    } catch (error) {
        console.log(fileName, error)
    }
};

app.listen(PORT, () => {
    logger.backend(`App started listening on port ${PORT}`);
    import("./xmpp/xmpp.js");
}).on("error", async (err) => {
    if (err.message == "EADDRINUSE") {
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