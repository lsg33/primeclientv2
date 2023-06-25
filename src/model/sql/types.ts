import { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely'

export interface Database {
    Users: UserTable
    Profiles: ProfileTable
    MMCodes: MMCodesTable
    Friends: FriendTable
}

export interface UserTable {
    id: Generated<number>
    banned: Boolean,
    discordId: String,
    accountId: String,
    username: String,
    username_lower: String,
    email: String,
    password: String,
    mfa: Boolean,
    matchmakingId: String,
    canCreateCodes: Boolean
    isServer: Boolean
    created_at: ColumnType<Date, string | undefined, never>
}

export type Person = Selectable<UserTable>
export type NewPerson = Insertable<UserTable>
export type EditedPerson = Updateable<UserTable>

export interface ProfileTable {
    created: Date,
    accountId: String,
    profiles: any
}

export type Profile = Selectable<ProfileTable>
export type NewProfile = Insertable<ProfileTable>
export type EditedProfile = Updateable<ProfileTable>

export interface MMCodesTable {
    created: Date,
    ownerId: string,
    code: String,
    code_lower: String,
    ip: String
    port: Number
}

export type MMCodes = Selectable<MMCodesTable>
export type NewMMCodes = Insertable<MMCodesTable>
export type EditedMMCodes = Updateable<MMCodesTable>

export interface FriendTable {
    created: Date,
    accountId: String,
    list: any
}

export type Friend = Selectable<FriendTable>
export type NewFriend = Insertable<FriendTable>
export type EditedFriend = Updateable<FriendTable>