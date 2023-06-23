export { };

import Redis from "ioredis";
import functions from "../utilities/structs/functions";
import kv from "../utilities/kv";
import safety from "../utilities/safety";
import { WebSocket } from "ws";
import { Request } from "express";

const User = require("../model/user");

const sub = new Redis(safety.env.REDIS_URL);
const pub = new Redis(safety.env.REDIS_URL);
const redis = new Redis(safety.env.REDIS_URL);

type Client = {
    matchmakingId: string,
    playlist: string,
    position: number,
    socket: Object
}

class matchmaker {

    // Create a map to store clients
    clients = new Map();

    public async server(ws: WebSocket, req: Request) {

        const auth = req.headers.authorization;

        let clientList = this.clients;

        // Check if the authorization header is undefined
        if (auth == undefined) {
            // Handle unauthorized connection
            return ws.close();
        }

        // Destructure the authorization header
        let [_, __, ___, matchmakingId, playlist] = auth.split(" ");

        // Check if playlist and matchmakingId are valid
        try {

            if (typeof (playlist) !== "string") {
                ws.send(JSON.stringify({
                    payload: {
                        state: "Error",
                        error: "errors.com.epicgames.matchmaker.invalid_playlist",
                        errorMessage: "Invalid playlist",
                    }
                }));
                // Handle invalid playlist error
                return ws.close();
            }

            // Get the number of already queued players
            let queuedPlayers = await redis.get(`${playlist}-queued`);
            let position = (queuedPlayers ? parseInt(queuedPlayers) : 0) + 1;

            const clientInfo: Client = {
                matchmakingId: matchmakingId,
                playlist: playlist,
                position: position,
                socket: ws
            }

            this.clients.set(matchmakingId, clientInfo);

            sub.subscribe(`${playlist}-status`);
            sub.subscribe(`${playlist}-queued`);

            const account = await User.findOne({ matchmakingId: matchmakingId });
            if (!account) {
                // Handle invalid account error
                return ws.close();
            }
            //console.log('Client connected for playlist ' + playlist + ' with accountId ' + matchmakingId + ' position ' + position);
        } catch (err) {
            ws.send(JSON.stringify({
                payload: {
                    state: "Error",
                    error: "errors.com.epicgames.common.matchmaker.invalid_token",
                    errorMessage: "Invalid token",
                }
            }));
            // Handle error in token parsing
            return ws.close();
        }

        ws.on('close', async () => {
            //console.log(`Client disconnected for playlist ${playlist} with account ID ${matchmakingId} position ${position}`);
            this.clients.delete(matchmakingId);

            // Decrement the number of queued players in Redis
            const players = await redis.decr(`${playlist}-queued`);
            await pub.publish(`${playlist}-queued`, players.toString());
            //console.log(`Closed. Players remaining: ${players}`);

            // Decrease the position of the remaining players in the queue
            const remainingClients = Array.from(this.clients.values()).filter(client => client.playlist === playlist);
            remainingClients.forEach(async (client) => {
                if (client.position > position) {
                    client.position -= 1;
                }
            });
        });

        const ticketId = functions.MakeID().replace(/-/ig, "");
        const matchId = functions.MakeID().replace(/-/ig, "");
        const sessionId = functions.MakeID().replace(/-/ig, "");

        setTimeout(Connecting, 200);
        setTimeout(Waiting, 1000);
        let position = await redis.incr(`${playlist}-queued`);
        await pub.publish(`${playlist}-queued`, position.toString());
        setTimeout(async function () {
            Queued(position);
        }, 1000);

        sub.on("message", async (channel, message) => {

            switch (channel) {
                case `${playlist}-queued`:
                    Queued(parseInt(message));
                    break;
                case `${playlist}-status`:
                    if (message === "online") {
                        for (const [key, value] of this.clients.entries()) {
                            if (value.playlist === playlist && value.position <= 100) {
                                setTimeout(SessionAssignment, 2000);
                                setTimeout(Join, 3000);
                                this.clients.delete(key);
                                console.log(`Session assigned. Players remaining: ${this.clients.size}`);
                            }
                        }
                        if (this.clients.size > 100) {
                            const remainingClients = Array.from(this.clients.values()).filter(client => client.playlist === playlist);
                            remainingClients.forEach(async (client) => {
                                client.position -= 100;
                                console.log(`Position decremented by 100. New position: ${client.position} for client ${client.matchmakingId}`);
                                return;
                            });
                        } else {
                            const remainingClients = Array.from(this.clients.values()).filter(client => client.playlist === playlist);
                            remainingClients.forEach(async (client) => {
                                client.position -= (this.clients.size - 1);
                                console.log(`Position decremented. New position: ${client.position} for client ${client.matchmakingId}`);
                                return;
                            });
                        }
                        console.log("No more players in queue. Size: " + this.clients.size);
                    }
                    break;
                default:
                    // Handle unknown channel
                    break;
            }
        });

        async function Connecting() {
            // Send a "Connecting" status update to the client
            ws.send(
                JSON.stringify({
                    payload: {
                        state: "Connecting",
                    },
                    name: "StatusUpdate",
                }),
            );
        }

        async function Waiting(players: number) {
            // Send a "Waiting" status update to the client with the total number of players
            ws.send(
                JSON.stringify({
                    payload: {
                        totalPlayers: players,
                        connectedPlayers: players,
                        state: "Waiting",
                    },
                    name: "StatusUpdate",
                }),
            );
        }

        async function Queued(players: number) {
            console.log(`Queued. Players: ${players}. Typeof players: ${typeof players}`);
            // Send a "Queued" status update to the client with the ticket ID, queued players, and estimated wait time

            //for each player, console log their position in the queue

            for (const [key, value] of clientList.entries()) {
                if (value.playlist === playlist) {
                    console.log(`Client ${value.matchmakingId} is in position ${value.position}`);
                }
            }

            ws.send(
                JSON.stringify({
                    payload: {
                        ticketId: ticketId,
                        queuedPlayers: players,
                        estimatedWaitSec: 3,
                        status: {},
                        state: "Queued",
                    },
                    name: "StatusUpdate",
                }),
            );
        }

        async function SessionAssignment() {
            console.log(`SessionAssignment. MatchId: ${matchId}`);
            // Send a "SessionAssignment" status update to the client with the match ID
            ws.send(
                JSON.stringify({
                    payload: {
                        matchId: matchId,
                        state: "SessionAssignment",
                    },
                    name: "StatusUpdate",
                }),
            );
        }

        async function Join() {
            // Send a "Play" message to the client with the match ID, session ID, and join delay
            ws.send(
                JSON.stringify({
                    payload: {
                        matchId: matchId,
                        sessionId: sessionId,
                        joinDelaySec: 1,
                    },
                    name: "Play",
                }),
            );
        }
    }
}

export default new matchmaker();