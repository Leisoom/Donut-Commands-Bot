const api = require('../../src/utils/api');
const { SlashCommandBuilder,AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const {createCanvas, loadImage, registerFont} = require('canvas');
const path = require('node:path');


function formatGameDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function formatMoney(number){
    const formatted = new Intl.NumberFormat('en', { 
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1
        }).format(number);

    return formatted;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('card')
        .setDescription('Generate stats card for user')
	    .addStringOption((option) => option.setName('user').setDescription('The user to generate stats card for').setRequired(true)),

    async execute(interaction) {

        const user = interaction.options.getString('user');

        try {

            let response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${user}/`);
            const uuid = response.data.id;

            response = await api.get(`/stats/${user}`);

            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(response.data.result.money);

            const r = response.data.result;

            const canvas = createCanvas(1920, 1080);
		    const ctx = canvas.getContext('2d');

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
    
            const statsArray = [
                `Money ${formatted}`,
                `Shards: ${r.shards}`,
                `Playtime: ${formatGameDuration(r.playtime)}`,
                `Kills: ${r.kills}`,
                `Deaths: ${r.deaths}`,
                `Mobs Killed: ${r.mobs_killed}`,
                `Money Made From Sell: ${formatMoney(r.money_made_from_sell)}`,
                `Money Spent on Shop: ${formatMoney(r.money_spent_on_shop)}`,
                `Placed Blocks: ${r.placed_blocks}`,
                `Blocks Brocken: ${r.broken_blocks}`
            ];

            let imagePath = path.join(__dirname, '..', '..', 'images', 'background-test.png');
            
            let img = await loadImage(imagePath);
            ctx.drawImage(img, 0, 0, 1920, 1080);

            registerFont(
            path.join(__dirname, '..', '..', 'fonts', 'Minecraft.ttf'),
            { family: 'Minecraft' }
            );
            
            ctx.fillStyle = 'white';
            ctx.font = '55px "Minecraft"';

            ctx.fillText(`${user}'s statisitcs`, 100, 100);

            for (let i = 0; i < statsArray.length; i++) {
                ctx.fillText(statsArray[i], 100, (i + 1) * 90 + 100)
            }

            imagePath = `https://visage.surgeplay.com/full/384/${uuid}`;

            img = await loadImage(imagePath);
            ctx.drawImage(img, 1150, 50, 600, 950);

            const buffer = canvas.toBuffer('image/jpeg')

            const attachment = new AttachmentBuilder(buffer, {name: `${user}-card.jpeg`});
            await interaction.reply({ files: [attachment] });

        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: `Failed to fetch ${user}'s data.`,
                ephemeral: true
            });
        }
    },
};