const api = require('../../src/utils/api');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('fetch statistics for the user')
	    .addStringOption((option) => option.setName('user').setDescription('The user to check stats of').setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getString('user')

        try {

            let response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${user}/`);
            
            const uuid = response.data.id;

            response = await api.get(`/stats/${user}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.DONUT_SMP_API_KEY}`
                }
            });

            const money = response.data.result.money;

            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(money);

            const embed = new EmbedBuilder()
                .setTitle(`${user}'s stats`)
                .setThumbnail(`https://visage.surgeplay.com/face/250/${uuid}`)
                .setColor(0x5865F2)
                .addFields(
                    { name: 'Blocks Broken', value: response.data.result.broken_blocks, inline: false },
                    { name: 'Deaths', value: response.data.result.deaths, inline: false },
                    { name: 'Kills', value: response.data.result.kills, inline: false },
                    { name: 'Mobs Killed', value: response.data.result.mobs_killed, inline: false },
                    { name: 'Money', value: formatted, inline: false },
                    { name: 'Money Made From Sell', value: response.data.result.money_made_from_sell, inline: false },
                    { name: 'Money Spent on Shop', value: response.data.result.money_spent_on_shop, inline: false },
                    { name: 'Placed_Blocks', value: response.data.result.placed_blocks, inline: false },
                    { name: 'Playtime', value: response.data.result.playtime, inline: false },
                    { name: 'Shards', value: response.data.result.shards, inline: false },
                )
                .setFooter({ text: 'Requested via slash command' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: `Failed to fetch ${user}'s data.`,
                ephemeral: true
            });
        }
    },
};