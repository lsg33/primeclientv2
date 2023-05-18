export { }

import { Hash } from "crypto";
import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { Asteria } from "momentumsdk";

const { SlashCommandBuilder } = require('discord.js');
const functions = require('../../../structs/functions.js');
const Users = require('../../../model/user');
const Profiles = require('../../../model/profiles');

const asteria = new Asteria({
    collectAnonStats: true,
    throwErrors: true,
});

let id: string;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addcosmetic')
        .setDescription('Allows you to give a user any skin, pickaxe, glider, etc.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to give the cosmetic to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('cosmeticname')
                .setDescription('The name of the cosmetic you want to give')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),


    async execute(interaction) {

        const selectedUser = interaction.options.getUser('user');
        const selectedUserId: Number = selectedUser.id;

        const user = await Users.findOne({ discordId: selectedUserId });
        if (!user) return interaction.reply({ content: "That user does not own an account", ephemeral: true });

        const cosmeticname: string = interaction.options.getString('cosmeticname');

        let cosmetic: any = {};

        try {
            cosmetic = await asteria.getCosmetic("name", cosmeticname);
        } catch (err) {
            console.log(err);
            return await interaction.reply({ content: "That cosmetic does not exist", ephemeral: true });
        }

        console.log(cosmetic.name);

        const updatedProfile = await Profiles.findOneAndUpdate(
            { accountId: user.accountId },
            {
                $set: {
                    [`profiles.athena.items.${cosmetic.type.backendValue}:${cosmetic.id}`]: {
                        templateId: `${cosmetic.type.backendValue}:${cosmetic.id}`,
                        attributes: {
                            item_seen: false,
                            variants: [],
                            favorite: false,
                        },
                        "quantity": 1,
                    },
                },
            },
            { new: true },
        )
            .catch((err) => {
                console.log(err)
            })

        const embed = new EmbedBuilder()
            .setTitle("Cosmetic added")
            .setDescription("Successfully gave the user the cosmetic: " + cosmetic.name)
            .setThumbnail(cosmetic.images.icon)
            .setColor("#313338")
            .setFooter({
                text: "Momentum",
                iconURL: "https://cdn.discordapp.com/app-assets/432980957394370572/1084188429077725287.png",
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

    },
};