import { Hash } from "crypto";
import { EmbedBuilder } from "discord.js";

export { }

const { SlashCommandBuilder } = require('discord.js');
const Users = require('../../../model/user');
const Profiles = require('../../../model/profiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('account')
        .setDescription('Shows you your account information'),


    async execute(interaction) {
        const user = await Users.findOne({ discordId: interaction.user.id });
        if (!user) return interaction.reply({ content: "You are not registered!", ephemeral: true });

        const profile = await Profiles.findOne({ accountId: user.accountId });

        const selectedSkin = profile.profiles.athena.stats.attributes.favorite_character;
        const selectedSkinSplit = selectedSkin.split(":") || "CID_005_Athena_Commando_M_Default";

        const skin:any = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search?id=${selectedSkinSplit[1]}`, {
            method: 'GET',                
        }).then(response => response.json());

        let icon = "https://nexusassets.zetax.workers.dev/ceba508f24a70c50bd8782d08bd530b0d0df82e0baf7e357bcfd01ac81898297.gif";

        if (skin.data) {
            icon = skin.data.images.icon;
        }

        const embed = new EmbedBuilder()
            .setTitle("Your account")
            .setDescription("These are your account details")
            .setColor("#313338")
            .addFields([
                {
                    name: "Username",
                    value: user.username,
                    inline: true
                },
                {
                    name: "Email",
                    value: user.email,
                    inline: true
                },
                {
                    name: "Account ID",
                    value: user.accountId
                },
            ])
            .setThumbnail(icon)
            .setFooter({
                text: "Momentum",
                iconURL: "https://cdn.discordapp.com/app-assets/432980957394370572/1084188429077725287.png",
            })
            .setTimestamp();

        interaction.reply({ embeds: [embed], ephemeral: true });

    },
};