export { }

const express = require("express");
const app = express.Router();
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
import S3 from 'aws-sdk/clients/s3';
const limit = require("express-limit").limit;

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const functions = require("../structs/functions.js");
//S3
import { AWSError } from 'aws-sdk/lib/error';


let seasons = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const dotenv = require("dotenv");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const s3 = new S3({
    apiVersion: 'latest',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
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
        const params: S3.GetObjectRequest = {
            Bucket: "backend",
            Key: objectName,
        };
        const data: S3.GetObjectOutput = await s3.getObject(params).promise();
        return data.Body;
    } catch (err: any) {
        if (err.code === "NoSuchKey") {
            // create empty .ini file
            const params: S3.PutObjectRequest = {
                Bucket: "backend",
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
                Bucket: "backend",
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
        Bucket: "backend",
        Key: `${folderName}/`,
        Body: "",
        ContentType: "application/x-directory",
    };
    await s3.putObject(params).promise();
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


        const localFiles = fs.readdirSync(path.join(__dirname, "../../", "CloudStorage"));
        localFiles.forEach((file) => {
            const key = `CloudStorage/${process.env.INFO_UID || ""}/${file}`;
            const object = folderObjects.find(obj => obj.Key === key);
            if (!object) {
                const fileData = fs.readFileSync(path.join(__dirname, "../../", "CloudStorage", file));
                const params: S3.PutObjectRequest = {
                    Bucket: "backend",
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
);

app.get("/fortnite/api/cloudstorage/user/:accountId", verifyClient, limit({ max: 5, period: 60 * 1000 }), async (req, res) => {
    try {
        const dirPath = path.join("/etc/momentum/settings", "Momentum", "ClientSettings");
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
});



app.put("/fortnite/api/cloudstorage/user/*/:file", verifyClient, limit({ max: 5, period: 60 * 1000 }), async (req, res) => {
    const userid = req.params[0];
    try {

        if (!fs.existsSync(path.join("/etc/momentum/settings", "Momentum", "ClientSettings"))) {
            fs.mkdirSync(path.join("/etc/momentum/settings", "Momentum", "ClientSettings"));

        }
    } catch (err) {}

    if (req.params.file.toLowerCase() !== "clientsettings.sav") {
        return res.status(404).json({
        });
    }

    const memory = functions.GetVersionInfo(req);
    let file: File;
    file = path.join("/etc/momentum/settings", "Momentum", "ClientSettings", `ClientSettings-${userid}.Sav`);
    fs.writeFileSync(file, req.rawBody, 'latin1');
    res.status(204).end();
})

module.exports = app;
