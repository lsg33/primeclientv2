export { };

const express = require("express");
const app = express.Router();
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
import S3 from 'aws-sdk/clients/s3';
const limit = require("express-limit").limit;
import os from 'os';
const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const functions = require("../structs/functions.js");
import { AWSError } from 'aws-sdk/lib/error';
import log from '../structs/log';
import safety from './../utilities/safety';

const operatingSystem = os.platform();

let pathToClientSettings: string = "";
if (operatingSystem == "win32") {
    pathToClientSettings = path.join(__dirname, "../ClientSettings");
    if (!fs.existsSync(pathToClientSettings)) {
        log.warn("ClientSettings folder for Windows not found, creating...");
        fs.mkdirSync(pathToClientSettings);
    }
} else if (operatingSystem == "linux") {
    pathToClientSettings = path.join("/etc/momentum/", "Momentum", "ClientSettings");
    if (!fs.existsSync(path.join(pathToClientSettings))) {
        log.warn("ClientSettings folder for Linux not found, creating...");
        fs.mkdirSync(path.join(pathToClientSettings));
        fs.chmodSync('/etc/momentum/settings', 0o700);
        fs.chmodSync(path.join(pathToClientSettings), 0o700);
    }
}

const dotenv = require("dotenv");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

let s3: S3;

if (safety.env.USE_S3 == true) {
    log.debug("USE S3 TRUE");
    s3 = new S3({
        apiVersion: 'latest',
        endpoint: safety.env.S3_ENDPOINT || "",
        credentials: {
            accessKeyId: safety.env.S3_ACCESS_KEY_ID || "",
            secretAccessKey: safety.env.S3_SECRET_ACCESS_KEY || "",
        },
        region: 'auto'
    });
} else {
    log.debug("USE S3 FALSE");
}

//Save settings stuff
app.use((req, res, next) => {
    if (req.originalUrl.toLowerCase().startsWith("/fortnite/api/cloudstorage/user/") && req.method === "PUT") {
        req.rawBody = "";
        req.setEncoding("latin1");

        req.on("data", (chunk) => req.rawBody += chunk);
        req.on("end", () => next());
    }
    else return next();
})

const getCloudFile = async (objectName: string) => {
    try {
        const params: S3.GetObjectRequest = {
            Bucket: safety.env.S3_BUCKET_NAME || "BucketNotSet",
            Key: objectName,
        };
        const data: S3.GetObjectOutput = await s3.getObject(params).promise();
        return data.Body;
    } catch (err: any) {
        if (err.code === "NoSuchKey") {
            // create empty .ini file
            const params: S3.PutObjectRequest = {
                Bucket: safety.env.S3_BUCKET_NAME || "BucketNotSet",
                Key: objectName,
                Body: "",
                ContentType: "text/plain",
            };
            await s3.putObject(params).promise();
            return Buffer.from("");
        }
        throw err;
    }
};

