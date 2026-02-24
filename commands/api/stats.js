const api = require('../../src/utils/api');
const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bal')
        .setDescription('fetch balance for the user')
	    .addStringOption((option) => option.setName('user').setDescription('The user to check bal of').setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getString('user')
        try {
            const response = await api.get(`/stats/${user}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.DONUT_SMP_API_KEY}`
                }
            });

            const money = response.data.result.money;

            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(money);

            await interaction.reply(`${user}'s money: ${formatted}`);

        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: `Failed to fetch ${user}'s data.`,
                ephemeral: true
            });
        }
    },
};