export { }

import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
const Users = require('../../../model/user');
const Profiles = require('../../../model/profiles');

const { SlashCommandBuilder } = require('discord.js');
const functions = require('../../../structs/functions.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete')
		.setDescription('Deletes a users account')
		.addUserOption(option =>
			option.setName('user')
                .setDescription('The user whose account you want to delete')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for deleting the account')
                .setRequired(true))
	.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
	.setDMPermission(false),


	async execute(interaction) {

        const discordId:string = interaction.options.getUser('user').id;
        const reason:string = interaction.options.getString('reason');

        const deleteAccount = await Users.deleteOne({ discordId: discordId })
        .lean();

		if (deleteAccount.username == null) {
			await interaction.reply({ content: "The selected user does not have an account", ephemeral: true });
			return;
		}

        const deleteProfile = await Profiles.deleteOne({ accountId: deleteAccount.discordId })
        .lean();

		const embed = new EmbedBuilder()
			.setTitle("Account deleted")
			.setDescription("The account has been deleted")
			.addFields(
				{
					name: "Reason",
					value: reason,
				},
			)
			.setColor("#2b2d31")
			.setFooter({
				text: "Momentum",
				iconURL: "https://cdn.discordapp.com/app-assets/432980957394370572/1084188429077725287.png",
			})
			.setTimestamp();

			await interaction.reply({ embeds: [embed], ephemeral: true });
            await interaction.options.getUser('user').send({ content: "Your account has been deleted by an administrator" });
	},
};