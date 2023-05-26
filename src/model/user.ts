import mongoose, { Document } from "mongoose";

export interface iUser extends Document {
    created: Date,
    banned: boolean,
    discordId: string,
    accountId: string,
    username: string,
    username_lower: string,
    email: string,
    password: string,
    mfa: boolean,
    gameserver: string | null,
    canCreateCodes: boolean,
    isServer: boolean
}

const UserSchema = new mongoose.Schema<iUser>(
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
);

const UserModel = mongoose.model<iUser>('User', UserSchema);

export default UserModel;