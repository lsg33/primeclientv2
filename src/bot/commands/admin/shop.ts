export { }

import { Hash } from "crypto";
import { ActionRowBuilder, EmbedBuilder, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle } from "discord.js";
import path from "path";

const { SlashCommandBuilder } = require('discord.js');
const functions = require('../../../structs/functions.js');
const Users = require('../../../model/user');
const Profiles = require('../../../model/profiles');
const fs = require('fs/promises');

let id: string;

module.exports = {
    data: new SlashCommandBuilder()
    .setName('setshop')
    .setDescription('Sets the item shop')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        return interaction.reply({ content: "This command is currently disabled.", ephemeral: true });

        const shopContent = await fs.readFile(path.join(__dirname, '../../../../responses/catalog.json'), 'utf8');

        const modal = new ModalBuilder()
            .setCustomId('shopmodal')
            .setTitle('Shop modal');

            const shopJSON = new TextInputBuilder()
            .setCustomId('shopjson')
            .setLabel('The JSON of the shop')
            .setPlaceholder("Enter your JSON here")
            .setStyle(TextInputStyle.Paragraph)

            const firstActionRow = new ActionRowBuilder().addComponents(shopJSON);

            modal.addComponents(firstActionRow as any);

            await interaction.showModal(modal);
    },
};