import mongoose, { Document } from "mongoose";

export interface iProfile extends Document {
    created: Date,
    accountId: string,
    profiles: object
}

const ProfilesSchema = new mongoose.Schema<iProfile>(
    {
        created: { type: Date, required: true },
        accountId: { type: String, required: true, unique: true },
        profiles: { type: Object, required: true }
    },
    {
        collection: "profiles"
    }
);

const ProfileModel = mongoose.model<iProfile>('Profile', ProfilesSchema);

export default ProfileModel;