export { };

const express = require("express");
const app: Application = express.Router();

const Profile = require("../model/profiles.js");
const User = require("../model/user.js");
const profileManager = require("../structs/profile.js");
const Friends = require("../model/friends");
import functions from "../utilities/structs/functions";
import log from "../utilities/structs/log";
import error from "../utilities/structs/error";
import { verifyToken } from "../tokenManager/tokenVerify";
import { iUser } from "../model/user";
import { Application, Request } from "express";

interface iPartyMember {
    account_id: string,
    connections: any[],
    joined_at: string,
    meta: any,
}

interface iParty {
    id: string,
    created_at: string,
    updated_at: string,
    config: {
        discoverability: discoverability,
        intention_ttl: number,
        invite_ttl: number,
        join_confirmation: boolean,
        joinability: string,
        type: string,
    },
    members: iPartyMember[],
    applicants: any[],
    meta: {
        "urn:epic:cfg:party-type-id_s": string,
        "Default:PartyState_s": string,
        "urn:epic:cfg:build-id_s": string,
    },
    invites: any[],
    revision: number,
    intentions: any[],
}

let Parties: iParty[] = [];

type discoverability = "ALL" | "INVITED_ONLY" | "HIDDEN";

class Party {

    public async createParty(discoverability: discoverability, user: iUser) {

        let party: iParty = {

            id: functions.MakeID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            config: {
                discoverability: discoverability,
                intention_ttl: 60,
                invite_ttl: 14400,
                join_confirmation: true,
                joinability: "OPEN",
                type: "DEFAULT",
            },
            members: [
                {
                    account_id: user.accountId,
                    connections: [],
                    joined_at: new Date().toISOString(),
                    meta: {},

                }
            ],
            applicants: [],
            meta: {
                "urn:epic:cfg:party-type-id_s": "default",
                "Default:PartyState_s": "BattleRoyaleView",
                "urn:epic:cfg:build-id_s": "1:1:",
            },
            invites: [],
            revision: 1,
            intentions: [],
        }

        return party;

    }
}

app.get("/party/api/v1/Fortnite/user/:accountId/pings/:receiverId", async (req: any, res: any) => {

    console.log("ROUTE: /party/api/v1/Fortnite/user/:accountId/pings/:receiverId");

    const PartyInstance = new Party()
    await PartyInstance.createParty("ALL", req.user).then((party: any) => {
        res.json(party);
    });

});

//Kick player from party probably
app.delete("/party/api/v1/Fortnite/parties/:partyId/members/:memberId", async (req: any, res: any) => {

    console.log("ROUTE: /party/api/v1/Fortnite/parties/:partyId/members/:memberId");

    const FindParty = Parties.find((party: any) => party.id === req.params.partyId);
    if (!FindParty) {
        return res.status(404).json("Party not found");
    }
    const FoundParty: iParty = FindParty;

    const FoundMember = FoundParty.members.find((member: any) => member.account_id === req.params.memberId);

    if (!FoundMember) {
        return res.status(404).json("Member not found");
    }

    const FoundMemberIndex = FoundParty.members.indexOf(FoundMember);
    FoundParty.members.splice(FoundMemberIndex, 1);

    return res.status(204)

});

app.delete(" /party/api/v1/Fortnite/user/:captainId/pings/:senderId", async (req: any, res: any) => {

    console.log("ROUTE: /party/api/v1/Fortnite/user/:captainId/pings/:senderId");

    const FindParty = Parties.find((party: any) => party.id === req.params.partyId);
    if (!FindParty) {
        return res.status(404).json("Party not found");
    }
    const FoundParty: iParty = FindParty;

    const FoundMember = FoundParty.members.find((member: any) => member.account_id === req.params.memberId);

    if (!FoundMember) {
        return res.status(404).json("Member not found");
    }

    const FoundMemberIndex = FoundParty.members.indexOf(FoundMember);
    FoundParty.members.splice(FoundMemberIndex, 1);

    return res.status(204)


});

