import decode from "../utilities/decode";
import kv from "../utilities/kv";
import safety from "../utilities/safety";

export { };

const express = require("express");
const app = express.Router();
const fs = require("fs");
const functions = require("../structs/functions.js");
const User = require("../model/user");
const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");

let buildUniqueId = {};

app.get("/fortnite/api/matchmaking/session/findPlayer/*", (req, res) => {
    res.status(200).end();
});

app.get("/fortnite/api/game/v2/matchmakingservice/ticket/player/*", verifyToken, async (req, res) => {

    if (typeof req.query.bucketId != "string") return res.status(400).end();
    if (req.query.bucketId.split(":").length != 4) return res.status(400).end();

    buildUniqueId[req.user.accountId] = req.query.bucketId.split(":")[0];

    const matchmakerIP = safety.env.MATCHMAKER_IP !== undefined ? safety.env.MATCHMAKER_IP : "127.0.0.1:80";

    res.json({
        "serviceUrl": `ws://${matchmakerIP}`,
        "ticketType": "mms-player",
        "payload": "69=",
        "signature": "420="
    });
    res.end();
});

app.get("/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId", (req, res) => {

    console.log("Matchmaking session requested 1.");

    res.json({
        "accountId": req.params.accountId,
        "sessionId": req.params.sessionId,
        "key": "none"
    });
});

app.get("/fortnite/api/matchmaking/session/:sessionId", verifyToken, async (req, res) => {

    const gameServers:string[] = safety.env.GAME_SERVERS !== undefined ? safety.env.GAME_SERVERS.split('_') : [];

    let user: { gameserver: string } = { gameserver: "127.0.0.1" };

    if(safety.env.PER_USER_SERVER == true) {
        user = await decode.decodeAuth(req)
    }

    let gameServerInfo = {
        serverAddress: safety.env.PER_USER_SERVER == true ? user.gameserver : gameServers[Math.floor(Math.random() * gameServers.length)],
        serverPort: 7777
    };

    res.json({
        "id": req.params.sessionId,
        "ownerId": functions.MakeID().replace(/-/ig, "").toUpperCase(),
        "ownerName": "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
        "serverName": "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
        "serverAddress": gameServerInfo.serverAddress,
        "serverPort": gameServerInfo.serverPort,
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

    console.log("Matchmaking session requested 3.");

    res.json([]);
});

module.exports = app;