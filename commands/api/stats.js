const api = require('../../src/utils/api');
const { SlashCommandBuilder, ContainerBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

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
        .setName('stats')
        .setDescription('fetch statistics for the user')
	    .addStringOption((option) => option.setName('user').setDescription('The user to check stats of').setRequired(true)),

    async execute(interaction) {

        const user = interaction.options.getString('user');

        let isOnline = false;

        const lookup = await api.get(`/lookup/${user}`).catch(() => null);

        if (lookup) isOnline = true;

        try {

            let response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${user}/`);
            const uuid = response.data.id;

            response = await api.get(`/stats/${user}`);

            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(response.data.result.money);

            const r = response.data.result;

            let playerStatus = isOnline ? "Online" : "Offine";

            const statsContainer = new ContainerBuilder()
                .setAccentColor(0x0099ff)
                .addSectionComponents(section =>
                    section
                        .addTextDisplayComponents(textDisplay => textDisplay.setContent(`### ${user} is ${playerStatus}!`))
                        .addTextDisplayComponents(textDisplay => textDisplay.setContent(`**Balance**: \`${formatted}\``))
                        .addTextDisplayComponents(textDisplay => textDisplay.setContent(`**Shards**: \`${r.shards}\``))
                        .setThumbnailAccessory(thumbnail =>
                            thumbnail
                                .setURL(`https://visage.surgeplay.com/face/250/${uuid}`)
                                .setDescription(`${user}'s avatar`)
                        )) 
                    .addSeparatorComponents((seperator) => seperator)
                    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**Playtime**: \`${formatGameDuration(r.playtime)}\``))
                    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**Kills**: \`${r.kills}\``))
                    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**Deaths**: \`${r.deaths}\``))
                    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**Mobs Killed**: \`${r.mobs_killed}\``))
                    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**Money Made From Sell**: \`${formatMoney(r.money_made_from_sell)}\``))
                    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**Money Spent on Shop**: \`${formatMoney(r.money_spent_on_shop)}\``))
                    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**Placed Blocks**: \`${r.placed_blocks}\``))
                    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`**Blocks Brocken**: \`${r.broken_blocks}\``));

                    if(isOnline){
                        statsContainer.addTextDisplayComponents((td) => td.setContent(`**Location**: \`${lookup.data.result.location}\``))
                    }

            await interaction.reply({
                components: [statsContainer],
                flags: MessageFlags.IsComponentsV2,
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: `Failed to fetch ${user}'s data.`,
                ephemeral: true
            });
        }
    },
};