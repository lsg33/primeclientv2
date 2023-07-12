import { Client, Partials, Collection, Events, GatewayIntentBits, ActivityType, SlashCommandBuilder } from 'discord.js';
import path from 'node:path';
import logger from '../utilities/structs/log.js';
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
const basePath = process.cwd();
const foldersPath = path.join(basePath, 'build', 'bot', 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

	for (const file of commandFiles) {
		try {
			const command = await import(`file://${path.join(commandsPath, file)}`);

			if (command.data && 'execute' in command) {
				client.commands.set(command.data.name, command);
			} else {
				logger.error(`[WARNING] The command at ${path.join(commandsPath, file) } is missing a required "data" or "execute" property.`);
			}
		} catch (error) {
			logger.error(`[ERROR] Error loading command file at ${path.join(commandsPath, file) }: ${error}`);
		}
	}
}

client.once(Events.ClientReady, async () => {
	let clientId = await client.application?.id;
	global.clientId = clientId;
	import('./deploy-commands.js');
});

client.once(Events.ClientReady, async c => {
	logger.bot(`[READY] Logged in as ${client.user?.tag}!`);
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

interface Command {
	data: SlashCommandBuilder;
	execute(interaction: any): Promise<void>;
}