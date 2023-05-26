import { EmbedBuilder, Message } from "discord.js";

export { };

const express = require("express");
const app = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');

import logger from '../structs/log';

const error = require("../structs/error.js");
const functions = require("../structs/functions.js");

const tokenCreation = require("../tokenManager/tokenCreation.js");
const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const User = require("../model/user.js");

const kvjs = require('@heyputer/kv.js');

const kv = new kvjs();

const { Client, Collection, Events, GatewayIntentBits, ActivityType } = require('discord.js');
const Discord = require("discord.js");

import client from "../bot/index";
import log from "../structs/log";
import safety from "../utilities/safety";
import { iUser } from "../model/user";

client.once(Events.ClientReady, c => {
    logger.bot(`MFA Bot ready! Logged in as ${c.user.tag}`);
});

function waitFor2FA(req: { user: { discordId: any; }; }) {
    return new Promise<void>((resolve) => {
        const checkCondition = async () => {
            while (await kv.get(req.user.discordId) !== "true") {
                await new Promise((r) => setTimeout(r, 1000));
            }
            resolve();
        };
        checkCondition();
    });
}

app.post("/account/api/oauth/token", async (req: { headers: { [x: string]: string; }; body: { grant_type?: any; username?: any; password?: any; refresh_token?: any; exchange_code?: any; }; ip: any; user }, res: { json: (arg0: { access_token: string; expires_in: number; expires_at: any; token_type: string; client_id: any; internal_client: boolean; client_service: string; refresh_token?: string; refresh_expires?: number; refresh_expires_at?: any; account_id?: any; displayName?: any; app?: string; in_app_id?: any; device_id?: any; }) => void; }) => {
    let clientId: any[];
    let rebootAccount: boolean = false;

    try {
        clientId = functions.DecodeBase64(req.headers["authorization"].split(" ")[1]).split(":");

        if (!clientId[1]) throw new Error("invalid client id");

        clientId = clientId[0];
    } catch {
        return error.createError(
            "errors.com.epicgames.common.oauth.invalid_client",
            "It appears that your Authorization header may be invalid or not present, please verify that you are sending the correct headers.",
            [], 1011, "invalid_client", 400, res
        );
    }

    const grantTypeFunctions = {
        client_credentials: async (req, res) => {
            const ip = req.ip;
            const clientTokenIndex = global.clientTokens.findIndex(i => i.ip === ip);
            if (clientTokenIndex !== -1) {
                global.clientTokens.splice(clientTokenIndex, 1);
            }
            const token = tokenCreation.createClient(clientId, req.body.grant_type, ip, 4);
            functions.UpdateTokens();
            const decodedClient = jwt.decode(token);
            res.json({
                access_token: `eg1~${token}`,
                expires_in: Math.round(((DateAddHours(new Date(decodedClient.creation_date), decodedClient.hours_expire).getTime()) - (new Date().getTime())) / 1000),
                expires_at: DateAddHours(new Date(decodedClient.creation_date), decodedClient.hours_expire).toISOString(),
                token_type: "bearer",
                client_id: clientId,
                internal_client: true,
                client_service: "fortnite"
            });
        },
        password: async (req, res) => {
            const { username: email, password } = req.body;
            const regex = /@projectreboot\.dev$/;
            const rebootAccoun: boolean = regex.test(email);
            log.debug(`Reboot account: ${rebootAccount}`);
            let user: iUser = {} as iUser;
            if (rebootAccount && safety.env.ALLOW_REBOOT) {
                const findUser: iUser = await User.findOne({ email: email.toLowerCase() });
                if (findUser) {
                    req.user = findUser;
                } else {
                    const numberWith8Digits = Math.floor(10000000 + Math.random() * 90000000);
                    const registerUser = await functions.registerUser(numberWith8Digits, `reboot_${email.split("@")[0]}`, email, password, true)
                    req.user = await User.findOne({ email: email.toLowerCase() });
                }
            } else {
                user = await User.findOne({ email: email.toLowerCase() }).lean();
            }
            if (!user) {
                return error.createError(
                    "errors.com.epicgames.account.invalid_account_credentials",
                    "Your e-mail and/or password are incorrect. Please check them and try again.",
                    [], 18031, "invalid_grant", 400, res
                );
            }
            if (!rebootAccount && !(await bcrypt.compare(password, user.password))) {
                return error.createError(
                    "errors.com.epicgames.account.invalid_account_credentials",
                    "Your e-mail and/or password are incorrect. Please check them and try again.",
                    [], 18031, "invalid_grant", 400, res
                );
            }
            if (req.user.mfa) {
                const discordId = req.user.discordId || null;
                await kv.set(req.user.discordId, "false");
                const embed:EmbedBuilder = new EmbedBuilder()
                    .setColor('#2b2d31')
                    .setTitle('New Login')
                    .setDescription("A new login has been detected. Was this you? You have 20 seconds to react to the corresponding emoji.")
                    .addFields(
                        { name: 'Account name', value: req.user.username, inline: false },
                        { name: 'Account ID', value: req.user.accountId, inline: true },
                        { name: 'IP Address', value: req.ip, inline: false },
                    )
                    .setTimestamp()
                    .setFooter({
                        text: 'Momentum',
                        iconURL: 'https://cdn.discordapp.com/avatars/1107325625074733127/42e9c19a432cf6a9cb607a47813a31de.webp?size=512'
                    });
                    const discordUser = await client.users.fetch(discordId);
                    const sentMessage: Message = await discordUser.send({ embeds: [embed] });
                    await sentMessage.react('✅').then(() => sentMessage.react('❌'));
                const collectorFilter = (reaction, user) => {
                    logger.debug(`Reaction: ${reaction.emoji.name} | User: ${user.id}`);
                    return ['✅', '❌'].includes(reaction.emoji.name) && user.id === discordUser.id;
                };
                await sentMessage.awaitReactions({ filter: collectorFilter, max: 1, time: 20000, errors: ['time'] })
                    .then(async collected => {
                        const reaction = collected.first();
                        if (reaction!.emoji.name === '✅') {
                            await kv.set(req.user.discordId, "true");
                            await sentMessage.reply('Thank you for keeping your account secure, you will now be logging in.');
                        } else {
                            await kv.set(req.user.discordId, "false");
                            error.createError(
                                "errors.com.epicgames.account.mfa.user_denied",
                                "User denied the request.",
                                [], 18058, "access_denied", 400, res
                            );
                            await sentMessage.reply('Thank you! If you think your account has been compromised, please contact a staff member.');
                            setTimeout(() => {
                                sentMessage.delete();
                            }, 10000);
                        }
                    })
                    .catch(collected => {
                        setTimeout(() => {
                            sentMessage.delete();
                        }, 10000);
                        sentMessage.reply('Your reaction was not detected in time, please try again.');
                    });
                await waitFor2FA(req);
            }
        },
        refresh_token: async (req, res) => {
            const refresh_token = req.body.refresh_token;
            const refreshTokenIndex = global.refreshTokens.findIndex(i => i.token === refresh_token);
            if (refreshTokenIndex === -1) {
                return error.createError(
                    "errors.com.epicgames.account.auth_token.invalid_refresh_token",
                    `Sorry the refresh token '${refresh_token}' is invalid`,
                    [refresh_token], 18036, "invalid_grant", 400, res
                );
            }
            const decodedRefreshToken = jwt.decode(refresh_token.replace("eg1~", ""));
            if (DateAddHours(new Date(decodedRefreshToken.creation_date), decodedRefreshToken.hours_expire)?.getTime() <= new Date().getTime()) {
                global.refreshTokens.splice(refreshTokenIndex, 1);
                functions.UpdateTokens();
                return error.createError(
                    "errors.com.epicgames.account.auth_token.invalid_refresh_token",
                    `Sorry the refresh token '${refresh_token}' is invalid`,
                    [refresh_token], 18036, "invalid_grant", 400, res
                );
            }
            const object = global.refreshTokens[refreshTokenIndex];
            req.user = await User.findOne({ accountId: object.accountId }).lean();
        },
        exchange_code: async (req, res) => {
            const exchange_code = req.body.exchange_code;
            const index = global.exchangeCodes.findIndex(i => i.exchange_code === exchange_code);
            if (index === -1) {
                return error.createError(
                    "errors.com.epicgames.account.oauth.exchange_code_not_found",
                    "Sorry the exchange code you supplied was not found. It is possible that it was no longer valid",
                    [], 18057, "invalid_grant", 400, res
                );
            }
            const exchange = global.exchangeCodes[index];
            global.exchangeCodes.splice(index, 1);
            req.user = await User.findOne({ accountId: exchange.accountId }).lean();
        }
    };

    const grantTypeFunction = grantTypeFunctions[req.body.grant_type];
    if (!grantTypeFunction) {
        return error.createError(
            "errors.com.epicgames.common.oauth.unsupported_grant_type",
            `Unsupported grant type: ${req.body.grant_type}`,
            [], 1016, "unsupported_grant_type", 400, res
        );
    }
    await grantTypeFunction(req, res);

    if (req.user.banned) {
        const errorMessage = "You have been permanently banned from Fortnite.";
        const statusCode = -1;
        return error.createError(
            "errors.com.epicgames.account.account_not_active",
            errorMessage,
            [], statusCode, undefined, 400, res
        );
    }

    let refreshIndex = global.refreshTokens.findIndex((i: { accountId: any; }) => i.accountId == req.user.accountId);
    if (refreshIndex != -1) global.refreshTokens.splice(refreshIndex, 1);

    let accessIndex = global.accessTokens.findIndex((i: { accountId: any; }) => i.accountId == req.user.accountId);
    if (accessIndex != -1) {
            global.accessTokens.splice(accessIndex, 1);

        let xmppClient = global.Clients.find((i: { accountId: any; }) => i.accountId == req.user.accountId);
        if (xmppClient) xmppClient.client.close();
    }

    const deviceId = functions.MakeID().replace(/-/ig, "");
    const accessToken = tokenCreation.createAccess(req.user, clientId, req.body.grant_type, deviceId, 8); // expires in 8 hours
    const refreshToken = tokenCreation.createRefresh(req.user, clientId, req.body.grant_type, deviceId, 24); // expires in 24 hours

    functions.UpdateTokens();

    const decodedAccess = jwt.decode(accessToken);
    const decodedRefresh = jwt.decode(refreshToken);

    res.json({
        access_token: `eg1~${accessToken}`,
        expires_in: Math.round(((DateAddHours(new Date(decodedAccess.creation_date), decodedAccess.hours_expire).getTime()) - (new Date().getTime())) / 1000),
        expires_at: DateAddHours(new Date(decodedAccess.creation_date), decodedAccess.hours_expire).toISOString(),
        token_type: "bearer",
        refresh_token: `eg1~${refreshToken}`,
        refresh_expires: Math.round(((DateAddHours(new Date(decodedRefresh.creation_date), decodedRefresh.hours_expire).getTime()) - (new Date().getTime())) / 1000),
        refresh_expires_at: DateAddHours(new Date(decodedRefresh.creation_date), decodedRefresh.hours_expire).toISOString(),
        account_id: req.user.accountId,
        client_id: clientId,
        internal_client: true,
        client_service: "fortnite",
        displayName: req.user.username,
        app: "fortnite",
        in_app_id: req.user.accountId,
        device_id: deviceId
    });

    await kv.set(req.user.discordId, 'false');

});

