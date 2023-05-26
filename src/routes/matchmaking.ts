import { iMMCodes } from "../model/mmcodes";
import { iUser } from "../model/user";
import log from "../structs/log";
import decode from "../utilities/decode";
import kv from "../utilities/kv";
import safety from "../utilities/safety";

export { };

const express = require("express");
const app = express.Router();
const fs = require("fs");
const functions = require("../structs/functions");
const User = require("../model/user");
const MMCode = require("../model/mmcodes");
const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify");
const qs = require('qs');
const error = require("../structs/error");

let buildUniqueId = {};

app.get("/fortnite/api/matchmaking/session/findPlayer/*", (req, res) => {

    res.status(200).end();
});

interface iServer {
    ip: string
    port: number;
}

const codeCache = new Map<string, typeof MMCode>();

app.get("/fortnite/api/game/v2/matchmakingservice/ticket/player/*", verifyToken, async (req, res) => {
    const playerCustomKey = qs.parse(req.query, { ignoreQueryPrefix: true })['player.option.customKey'];
    log.debug("Custom key is: " + playerCustomKey);

    let codeDocument: iMMCodes = codeCache.get(playerCustomKey);
    if (!codeDocument) {
        codeDocument = await MMCode.findOne({ code_lower: playerCustomKey?.toLowerCase() });
        if (!codeDocument) {
            return error.createError(
                "errors.com.epicgames.common.matchmaking.code.not_found",
                "Your matchmaking code does not exist, please create it using the Discord bot",
                [], 1013, "invalid_code", 404, res
            );
        }
        codeCache.set(playerCustomKey, codeDocument);
    }

    await kv.set(`playerCustomKey:${req.user.accountId}`, codeDocument);

    if (typeof req.query.bucketId !== "string" || req.query.bucketId.split(":").length !== 4) {
        return res.status(400).end();
    }

    buildUniqueId[req.user.accountId] = req.query.bucketId.split(":")[0];

    const matchmakerIP = safety.env.MATCHMAKER_IP;

    res.json({
        "serviceUrl": `ws://${matchmakerIP}`,
        "ticketType": "mms-player",
        "payload": "69=",
        "signature": "420="
    });
});

app.get("/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId", (req, res) => {
    console.log("GET /fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId")
    res.json({
        "accountId": req.params.accountId,
        "sessionId": req.params.sessionId,
        "key": "none"
    });
});

app.get("/fortnite/api/matchmaking/session/:sessionId", verifyToken, async (req, res) => {

    const user: iUser = await decode.decodeAuth(req) as iUser;

    let codeKV: iServer = await kv.get(`playerCustomKey:${user.accountId}`);
    if (codeKV === undefined || codeKV === null) {
        const gameServers = safety.env.GAME_SERVERS
        const randomServer = gameServers[Math.floor(Math.random() * gameServers.length)];
        const [ip, port] = randomServer.split(":");
        codeKV = {
            ip: ip,
            port: parseInt(port)
        };
    }

    res.json({
        "id": req.params.sessionId,
        "ownerId": functions.MakeID().replace(/-/ig, "").toUpperCase(),
        "ownerName": "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
        "serverName": "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
        "serverAddress": codeKV.ip,
        "serverPort": codeKV.port.toString(),
        "maxPublicPlayers": 220,
        "openPublicPlayers": 175,
        "maxPrivatePlayers": 0,
        "openPrivatePlayers": 0,
        "attributes": {
            "REGION_s": "EU",
            "GAMEMODE_s": "FORTATHENA",
            "ALLOWBROADCASTING_b": true,
            "SUBREGION_s": "GB",
            "DCID_s": "FORTNITE-LIVEEUGCEC1C2E30UBRCORE0A-14840880",
            "tenant_s": "Fortnite",
            "MATCHMAKINGPOOL_s": "Any",
            "STORMSHIELDDEFENSETYPE_i": 0,
            "HOTFIXVERSION_i": 0,
            "PLAYLISTNAME_s": "Playlist_DefaultSolo",
            "SESSIONKEY_s": functions.MakeID().replace(/-/ig, "").toUpperCase(),
            "TENANT_s": "Fortnite",
            "BEACONPORT_i": 15009
        },
        "publicPlayers": [],
        "privatePlayers": [],
        "totalPlayers": 45,
        "allowJoinInProgress": false,
        "shouldAdvertise": false,
        "isDedicated": false,
        "usesStats": false,
        "allowInvites": false,
        "usesPresence": false,
        "allowJoinViaPresence": true,
        "allowJoinViaPresenceFriendsOnly": false,
        "buildUniqueId": buildUniqueId[req.user.accountId] || "0",
        "lastUpdated": new Date().toISOString(),
        "started": false
    });
});

app.post("/fortnite/api/matchmaking/session/*/join", (req, res) => {

    res.status(204).end();
});

app.post("/fortnite/api/matchmaking/session/matchMakingRequest", (req, res) => {

    res.json([]);
});

module.exports = app;