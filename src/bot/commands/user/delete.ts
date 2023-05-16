import { Hash } from "crypto";
import { EmbedBuilder } from "discord.js";

export { }

const { SlashCommandBuilder } = require('discord.js');
const Users = require('../../../model/user');
const Profiles = require('../../../model/profiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deleteaccount')
        .setDescription('Deletes your account (irreversible)'),

    async execute(interaction) {

        const user = await Users.findOne({ discordId: interaction.user.id });
        if (!user) return interaction.reply({ content: "You are not registered!", ephemeral: true });

        await Users.findOneAndDelete({ discordId: interaction.user.id });

        const embed = new EmbedBuilder()
            .setTitle(`Account Deleted`)
            .setDescription("Your account has been deleted, we're sorry to see you go!")
            .setColor("#313338")
            .setFooter({
                text: "Momentum",
                iconURL: "https://cdn.discordapp.com/app-assets/432980957394370572/1084188429077725287.png",
            })
            .setTimestamp();

        interaction.reply({ embeds: [embed], ephemeral: true });

    },
};