const listCloudFiles = async (prefix: string) => {
    const objectsList: Array<S3.Object> = [];

    const listObjects = (ContinuationToken?: string) => {
        return new Promise((resolve, reject) => {
            const params: S3.ListObjectsV2Request = {
                Bucket: safety.env.S3_BUCKET_NAME || "BucketNotSet",
                Prefix: prefix,
                ContinuationToken: ContinuationToken
            };
            s3.listObjectsV2(params, (err: AWSError, data: S3.ListObjectsV2Output) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    };

    let data: any;
    do {
        data = await listObjects(data?.NextContinuationToken);
        if (data.Contents) {
            objectsList.push(...data.Contents);
        }
    } while (data.IsTruncated);

    return objectsList;
};

const createCloudStorageFolder = async (uid: string) => {
    const folderName = `CloudStorage/${uid}`;
    const params: S3.PutObjectRequest = {
        Bucket: safety.env.S3_BUCKET_NAME || "BucketNotSet",
        Key: `${folderName}/`,
        Body: "",
        ContentType: "application/x-directory",
    };
    await s3.putObject(params).promise();
};

//.Ini Stuff
app.get("/fortnite/api/cloudstorage/system", verifyClient, limit({ max: 5, period: 60 * 1000 }), async (req, res) => {
    if (safety.env.USE_S3 == true) {
        try {
            const uid: string | undefined = safety.env.NAME;
            const folderName = `CloudStorage/${uid}`;

            const folderObjects = await listCloudFiles(`${folderName}/`);
            if (folderObjects.length === 0) {
                await createCloudStorageFolder(uid || "");
            }

            const CloudFiles: Array<Object> = [];

            folderObjects.forEach((object: any) => {
                if (object.Key!.toLowerCase().endsWith(".ini")) {
                    CloudFiles.push({
                        "uniqueFilename": object.Key.split("/").pop(),
                        "filename": object.Key.split("/").pop(),
                        "hash": crypto.createHash('sha1').update("w").digest('hex'),
                        "hash256": crypto.createHash('sha256').update("w").digest('hex'),
                        "length": object.Size,
                        "contentType": "application/octet-stream",
                        "uploaded": new Date(),
                        "storageType": "S3",
                        "storageIds": {},
                        "doNotCache": true
                    });
                }
            });


            const localFiles = fs.readdirSync(path.join(__dirname, "../../", "CloudStorage"));
            localFiles.forEach((file) => {
                const key = `CloudStorage/${safety.env.NAME || ""}/${file}`;
                const object = folderObjects.find(obj => obj.Key === key);
                if (!object) {
                    const fileData = fs.readFileSync(path.join(__dirname, "../../", "CloudStorage", file));
                    const params: S3.PutObjectRequest = {
                        Bucket: safety.env.S3_BUCKET_NAME || "BucketNotSet",
                        Key: key,
                        Body: fileData,
                        ContentType: "application/octet-stream",
                    };
                    s3.putObject(params, (err: AWSError, data: S3.PutObjectOutput) => {
                        if (err) console.error(err);
                    });
                    CloudFiles.push({
                        "uniqueFilename": file,
                        "filename": file,
                        "hash": "",
                        "hash256": "",
                        "length": fileData.length,
                        "contentType": "application/octet-stream",
                        "uploaded": new Date(),
                        "storageType": "S3",
                        "storageIds": {},
                        "doNotCache": true
                    });
                }
            });

            res.json(CloudFiles);
        } catch (err) {
            console.error(err);
            res.status(500).end();
        }
    } else {
        const dir = path.join(__dirname, "../../", "CloudStorage");

        let CloudFiles: Object[] = [];

        fs.readdirSync(dir).forEach(name => {
            if (name.toLowerCase().endsWith(".ini")) {
                log.debug(`Found .ini file: ${name}`);
                const ParsedFile = fs.readFileSync(path.join(dir, name)).toString();
                const ParsedStats = fs.statSync(path.join(dir, name));

                CloudFiles.push({
                    "uniqueFilename": name,
                    "filename": name,
                    "hash": crypto.createHash('sha1').update(ParsedFile).digest('hex'),
                    "hash256": crypto.createHash('sha256').update(ParsedFile).digest('hex'),
                    "length": ParsedFile.length,
                    "contentType": "application/octet-stream",
                    "uploaded": ParsedStats.mtime,
                    "storageType": "S3",
                    "storageIds": {},
                    "doNotCache": true
                });
            }
        });
    }
});

app.get("/fortnite/api/cloudstorage/system/:file", async (req, res) => {

    if (safety.env.USE_S3 == true) {
        const fileName = req.params.file;
        const key = `CloudStorage/${safety.env.NAME || ""}/${fileName}`;

        const s3Object = await getCloudFile(key);

        if (s3Object) {
            return res.status(200).send(s3Object).end();
        } else {
            res.status(200);
            res.end();
        }
    } else {
        const file = path.join(__dirname, "../../", "CloudStorage", req.params.file);

        if (fs.existsSync(file)) return res.status(200).send(fs.readFileSync(file));

        res.status(200).end();
    }

});

//Settings stuff
app.get("/fortnite/api/cloudstorage/user/*/:file", async (req, res) => {

    if (safety.env.USE_S3 == true) {
        const userid = req.params[0];

        res.set("Content-Type", "application/octet-stream")

        if (req.params.file.toLowerCase() !== "clientsettings.sav") {
            return res.status(404).json({
                "error": "file not found"
            });
        }

        const fileName = req.params.file;
        const key = `CloudStorage/${safety.env.NAME}/${userid}/${fileName}`;

        console.log(key);

        const s3Object = await getCloudFile(key);

        //if s3 object is 0 bytes, return 404
        if (s3Object && s3Object.toString().length === 0) {
            log.debug("File is 0 bytes, returning 404");
            return res.status(404).json({
                "error": "file not found"
            });
        }

        if (!s3Object) {
            res.status(200);
            res.end();
            return;
        }

        const buffer = Buffer.from(s3Object.toString(), "latin1");

        const memory = functions.GetVersionInfo(req);

        return res.status(200).send(buffer).end();
        //return res.status(200).send(s3Object.toString()).end();
    } else {
        const userid = req.params[0];
        try {
            const dirPath = path.join("/etc/momentum/settings", "Momentum", "ClientSettings");
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath);
            }
        } catch (err) { }
        res.set("Content-Type", "application/octet-stream");
        if (req.params.file.toLowerCase() === "clientsettings.sav") {
            const filePath = path.join("/etc/momentum/settings", "Momentum", "ClientSettings", `ClientSettings-${userid}.Sav`);
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath);
                return res.status(200).send(fileContent);
            } else {
                res.status(200).end();
            }
        } else {
            // do something else here if needed
        }
    }

})

