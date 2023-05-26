import jwt from 'jsonwebtoken';
import { Request } from 'express';
const User = require("../model/user");
const { DateAddHours } = require("../structs/functions.js")

class decode {
    public async decodeAuth(req: Request) {
        const token = req.headers.authorization?.replace('bearer eg1~', '');

        if (!token || !global.accessTokens.find(i => i.token === `eg1~${token}`)) {
            throw new Error('Invalid token.');
        }

        const decodedToken = jwt.decode(token);
        const user = await User.findOne({ accountId: decodedToken.sub });

        return user;
    }
}

export default new decode();