app.get("/account/api/oauth/verify", verifyToken, (req: { headers: { [x: string]: string; }; user: { accountId: any; username: any; }; }, res: { json: (arg0: { token: any; session_id: any; token_type: string; client_id: any; internal_client: boolean; client_service: string; account_id: any; expires_in: number; expires_at: any; auth_method: any; display_name: any; app: string; in_app_id: any; device_id: any; }) => void; }) => {
    let token = req.headers["authorization"].replace("bearer ", "");
    const decodedToken = jwt.decode(token.replace("eg1~", ""));

    res.json({
        token: token,
        session_id: decodedToken.jti,
        token_type: "bearer",
        client_id: decodedToken.clid,
        internal_client: true,
        client_service: "fortnite",
        account_id: req.user.accountId,
        expires_in: Math.round(((DateAddHours(new Date(decodedToken.creation_date), decodedToken.hours_expire).getTime()) - (new Date().getTime())) / 1000),
        expires_at: DateAddHours(new Date(decodedToken.creation_date), decodedToken.hours_expire).toISOString(),
        auth_method: decodedToken.am,
        display_name: req.user.username,
        app: "fortnite",
        in_app_id: req.user.accountId,
        device_id: decodedToken.dvid
    });
});

app.delete("/account/api/oauth/sessions/kill", (req: any, res: { status: (arg0: number) => { (): any; new(): any; end: { (): void; new(): any; }; }; }) => {
    res.status(204).end();
});

app.delete("/account/api/oauth/sessions/kill/:token", (req: { params: { token: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; end: { (): void; new(): any; }; }; }) => {
    let token = req.params.token;

    let accessIndex = global.accessTokens.findIndex((i: { token: any; }) => i.token == token);

    if (accessIndex != -1) {
        let object = global.accessTokens[accessIndex];

        global.accessTokens.splice(accessIndex, 1);

        let xmppClient = global.Clients.find((i: { token: any; }) => i.token == object.token);
        if (xmppClient) xmppClient.client.close();

        let refreshIndex = global.refreshTokens.findIndex((i: { accountId: any; }) => i.accountId == object.accountId);
        if (refreshIndex != -1) global.refreshTokens.splice(refreshIndex, 1);
    }

    let clientIndex = global.clientTokens.findIndex((i: { token: any; }) => i.token == token);
    if (clientIndex != -1) global.clientTokens.splice(clientIndex, 1);

    if (accessIndex != -1 || clientIndex != -1) functions.UpdateTokens();

    res.status(204).end();
});

function DateAddHours(pdate: Date, number: any) {
    let date = pdate;
    date.setHours(date.getHours() + number);

    return date;
}

module.exports = app;
