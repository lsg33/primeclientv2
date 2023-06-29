import { iUser } from "../model/user";
import functions from "./structs/functions";

class Party {

    public parties:any = [];

    public async createParty(user: iUser, meta: any) {

        const newParty = {
            applicants: [],
            config: {
                discoverability: "ALL",
                intention_ttl: 60,
                invite_ttl: 14400,
                join_confirmation: true,
                joinability: "OPEN",
                max_size: 16,
                sub_type: "default",
                type: "DEFAULT",
            },
            created_at: new Date().toISOString(),
            id: functions.MakeID(), //Party ID
            intentions: [],
            revision: 1,
            invites: [],
            members: [
                {
                    account_id: user.accountId,
                    meta: {},
                    connections: [],
                    revision: 0,
                    updated_at: new Date().toISOString(),
                    joined_at: new Date().toISOString(),
                    role: "CAPTAIN",
                }
            ],
            meta: meta
        };

        this.parties.push(newParty);

        return newParty;

    }

} 

export default new Party();