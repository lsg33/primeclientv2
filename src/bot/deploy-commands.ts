export {  }

const dotenv = require("dotenv");
const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

import log from "../structs/log";
import logger from "../structs/log";
import safety from "../utilities/safety";

const { REST, Routes } = require('discord.js');
const clientId = safety.env.CLIENT_ID;
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
		let data;
		if(safety.isDev === true) {
			log.warn("In dev mode, deploying to guild");
		data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		)} else {
			data = await rest.put(
				Routes.applicationCommands(clientId),
				{ body: commands },
			);
		}

		logger.debug(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();