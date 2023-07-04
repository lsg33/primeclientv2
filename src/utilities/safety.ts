import path from "path";
import log from "./structs/log";
import fs from "fs";
import dotenv from "dotenv";
import crypto from "crypto";
import kv from "./kv";
import Loopkey from ".././utilities/loopkey";

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface iEnv {
    MONGO_URI: string;
    BOT_TOKEN: string;
    CLIENT_ID: string;
    GUILD_ID: string;
    NAME: string;
    PORT: number;
    GAME_SERVERS: string[];
    ALLOW_REBOOT: boolean;
    MATCHMAKER_IP: string;
    LINK_SECRET: string;
    MAIN_SEASON: number;
    USE_S3: boolean;
    S3_BUCKET_NAME: string;
    S3_ENDPOINT: string;
    S3_ACCESS_KEY_ID: string;
    S3_SECRET_ACCESS_KEY: string;
    USE_REDIS: boolean;
    REDIS_URL: string;
}

interface iModules {
    [key: string]: boolean;
}

export class Safety {
    private convertToBool(value: string | undefined | boolean, key: string): boolean {
        if (value === "true") {
            return true;
        } else if (value === "false") {
            return false;
        } else {
            throw new Error(`The environment variable ${key} is not true or false, please declare it correctly in the .env file. Value: ${value}`);
        }
    }

    private isDevFunction(): boolean {
        return process.env.USERENVIROMENT === "development";
    }

    public isDev: boolean = this.isDevFunction();

    public isDocker(): boolean {
        return process.env.DOCKER === "true";
    }

    public env: iEnv = {
        MONGO_URI: process.env.MONGO_URI as string,
        BOT_TOKEN: process.env.BOT_TOKEN as string,
        CLIENT_ID: process.env.CLIENT_ID as string,
        GUILD_ID: process.env.GUILD_ID as string,
        NAME: process.env.NAME as string,
        PORT: parseInt(process.env.PORT as string),
        GAME_SERVERS: process.env.GAME_SERVERS?.split("_") as string[],
        ALLOW_REBOOT: this.convertToBool(process.env.ALLOW_REBOOT, "ALLOW_REBOOT"),
        MATCHMAKER_IP: process.env.MATCHMAKER_IP as string,
        LINK_SECRET: process.env.LINK_SECRET as string,
        MAIN_SEASON: parseInt(process.env.MAIN_SEASON as string),
        USE_S3: this.convertToBool(process.env.USE_S3, "USE_S3"),
        S3_BUCKET_NAME: process.env.S3_BUCKET_NAME as string,
        S3_ENDPOINT: process.env.S3_ENDPOINT as string,
        S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID as string,
        S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY as string,
        USE_REDIS: this.convertToBool(process.env.USE_REDIS, "USE_REDIS"),
        REDIS_URL: process.env.REDIS_URL as string,
    };

    public modules: iModules = {
        Shop: false,
        Matchmaking: false,
    }

    public async registerLoopKey(): Promise<boolean> {

        const registration = await fetch("http://api.nexusfn.net/api/v2/loopkey/register", {
            method: 'PUT',
            headers: {
                "loopkey": await this.getLoopKey()
            }
        }).then(res => res.json())

        if (registration.status !== "ok") {
            if(registration.error === "Loopkey already registered") {
                log.debug("Loopkey already registered. Continuing...");
                return true;
            }
            return false;
        } else {
            log.warn("Loopkey registration successful. Please restart the backend.");
            process.exit(0);
            return true;
        }

    }

