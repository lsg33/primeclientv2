import { Hash } from "crypto";
import { EmbedBuilder } from "discord.js";

export { }

const { SlashCommandBuilder } = require('discord.js');
const Users = require('../../../model/user');
const Profiles = require('../../../model/profiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mfa')
        .setDescription('Toggles the multi factor authentication for your account'),

    async execute(interaction) {

        const user = await Users.findOne({ discordId: interaction.user.id });
        if (!user) return interaction.reply({ content: "You are not registered!", ephemeral: true });

        //toggle mfa in mongodb
        const updatedUser = await Users.findOneAndUpdate({ discordId: interaction.user.id }, { mfa: !user.mfa }, { new: true });

        const embed = new EmbedBuilder()
            .setTitle(`MFA ${updatedUser.mfa ? "Enabled" : "Disabled"}`)
            .setDescription("MFA has been toggled")
            .setColor("#313338")
            .addFields([
                {
                    name: "Username",
                    value: user.username,
                    inline: true
                },
                {
                    name: "Email",
                    value: user.email,
                    inline: true
                },
                {
                    name: "Account ID",
                    value: user.accountId
                },
            ])
            .setFooter({
                text: "Momentum",
                iconURL: "https://cdn.discordapp.com/app-assets/432980957394370572/1084188429077725287.png",
            })
            .setTimestamp();

        interaction.reply({ embeds: [embed], ephemeral: true });

    },
};