app.post("/party/api/v1/Fortnite/user/:captainId/pings/:senderId/join", verifyToken, async (req: any, res: any) => {

    console.log("ROUTE: /party/api/v1/Fortnite/user/:captainId/pings/:senderId/join");

    const FindParty = Parties.find((party: any) => party.id === req.params.partyId);
    if (!FindParty) {
        return res.status(404).json("Party not found");
    }

    const FoundParty: iParty = FindParty;

    return  res.json({
        "status": "PENDING_CONFIRMATION",
        "party_id": FoundParty.id,
    })

});

app.get("/party/api/v1/Fortnite/parties/:partyId", verifyToken, async (req: any, res: any) => {

    console.log("ROUTE: /party/api/v1/Fortnite/parties/:partyId");

    const FindParty = Parties.find((party: any) => party.id === req.params.partyId);
    if (!FindParty) {
        return res.status(404).json("Party not found");
    }

    const FoundParty: iParty = FindParty;

    return res.json(FoundParty);

});

app.patch("/party/api/v1/Fortnite/parties/:partyId/members/:memberId/meta", verifyToken, async (req: Request, res) => {

    console.log("ROUTE: /party/api/v1/Fortnite/parties/:partyId/members/:memberId/meta");

    const jsonbody = req.body

    const FindParty = Parties.find((party: any) => party.id === req.params.partyId);
    if (!FindParty) {
        return res.status(404).json("Party not found");
    }

    const FoundParty: iParty = FindParty;

    const FoundMember = FoundParty.members.find((member: any) => member.account_id === req.params.memberId);

    if (!FoundMember) {
        return res.status(404).json("Member not found");
    }

    res.status(204).json()

});

app.patch("/party/api/v1/Fortnite/parties/:partyId/", async (req: Request, res) => {

    console.log("ROUTE: /party/api/v1/Fortnite/parties/:partyId/");

    const jsonbody = req.body

    const FindParty = Parties.find((party: any) => party.id === req.params.partyId);
    if (!FindParty) {
        return res.status(404).json("Party not found");
    }

    const FoundParty: iParty = FindParty;

    FoundParty.config = jsonbody.config;
    FoundParty.meta = jsonbody.meta;
    FoundParty.revision = FoundParty.revision + 1;

});

app.post("/party/api/v1/Fortnite/parties/:partyId/invites/:inviteId?sendPing=true", verifyToken, async (req: Request, res) => {

    console.log("ROUTE: /party/api/v1/Fortnite/parties/:partyId/invites/:inviteId?sendPing=true");

    const jsonbody = req.body

    const FindParty = Parties.find((party: any) => party.id === req.params.partyId);
    if (!FindParty) {
        return res.status(404).json("Party not found");
    }

    const FoundParty: iParty = FindParty;

    res.status(204).json()

});

app.post("/party/api/v1/Fortnite/parties/:partyId/members/:memberId/confirm", verifyToken, async (req: Request, res) => {

    console.log("ROUTE: /party/api/v1/Fortnite/parties/:partyId/members/:memberId/confirm");

    const FindParty = Parties.find((party: any) => party.id === req.params.partyId);
    if (!FindParty) {
        return res.status(404).json("Party not found");
    }

    const FoundParty: iParty = FindParty;

    const FoundMember = FoundParty.members.find((member: any) => member.account_id === req.params.memberId);

    if (!FoundMember) {
        return res.status(404).json("Member not found");
    }

    res.status(204).json()

});

app.post("/party/api/v1/Fortnite/parties", verifyToken, async (req: any, res) => {

    console.log("ROUTE: /party/api/v1/Fortnite/parties");

    //@ts-ignore
    const PartyInstance = new Party()
    await PartyInstance.createParty("ALL", req.user).then((party: any) => {
        console.log("Party created");
        Parties.push(party);
        res.json(party);
    });

});

module.exports = app;