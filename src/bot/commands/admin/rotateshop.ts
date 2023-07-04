import { AttachmentBuilder, CommandInteraction, EmbedBuilder, PermissionFlagsBits } from "discord.js";
const Canvas = require('@napi-rs/canvas');
import Shop from "../../../utilities/shop";
import Safety from "../../../utilities/safety";

const { SlashCommandBuilder } = require('discord.js');
const Users = require('../../../model/user');
const Profiles = require('../../../model/profiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rotateshop')
        .setDescription('Rotates the shop')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    async execute(interaction) {
        await interaction.deferReply();

        const shopItems: any[] = await Shop.updateShop(await Safety.getLoopKey());
        const rowCount = 2; // Number of rows
        const maxItemsPerRow = Math.ceil(shopItems.length / rowCount);
        const rowWidth = 800; // Maximum width for each row
        const columnHeight = 540; // Maximum height for each column
        const canvasWidth = rowWidth * Math.ceil(shopItems.length / rowCount);
        const canvasHeight = columnHeight * rowCount;

        const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);
        const context: CanvasRenderingContext2D = canvas.getContext('2d');

        // Clear the canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        const backgroundImage = await Canvas.loadImage('https://cdn.nexusfn.net/file/2023/07/2p0whppkorm21.webp');
        context.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

        const imagePromises = shopItems.map(async (item, i) => {
            const imageBuffer = await fetch(item.images.icon).then((res: any) => res.arrayBuffer());
            const loadImage = await Canvas.loadImage(imageBuffer);

            const aspectRatio = loadImage.width / loadImage.height;
            const imageHeight = columnHeight;
            const imageWidth = imageHeight * aspectRatio;

            const rowIndex = Math.floor(i / maxItemsPerRow);
            const columnIndex = i % maxItemsPerRow;
            const xOffset = columnIndex * rowWidth;
            const yOffset = rowIndex * columnHeight;

            // Save the canvas state before drawing the image
            context.save();

            // Translate the canvas to the correct position and scale it to the correct size
            context.translate(xOffset, yOffset);
            context.scale(imageWidth / loadImage.width, imageHeight / loadImage.height);

            // Draw the image
            context.drawImage(loadImage, 0, 0);

            // Restore the canvas state after drawing the image
            context.restore();
        });

        await Promise.all(imagePromises);

        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'combined_shop.png' });

        await interaction.editReply({ content: "The item shop has been rotated!", files: [attachment] });
    }
};