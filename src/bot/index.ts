export { }

import { User, EmbedBuilder, GuildMember, Client, Partials, Collection, Events, GatewayIntentBits, ActivityType } from 'discord.js';
import path from 'node:path';
import logger from '../utilities/structs/log';

import fs from 'node:fs';

export const client: any = new Client({
	partials: [Partials.Channel, Partials.Message, Partials.Reaction],
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

client.once(Events.ClientReady, async c => {
	let clientId = await client.application?.id;
	global.clientId = clientId;
	import('./deploy-commands');
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) await interaction.reply({ content: 'This command does not exist', ephemeral: true });

	try {
		await command.execute(interaction);
	} catch (error: any) {
		console.log(error.toString());
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});