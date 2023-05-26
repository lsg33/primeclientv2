import path from "path";
import log from "../structs/log";
import fs from "fs";
import dotenv from "dotenv";
import crypto from "crypto";
import unfähig from "./unfähig";

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

type iDatabase = "mongodb" | "postgres";

interface iEnv {
    MONGO_URI: string;
    PSG_DATABASE_URL: string
    DATABASE: iDatabase;
    BOT_TOKEN: string;
    CLIENT_ID: string;
    GUILD_ID: string;
    NAME: string;
    PORT: number;
    GAME_SERVERS: string[];
    ALLOW_REBOOT: boolean;
    MATCHMAKER_IP: string;
    USE_S3: boolean;
    S3_BUCKET_NAME: string;
    S3_ENDPOINT: string;
    S3_ACCESS_KEY_ID: string;
    S3_SECRET_ACCESS_KEY: string;
    USE_REDIS: boolean;
    REDIS_TOKEN: string;
    REDIS_URL: string;
}

export class safety {
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
        PSG_DATABASE_URL: process.env.PSG_DATABASE_URL as string,
        DATABASE: process.env.DATABASE as iDatabase,
        BOT_TOKEN: process.env.BOT_TOKEN as string,
        CLIENT_ID: process.env.CLIENT_ID as string,
        GUILD_ID: process.env.GUILD_ID as string,
        NAME: process.env.NAME as string,
        PORT: parseInt(process.env.PORT as string),
        GAME_SERVERS: process.env.GAME_SERVERS?.split("_") as string[],
        ALLOW_REBOOT: this.convertToBool(process.env.ALLOW_REBOOT, "ALLOW_REBOOT"),
        MATCHMAKER_IP: process.env.MATCHMAKER_IP as string,
        USE_S3: this.convertToBool(process.env.USE_S3, "USE_S3"),
        S3_BUCKET_NAME: process.env.S3_BUCKET_NAME as string,
        S3_ENDPOINT: process.env.S3_ENDPOINT as string,
        S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID as string,
        S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY as string,
        USE_REDIS: this.convertToBool(process.env.USE_REDIS, "USE_REDIS"),
        REDIS_TOKEN: process.env.REDIS_TOKEN as string,
        REDIS_URL: process.env.REDIS_URL as string,
    };

    public changeEnvValue(key: string, value: string): void {
        this.env[key] = value;
    }

    public async airbag(): Promise<boolean> {

        //this.changeEnvValue("MATCHMAKER_IP", `${await unfähig.getIp()}:80`);

        const fileBuffer = fs.readFileSync(path.join(__dirname, '../../responses/contentpages.json'));
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        const sha256 = hashSum.digest('hex');

        if(sha256 !== "7ce650ab0fc33275ac24e77f1a51d3ba6dad8176a5176821a7041192d3ee8caa") {
            await fetch("https://raw.githubusercontent.com/Nexus-FN/Momentum/main/responses/contentpages.json")
            .then(res => res.json())
            .then(json => {
                fs.writeFileSync(path.join(__dirname, '../../responses/contentpages.json'), JSON.stringify(json));
            });
        }

        if (parseInt(process.version.slice(1)) < 18) {
            throw new Error(`Your node version is too old, please update to at least 18. Your version: ${process.version}`);
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
                if(key == "CLIENT_ID" || key == "GUILD_ID") {
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
            if (key === "USE_REDIS") {
                this.env.USE_REDIS = false;
                log.warn("USE_REDIS has been disabled as using Redis is currently unstable and error prone. Stay tuned for updates.");
            }
            if(key === "DATABASE") {
                if(value !== "mongodb" && value !== "postgres") {
                    throw new TypeError(`The environment variable ${key} is not mongodb or postgres, please declare it in the .env file.`);
                } else if(value === "postgres") {
                    this.env.DATABASE = "mongodb";
                    log.warn("PostgreSQL has been disabled. This feature will be added in the future. Stay tuned for updates.")
                }
            }
        }

        if (missingVariables.length > 0) {
            throw new TypeError(`The environment ${missingVariables.length > 1 ? "variables" : "variable"} ${missingVariables.join(", ")} ${missingVariables.length > 1 ? "are" : "is"} missing, please declare ${missingVariables.length > 1 ? "them" : "it"} in the .env file.`);
        }

        global.env = this.env;
        return true;
    }
}

export default new safety();