app.get("/fortnite/api/cloudstorage/user/:accountId", async (req, res) => {

    if (safety.env.USE_S3 == true) {
        const userid = req.params.accountId;

        const key = `CloudStorage/${safety.env.NAME}/${userid}/ClientSettings.Sav`;

        const s3Object = await getCloudFile(key);

        res.set("Content-Type", "application/json")

        const memory = functions.GetVersionInfo(req);

        var currentBuildID = memory.CL;

        if (s3Object) {

            const ParsedFile = s3Object.toString();
            const mtime = new Date();

            const random: Number = Math.floor(10000 + Math.random() * 90000);

            return res.json([{
                "uniqueFilename": "ClientSettings.Sav",
                "filename": "ClientSettings.Sav",
                "hash": crypto.createHash('sha1').update(random.toString()).digest('hex'),
                "hash256": crypto.createHash('sha256').update(random.toString()).digest('hex'),
                "length": s3Object.toString().length,
                "contentType": "application/octet-stream",
                "uploaded": mtime,
                "storageType": "S3",
                "storageIds": {},
                "accountId": req.params.accountId,
                "doNotCache": true
            }]);

        } else {
            return res.json([]);
        }
    } else {
        try {
            const dirPath = path.join(pathToClientSettings);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath);
            }
            const memory = functions.GetVersionInfo(req);
            const userId = req.params.accountId;
            res.set("Content-Type", "application/json");
            const currentBuildID = memory.CL;
            const filePath = path.join(dirPath, `ClientSettings-${userId}.Sav`);
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, "latin1");
                const fileStats = fs.statSync(filePath);
                const response = {
                    uniqueFilename: "ClientSettings.Sav",
                    filename: "ClientSettings.Sav",
                    hash: crypto.createHash("sha1").update(fileContent).digest("hex"),
                    hash256: crypto.createHash("sha256").update(fileContent).digest("hex"),
                    length: Buffer.byteLength(fileContent),
                    contentType: "application/octet-stream",
                    uploaded: fileStats.mtime,
                    storageType: "S3",
                    storageIds: {},
                    accountId: req.params.accountId,
                    doNotCache: true,
                };
                return res.json([response]);
            } else {
                return res.json([]);
            }
        } catch (err) {
            console.error("Error:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

})

app.put("/fortnite/api/cloudstorage/user/*/:file", async (req, res) => {

    if (safety.env.USE_S3 == true) {
        log.debug("PUT /fortnite/api/cloudstorage/user/*/:file");

        const userid = req.params[0];

        if (req.params.file.toLowerCase() !== "clientsettings.sav") {
            return res.status(404).json({
                "error": "file not found"
            });
        }

        const key = `CloudStorage/${safety.env.NAME || "NameNotSet"}/${userid}/ClientSettings.Sav`;
        console.log(`Uploading Settings to S3`);
        const params: S3.PutObjectRequest = {
            Bucket: safety.env.S3_BUCKET_NAME || "BucketNotSet",
            Key: key,
            Body: req.rawBody,
            ContentType: "application/octet-stream",
        };
        s3.deleteObject(params, (err: AWSError, data: S3.DeleteObjectOutput) => {
            if (err) console.error(err);
        });
        s3.putObject(params, (err: AWSError, data: S3.PutObjectOutput) => {
            if (err) console.error(err);
        });

        const memory = functions.GetVersionInfo(req);

        var currentBuildID = memory.CL;

        res.status(204).end();
    } else {
        const userid = req.params[0];
        try {

            if (!fs.existsSync(path.join(pathToClientSettings))) {
                fs.mkdirSync(path.join(pathToClientSettings));

            }
        } catch (err) { }

        if (req.params.file.toLowerCase() !== "clientsettings.sav") {
            return res.status(404).json({
            });
        }

        const memory = functions.GetVersionInfo(req);
        let file: File;
        file = path.join(pathToClientSettings, `ClientSettings-${userid}.Sav`);
        fs.writeFileSync(file, req.rawBody, 'latin1');
        res.status(204).end();
    }

})

module.exports = app;