    public async getLoopKey(): Promise<string> {

        const loopKeyPath = path.resolve(__dirname, "../../state/loopkey.json");

        try {
            if (!fs.existsSync(path.resolve(loopKeyPath))) {
                const loopKey = await Loopkey.generateLoopKey(this.env.BOT_TOKEN)
                fs.writeFileSync(path.resolve(__dirname, "../../state/loopkey.json"), JSON.stringify({
                    "loopkey": loopKey
                }));
                this.registerLoopKey();
                return loopKey;
            } else {
                const loopKey = JSON.parse(fs.readFileSync(path.resolve(loopKeyPath), "utf-8")).loopkey;
                if (loopKey === undefined || loopKey === null || loopKey === "") {
                    const loopKey = await Loopkey.generateLoopKey(this.env.BOT_TOKEN)
                    fs.writeFileSync(path.resolve(loopKeyPath), JSON.stringify({
                        "loopkey": loopKey
                    }));
                    this.registerLoopKey();
                }
                return loopKey;
            }
        } catch (error) {
            const loopKey = await Loopkey.generateLoopKey(this.env.BOT_TOKEN)
            fs.writeFileSync(path.resolve(__dirname, "../../state/loopkey.json"), JSON.stringify({
                "loopkey": loopKey
            }));
            this.registerLoopKey();
            return loopKey;
        }
    }

    public async airbag(): Promise<boolean> {

        try {
            const fileBuffer = fs.readFileSync(path.join(__dirname, '../../responses/contentpages.json'));
            const hashSum = crypto.createHash('sha256');
            hashSum.update(fileBuffer);
            const sha256 = hashSum.digest('hex');

            if (sha256 !== "487d56b51a3f4b4287cb692916d039b1e8fc4b1d5cb942cc2c8e86f5284f51b1") {
                await fetch("https://raw.githubusercontent.com/Nexus-FN/Momentum/main/responses/contentpages.json")
                    .then(res => res.json())
                    .then(json => {
                        fs.writeFileSync(path.join(__dirname, '../../responses/contentpages.json'), JSON.stringify(json));
                    });
            }
        } catch (e: any) {
            console.log("An error occured, but the program will continue.");
        }

        if (parseInt(process.version.slice(1)) < 18) {
            throw new Error(`Your node version is too old, please update to at least 18. Your version: ${process.version}`);
        }

        if (this.env.USE_REDIS) {
            let redisstate = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../state/redis.json"), "utf-8"));
            if (!redisstate.knownUrls.includes(this.env.REDIS_URL)) {
                redisstate.knownUrls.push(this.env.REDIS_URL);
                fs.writeFileSync(path.resolve(__dirname, "../../state/redis.json"), JSON.stringify(redisstate));
                log.debug("Redis URL is not known, adding to known URLs.");
                await kv.set("tokens", JSON.stringify({
                    "accessTokens": [],
                    "refreshTokens": [],
                    "clientTokens": []
                })
                );
            } else {
                log.debug("Redis URL is already known, skipping.");
            }
        }

        try {
            JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../tokens.json"), "utf-8"));
        } catch (e) {
            fs.writeFileSync(path.resolve(__dirname, "../../tokens.json"), JSON.stringify({
                "accessTokens": [],
                "refreshTokens": [],
                "clientTokens": []
            }));
        }

        let missingVariables: string[] = [];

        for (const [key, value] of Object.entries(this.env)) {
            if (value === undefined) {
                if (key == "CLIENT_ID" || key == "GUILD_ID") {
                    continue;
                } else {
                    missingVariables.push(key);
                }
            }
            if (key === "NAME") {
                if (typeof value === "string" && value.length > 16) {
                    throw new TypeError(`The environment variable ${key} is too long, please declare it in the .env file.`);
                } else {
                    this.env[key] = typeof value === "string" ? value.replace(/ /g, "_") : value;
                }
            }
        }

        if (missingVariables.length > 0) {
            throw new TypeError(`The environment ${missingVariables.length > 1 ? "variables" : "variable"} ${missingVariables.join(", ")} ${missingVariables.length > 1 ? "are" : "is"} missing, please declare ${missingVariables.length > 1 ? "them" : "it"} in the .env file.`);
        }

        return true;
    }
}

export default new Safety();
