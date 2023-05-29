export { }

const path = require("path");

import client from ".";
import log from "../utilities/structs/log";
import logger from "../utilities/structs/log";
import safety from "../utilities/safety";
const { Client, Collection, Events, GatewayIntentBits, ActivityType } = require('discord.js');
const Discord = require("discord.js");

const { REST, Routes } = require('discord.js');
const guildId = safety.env.GUILD_ID;
const token = safety.env.BOT_TOKEN;

const fs = require('node:fs');

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		//@ts-ignore
		commands.push(command.data.toJSON());
	}
}

const rest = new REST().setToken(token);

(async () => {

	try {
		logger.debug(`Started refreshing ${commands.length} application (/) commands.`);
		let data: string | any[];
		if (safety.isDev === true) {
			log.warn("In dev mode, deploying to guild");
			data = await rest.put(
				Routes.applicationGuildCommands(global.clientId, guildId),
				{ body: commands },
			)
		} else {
			log.bot("In prod mode, deploying globally");
			data = await rest.put(
				Routes.applicationCommands(global.clientId),
				{ body: commands },
			);
		}

		logger.debug(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();