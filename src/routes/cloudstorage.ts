export { }

const express = require("express");
const app = express.Router();
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
import AWS_S3, { S3 } from "@aws-sdk/client-s3";
const limit = require("express-limit").limit;

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const functions = require("../structs/functions.js");

const dotenv = require("dotenv");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

if (!process.env.S3_ENDPOINT) throw new Error("S3_ENDPOINT is not defined in .env file");
if (!process.env.S3_ACCESS_KEY_ID) throw new Error("S3_ACCESS_KEY_ID is not defined in .env file");
if (!process.env.S3_SECRET_ACCESS_KEY) throw new Error("S3_SECRET_ACCESS_KEY is not defined in .env file");

const s3 = new S3({
    apiVersion: 'latest',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "unset",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "unset",
    },
});

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
        const params: AWS_S3.GetObjectCommandInput = {
            Bucket: "backend",
            Key: objectName,
        };
        const data: AWS_S3.GetObjectCommandOutput = await s3.getObject(params);
        return data.Body;
    } catch (err: any) {
        if (err.code === "NoSuchKey") {
            // create empty .ini file
            const params: AWS_S3.PutObjectCommandInput = {
                Bucket: "backend",
                Key: objectName,
                Body: "",
                ContentType: "text/plain",
            };
            await s3.putObject(params);
            return Buffer.from("");
        }
        throw err;
    }
};

const listCloudFiles = async (prefix: string) => {
    const objectsList: Array<AWS_S3._Object> = [];

    const listObjects = (ContinuationToken?: string) => {
        return new Promise((resolve, reject) => {
            const params: AWS_S3.ListObjectsV2CommandInput = {
                Bucket: "backend",
                Prefix: prefix,
                ContinuationToken: ContinuationToken
            };
            s3.listObjectsV2(params, (err, data) => {
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
    const params: AWS_S3.PutObjectCommandInput = {
        Bucket: "backend",
        Key: `${folderName}/`,
        Body: "",
        ContentType: "application/x-directory",
    };
    await s3.putObject(params);
};
//.Ini Stuff
app.get("/fortnite/api/cloudstorage/system", verifyClient, limit({ max: 5, period: 60 * 1000 }), async (req, res) => {
    try {
        const uid: string | undefined = process.env.INFO_UID;
        const folderName = `CloudStorage/${uid}`;

        // check if folder exists, and create it if not
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


        const localFiles = fs.readdirSync(path.join(__dirname, "..", "CloudStorage"));
        localFiles.forEach((file) => {
            const key = `CloudStorage/${process.env.INFO_UID || ""}/${file}`;
            const object = folderObjects.find(obj => obj.Key === key);
            if (!object) {
                const fileData = fs.readFileSync(path.join(__dirname, "..", "CloudStorage", file));
                const params: AWS_S3.PutObjectCommandInput = {
                    Bucket: "backend",
                    Key: key,
                    Body: fileData,
                    ContentType: "application/octet-stream",
                };
                s3.putObject(params, (err, data) => {
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
});


//.Ini stuff
app.get("/fortnite/api/cloudstorage/system/:file", async (req, res) => {

    const fileName = req.params.file;
    const key = `CloudStorage/${process.env.INFO_UID || ""}/${fileName}`;

    const s3Object = await getCloudFile(key);

    if (s3Object) {
        return res.status(200).send(s3Object).end();
    } else {
        res.status(200);
        res.end();
    }
});


//Settings stuff

app.get("/fortnite/api/cloudstorage/user/*/:file", verifyClient, limit({ max: 5, period: 60 * 1000 }), async (req, res) => {
    console.log(req.originalUrl);
    const userid = req.params[0];
    console.log("/fortnite/api/cloudstorage/user/*/:file" + JSON.stringify(req.params))
    try {
        if (!fs.existsSync(path.join("/etc/nexus/settings", "Nexus", "ClientSettings"))) {
            fs.mkdirSync(path.join("/etc/nexus/settings", "Nexus", "ClientSettings"));
        }
    } catch (err) { }
    res.set("Content-Type", "application/octet-stream")
    if (req.params.file.toLowerCase() !== "clientsettings.sav") {
    }
    const memory = functions.GetVersionInfo(req);
    var currentBuildID = memory.CL;
    let file;
    file = path.join("/etc/nexus/settings", "Nexus", "ClientSettings", `ClientSettings-${userid}.Sav`);
    if (fs.existsSync(file)) {
        const ParsedFile = fs.readFileSync(file);
        return res.status(200).send(ParsedFile).end();
    } else {
        res.status(200);
        res.end();
    }
});

app.get("/fortnite/api/cloudstorage/user/:accountId", verifyClient, limit({ max: 5, period: 60 * 1000 }), async (req, res) => {
    try {
        if (!fs.existsSync(path.join("/etc/nexus/settings", "Nexus", "ClientSettings"))) {
            fs.mkdirSync(path.join("/etc/nexus/settings", "Nexus", "ClientSettings"));
        }
    } catch (err) { }
    const memory = functions.GetVersionInfo(req);
    const userid = req.params.accountId;
    console.log("/fortnite/api/cloudstorage/user/:accountId " + userid)
    res.set("Content-Type", "application/json")
    var currentBuildID = memory.CL;
    let file;
    file = path.join("/etc/nexus/settings", "Nexus", "ClientSettings", `ClientSettings-${userid}.Sav`);
    if (fs.existsSync(file)) {
        const ParsedFile = fs.readFileSync(file, 'latin1');
        const ParsedStats = fs.statSync(file);
        return res.json([{
            "uniqueFilename": "ClientSettings.Sav",
            "filename": "ClientSettings.Sav",
            "hash": crypto.createHash('sha1').update(ParsedFile).digest('hex'),
            "hash256": crypto.createHash('sha256').update(ParsedFile).digest('hex'),
            "length": Buffer.byteLength(ParsedFile),
            "contentType": "application/octet-stream",
            "uploaded": ParsedStats.mtime,
            "storageType": "S3",
            "storageIds": {},
            "accountId": req.params.accountId,
            "doNotCache": true
        }]);
    } else {
        return res.json([]);
    }
})
app.put("/fortnite/api/cloudstorage/user/*/:file", verifyClient, limit({ max: 5, period: 60 * 1000 }), async (req, res) => {
    const userid = req.params[0];
    console.log(req.params[0])
    try {
        if (!fs.existsSync(path.join("/etc/nexus/settings", "Nexus", "ClientSettings"))) {
            fs.mkdirSync(path.join("/etc/nexus/settings", "Nexus", "ClientSettings"));
        }
    } catch (err) { }
    if (req.params.file.toLowerCase() !== "clientsettings.sav") {
        return res.status(404).json({
        });
    }
    const memory = functions.GetVersionInfo(req);
    var currentBuildID = memory.CL;
    let file;
    file = path.join("/etc/nexus/settings", "Nexus", "ClientSettings", `ClientSettings-${userid}.Sav`);
    fs.writeFileSync(file, req.rawBody, 'latin1');
    res.status(204).end();
})

module.exports = app;
