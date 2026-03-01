const api = require('../../src/utils/api');
const { SlashCommandBuilder, ContainerBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('find')
        .setDescription('Find player location if player is online')
	    .addStringOption((option) => option.setName('user').setDescription('The user to check online status of').setRequired(true)),

    async execute(interaction) {

        const user = interaction.options.getString('user');

        try {

            let response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${user}/`);
            const uuid = response.data.id;

            response = await api.get(`/lookup/${user}`);

            const statsContainer = new ContainerBuilder()
                .setAccentColor(0x0099ff)
                .addSectionComponents(section =>
                    section
                        .addTextDisplayComponents(textDisplay => textDisplay.setContent(`### ${user} is Online!`))
                        .addTextDisplayComponents(textDisplay => textDisplay.setContent(`**Location**: ${response.data.result.location}`))
                        .setThumbnailAccessory(thumbnail =>
                            thumbnail
                                .setURL(`https://visage.surgeplay.com/face/250/${uuid}`)
                                .setDescription(`${user}'s avatar`)
                        )) 

            await interaction.reply({
                components: [statsContainer],
                flags: MessageFlags.IsComponentsV2,
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: `### ${user} is not currently online!`,
                ephemeral: true
            });
        }
    },
};