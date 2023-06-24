import { iMMCodes } from "../model/mmcodes";
import { iUser } from "../model/user";
import decode from "../utilities/decode";
import kv from "../utilities/kv";
import safety from "../utilities/safety";

export { };

const express = require("express");
const app = express.Router();
import functions from "../utilities/structs/functions";
const MMCode = require("../model/mmcodes");
const { verifyToken } = require("../tokenManager/tokenVerify");
const qs = require('qs');
import error from "../utilities/structs/error";

let buildUniqueId = {};

app.get("/fortnite/api/matchmaking/session/findPlayer/*", (req, res) => {

    res.status(200).end();
});

const codeCache = new Map<string, typeof MMCode>();

app.get("/fortnite/api/game/v2/matchmakingservice/ticket/player/*", verifyToken, async (req, res) => {
    const playerCustomKey = qs.parse(req.query, { ignoreQueryPrefix: true })['player.option.customKey'];
    const bucketId = qs.parse(req.query, { ignoreQueryPrefix: true })['bucketId'];
    const region = bucketId.split(":")[2];
    const playlist = bucketId.split(":")[3];

    let codeDocument: iMMCodes | null = null;
    if (playerCustomKey) {
        codeDocument = codeCache.get(playerCustomKey);
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
    }

    if (typeof req.query.bucketId !== "string" || req.query.bucketId.split(":").length !== 4) {
        return res.status(400).end();
    }

    buildUniqueId[req.user.accountId] = req.query.bucketId.split(":")[0];

    const matchmakerIP = safety.env.MATCHMAKER_IP;

    res.json({
        "serviceUrl": `ws://${matchmakerIP}`,
        "ticketType": "mms-player",
        "payload": "account",
        "signature": `${req.user.matchmakingId} ${playlist}`
    });

});

app.get("/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId", (req, res) => {
    res.json({
        "accountId": req.params.accountId,
        "sessionId": req.params.sessionId,
        "key": "none"
    });
});

app.get("/fortnite/api/matchmaking/session/:sessionId", verifyToken, async (req, res) => {

    const user: iUser = await decode.decodeAuth(req) as iUser;

    let codeKV = await kv.get(`playerCustomKey:${user.accountId}`) ?? {
        ip: safety.env.GAME_SERVERS[Math.floor(Math.random() * safety.env.GAME_SERVERS.length)].split(":")[0],
        port: parseInt(safety.env.GAME_SERVERS[Math.floor(Math.random() * safety.env.GAME_SERVERS.length)].split(":")[1])
    };

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
            "ALLOWMIGRATION_s": "false",
            "REJOINAFTERKICK_s": "OPEN",
            "CHECKSANCTIONS_s": "false",
            "STORMSHIELDDEFENSETYPE_i": 0,
            "BEACONPORT_i": 15011,
            "BUCKET_s": "NAE:FORTNITE-LIVENAEVAAWSUSE1M6I16NUBRCORE-MAIN-25469380:25347113:Fortnite",
            "DEPLOYMENT_s": "Fortnite",
            "LASTUPDATED_s": "2023-05-28T17:23:16.095Z",
            "PLAYLISTNAME_s": "Playlist_Bots_DefaultSolo",
            "DCID_s": "FORTNITE-LIVENAEVAAWSUSE1M6I16NUBRCORE-MAIN-25469380",
            "allowMigration_s": false,
            "ALLOWREADBYID_s": "false",
            "SERVERADDRESS_s": codeKV.ip,
            "ALLOWBROADCASTING_b": true,
            "NETWORKMODULE_b": false,
            "HOTFIXVERSION_i": 1,
            "lastUpdated_s": "2023-05-28T17:23:20.049Z",
            "SUBREGION_s": "VA",
            "MATCHMAKINGPOOL_s": "Any",
            "allowReadById_s": false,
            "SESSIONKEY_s": "C7822D4776E44D30803BEADD86CA1DA2",
            "REGION_s": "NAE", //gotta look at his
            "serverAddress_s": codeKV.ip,
            "GAMEMODE_s": "FORTATHENA",
            "deployment_s": "Fortnite",
            "ADDRESS_s": codeKV.ip,
            "bucket_s": "NAE:FORTNITE-LIVENAEVAAWSUSE1M6I16NUBRCORE-MAIN-25469380:25347113:Fortnite",
            "checkSanctions_s": false,
            "rejoinAfterKick_s": "OPEN"
        },
        "publicPlayers": [],
        "privatePlayers": [],
        "totalPlayers": 1,
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