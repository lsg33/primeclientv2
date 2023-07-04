export { }

import { PermissionFlagsBits } from "discord.js";
import path from "path";
import fs from "fs";

const { SlashCommandBuilder } = require('discord.js');
const Users = require('../../../model/user');
const Profiles = require('../../../model/profiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addallname')
        .setDescription('Allows you to give a user all cosmetics via their username.')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username of the user you want to give all cosmetics to')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),


    async execute(interaction) {

        let username = interaction.options.getString('username');

        const user = await Users.findOne({ username_lower: username.toLowerCase() });
        if (!user) return interaction.reply({ content: "That user does not own an account", ephemeral: true });
        const profile = await Profiles.findOne({ accountId: user.accountId });
        if(!profile) return interaction.reply({ content: "That user does not have a profile", ephemeral: true });

        const allItems = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../../Config/DefaultProfiles/allathena.json"), 'utf8'))

        Profiles.findOneAndUpdate({ accountId: user.accountId }, { $set: { "profiles.athena.items": allItems.items } }, { new: true }, (err, doc) => {
            if (err) console.log(err);

        });
        
        await interaction.reply({ content: "Successfully added all skins to the selected account", ephemeral: true });

    },
};