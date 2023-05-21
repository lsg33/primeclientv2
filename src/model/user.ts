export { };

const mongoose = require("mongoose");

export interface iUser {
    created: Date,
    banned: Boolean,
    discordId: String,
    accountId: String,
    username: String,
    username_lower: String,
    email: String,
    password: String,
    mfa: Boolean,
    gameserver: String
    canCreateCodes: Boolean
    isServer: Boolean
}

const UserSchema = new mongoose.Schema(
    {
        created: { type: Date, required: true },
        banned: { type: Boolean, default: false },
        discordId: { type: String, required: true, unique: true },
        accountId: { type: String, required: true, unique: true },
        username: { type: String, required: true, unique: true },
        username_lower: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        mfa: { type: Boolean, default: false },
        gameserver: { type: String, default: null },
        canCreateCodes: { type: Boolean, default: false },
        isServer: { type: Boolean, default: false }
    },
    {
        collection: "users"
    }
)

const model = mongoose.model('UserSchema', UserSchema);

module.exports = model;