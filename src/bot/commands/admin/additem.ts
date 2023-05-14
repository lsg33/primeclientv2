export { }

import { Hash } from "crypto";
import { EmbedBuilder, PermissionFlagsBits } from "discord.js";

const { SlashCommandBuilder } = require('discord.js');
const functions = require('../../../structs/functions.js');
const Users = require('../../../model/user');
const Profiles = require('../../../model/profiles');

let id:string;

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
        const selectedUserId:Number = selectedUser.id;

        const user = await Users.findOne({ discordId:  selectedUserId });
        if (!user) return interaction.reply({ content: "That user does not own an account", ephemeral: true });

		const cosmeticname:string = interaction.options.getString('cosmeticname');

        const skin:any = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search?name=${cosmeticname}`, {
            method: 'GET',                
        }).then(response => response.json());

        console.log(skin);

        if (skin.data) {
            id = skin.data.id;
        } else {
            return interaction.reply({ content: "That is not a valid cosmetic name", ephemeral: true });
        }
        
        const updatedProfile = await Profiles.findOneAndUpdate(
            { accountId: user.accountId },
            {
                $set: {
                    [`profiles.athena.items.${skin.data.type.backendValue}:${skin.data.id}`]: {
                        templateId: `${skin.data.type.backendValue}:${skin.data.id}`,
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
			.setDescription("Successfully gave the user the cosmetic: " + id)
            .setThumbnail(skin.data.images.icon)
			.setColor("#313338")
			.setFooter({
				text: "Momentum",
				iconURL: "https://cdn.discordapp.com/app-assets/432980957394370572/1084188429077725287.png",
			})
			.setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

	},
};