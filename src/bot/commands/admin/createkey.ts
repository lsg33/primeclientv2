export { }

import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
const Api = require('../../../model/api');

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('createkey')
		.setDescription('Creates a new api key')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setDMPermission(false),

	async execute(interaction) {

		await interaction.deferReply({ ephemeral: true });

		//generate 32 character key
		const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let result = '';
		const charactersLength = characters.length;
		for (let i = 0; i < 32; i++) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}

		const newKey = new Api({
			created: Date.now(),
			apiKey: result,
			access: "user",
		}, async (err, api) => {
			if (err) return console.log(err);
		});

		newKey.save()
			.then(async result => {
				await interaction.editReply({ content: "Api key created! Key: " + result.apiKey });
			})
			.catch(async error => {
				console.error(error);
				await interaction.editReply({ content: "An error occured while creating the api key" });
			});

	},
};