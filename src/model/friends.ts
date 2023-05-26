import mongoose, { Document } from "mongoose";

export interface iFriends extends Document {
    created: Date,
    accountId: string,
    list: {
        accepted: string[],
        incoming: string[],
        outgoing: string[],
        blocked: string[]
    }
}

const FriendsSchema = new mongoose.Schema<iFriends>(
    {
        created: { type: Date, required: true },
        accountId: { type: String, required: true, unique: true },
        list: { type: Object, default: { accepted: [], incoming: [], outgoing: [], blocked: [] } }
    },
    {
        collection: "friends"
    }
);

const FriendsModel = mongoose.model<iFriends>('Friends', FriendsSchema);

export default FriendsModel;