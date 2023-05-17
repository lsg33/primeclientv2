import path from "path";
import log from "../structs/log";
import { Bool } from "aws-sdk/clients/clouddirectory";

const dotenv = require("dotenv");
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

interface iEnv {
    MONGO_URI: string | undefined;
    USE_S3: Bool | undefined;
    S3_BUCKET_NAME: string | undefined;
    S3_ENDPOINT: string | undefined;
    S3_ACCESS_KEY_ID: string | undefined;
    S3_SECRET_ACCESS_KEY: string | undefined;
    BOT_TOKEN: string | undefined;
    CLIENT_ID: string | undefined;
    GUILD_ID: string | undefined;
    GLOBALCHATENABLED: Bool | undefined;
    NAME: string | undefined;
    USE_REDIS: Bool | undefined;
    REDIS_TOKEN: string | undefined;
    REDIS_URL: string | undefined;
}

export class safety {

    private convertToBool(value: boolean | any, key: string): Bool {
        if (value.toString() === "true") {
            return true;
        } else if (value.toString() === "false") {
            return false;
        } else {
            throw new Error(`The enviroment variable ${key} is not true or false, please declare it correctly in the .env file. Value: ${value}`);
        }
    };

    public env: iEnv = {
        MONGO_URI: process.env.MONGO_URI,
        USE_S3: this.convertToBool(process.env.USE_S3 || false, "USE_S3"),
        S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
        S3_ENDPOINT: process.env.S3_ENDPOINT,
        S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
        S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
        BOT_TOKEN: process.env.BOT_TOKEN,
        CLIENT_ID: process.env.CLIENT_ID,
        GUILD_ID: process.env.GUILD_ID,
        GLOBALCHATENABLED:  this.convertToBool(process.env.GLOBALCHATENABLED || "false", "GLOBALCHATENABLED"),
        NAME: process.env.NAME,
        USE_REDIS: this.convertToBool(process.env.USE_REDIS || false, "USE_REDIS"),
        REDIS_TOKEN: process.env.REDIS_TOKEN,
        REDIS_URL: process.env.REDIS_URL,
    }

    public checkENV(): Bool {

        for (const [key, value] of Object.entries(this.env)) {
            if (value === undefined) {
                throw new TypeError(`The enviroment variable ${key} is missing, please declare it in the .env file`);
            }
            return true;
        }
        return false;
    }
}

export default new safety;