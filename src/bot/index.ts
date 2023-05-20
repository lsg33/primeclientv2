import { ReactionCollector } from "discord.js";

export { }

const dotenv = require("dotenv");
const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const axios = require("axios");
import logger from '../structs/log';
import safety from "../utilities/safety";

const kvjs = require('@heyputer/kv.js');
const kv = new kvjs();

const refreshCommands = require('./deploy-commands');

const { Client, Collection, Events, GatewayIntentBits, ActivityType } = require('discord.js');
const fs = require('node:fs');
const token = safety.env.BOT_TOKEN;

const client = new Client({
	partials: ['CHANNEL', "MESSAGE", "REACTION"],
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessageTyping,
		GatewayIntentBits.GuildMessageTyping,
	],
	presence: {
		activities: [{
			name: 'Momentum',
			type: ActivityType.Playing,
		}],
		status: 'online',
	},
});

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			logger.error(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
};


client.once(Events.ClientReady, c => {
	logger.bot(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error: any) {
		logger.error(error.toString());
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isModalSubmit()) return;
	if (interaction.customId === 'shopmodal') {
		const shopJSON = interaction.fields.getTextInputValue('shopjson');
		try {
			JSON.parse(shopJSON);
			await fs.writeFile(path.join(__dirname, '../../responses/catalog.json'), shopJSON);
			await interaction.reply({ content: 'Your submission was received successfully!' });
		} catch (error) {
			return await interaction.followUp({ content: 'The JSON you provided is invalid!' });
		}
	}
	console.log(interaction);
});

client.login(token);

export default client;