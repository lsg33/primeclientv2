export { }

import { EmbedBuilder } from "discord.js";

const { SlashCommandBuilder } = require('discord.js');
const Users = require('../../../model/user');
const Profiles = require('../../../model/profiles');
const mmcodes = require('../../../model/mmcodes');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deletecode')
        .setDescription('Deletes a custom matchmaking code')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('The code you want to delete')
                .setRequired(true)),

    async execute(interaction) {

        try {

            const user = await Users.findOne({ discordId: interaction.user.id });
            if (!user) return interaction.reply({ content: "You are not registered!", ephemeral: true });
            if (!user.canCreateCodes) return interaction.reply({ content: "You are not allowed to create or delete codes!", ephemeral: true });

            const code = interaction.options.getString('code');

            const codeExists = await mmcodes.findOne({ code_lower: code.toLowerCase() }).populate("owner");
            if (!codeExists) return interaction.reply({ content: "This code doesn't exist", ephemeral: true });

            if (codeExists.owner.discordId !== interaction.user.id) return interaction.reply({ content: "You are not the owner of this code", ephemeral: true });

            await mmcodes.deleteOne({ code_lower: code.toLowerCase() });

            const embed = new EmbedBuilder()
                .setTitle("Code deleted")
                .setDescription(`Your code \`${code}\` has been deleted`)
                .setColor("#2b2d31")
                .setFooter({
                    text: "Momentum",
                    iconURL: "https://cdn.discordapp.com/app-assets/432980957394370572/1084188429077725287.png",
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (err) {
            await interaction.reply({ content: "An error occured while creating your code. Please try again later.", ephemeral: true });
        }

    },
};