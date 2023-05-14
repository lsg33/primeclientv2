import { EmbedBuilder } from "discord.js";

export { }

const { SlashCommandBuilder } = require('discord.js');
const functions = require('../../../structs/functions.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('register')
		.setDescription('Creates an account for you')
		.addStringOption(option =>
			option.setName('username')
				.setDescription('The username you want to use')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('email')
				.setDescription('The email you want to use')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('password')
				.setDescription('The password you want to use')
				.setRequired(true)),


	async execute(interaction) {

		const discordId = interaction.user.id;
		const username = interaction.options.getString('username');
		const email = interaction.options.getString('email');
		const plainPassword = interaction.options.getString('password');

		let error:boolean = false;

		const register = await functions.registerUser(discordId, username, email, plainPassword);
		const message = register.message;
		if (message.includes("error")) {
			await interaction.reply({ content: message, ephemeral: true });
			error = true;
			return;
		} else if (message.includes("already")) {
			await interaction.reply({ content: message, ephemeral: true });
			error = true;
			return;
		} else if (message.includes("password")) {
			await interaction.reply({ content: message, ephemeral: true });
			error = true;
			return;
		} else if (message.includes("valid ")) {
			await interaction.reply({ content: message, ephemeral: true });
			error = true;
			return;
		}

		const publicembed = new EmbedBuilder()
			.setTitle("Thank you!")
			.setDescription("Thank you for registering at Momentum! As a reward you have been granted 500 vBucks you can use in the shop.")
			.addFields(
				{
					name: "Username",
					value: username,
				},
				{
					name: "Email",
					value: email,
				},
			)
			.setColor("#313338")
			.setFooter({
				text: "Momentum",
				iconURL: "https://cdn.discordapp.com/app-assets/432980957394370572/1084188429077725287.png",
			})
			.setTimestamp();

		const embed = new EmbedBuilder()
			.setTitle("Account created")
			.setDescription("Your account has been successfully created")
			.addFields(
				{
					name: "Username",
					value: username,
				},
				{
					name: "Email",
					value: email,
				},
			)
			.setColor("#313338")
			.setFooter({
				text: "Momentum",
				iconURL: "https://cdn.discordapp.com/app-assets/432980957394370572/1084188429077725287.png",
			})
			.setTimestamp();

		await interaction.reply({ content: message, ephemeral: true });
		if (!error) {
			await interaction.user.send({ embeds: [publicembed] });
		}
	},
};