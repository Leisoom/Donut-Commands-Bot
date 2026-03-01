const api = require('../../src/utils/api');
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, Message } = require('discord.js');


async function fetchLeaderboardList(filter) {

    let results = [];

        try {
            const response = await api.get(`/leaderboards/${filter}/1`);
            
            let pageResults = response.data.result;
            const formatted = pageResults.map(user =>`**${user.username}** - ${user.value}`);
            results = formatted;
            
        } catch (err) {
            console.error("Leaderboard fetch error:", err.message);
        }

    return results;
}

function getLeaderboardPage(results, start, stop, pageNumber, filter, loading = false) {
    const leaderboardTextRows = results
        .map((res) => new TextDisplayBuilder().setContent(res))
        .slice(start, stop);

    const maxPageNumber = Math.ceil(results.length / 10) || 1;

    const previousButton = new ButtonBuilder()
        .setCustomId("previous_page")
        .setLabel("Previous Page")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(loading);

    const nextButton = new ButtonBuilder()
        .setCustomId("next_page")
        .setLabel("Next Page")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(loading);

    if (!loading) {
        if (start === 0) previousButton.setDisabled(true);
        if (start + 10 >= results.length) nextButton.setDisabled(true);
    }

    const arrayChoices = [
        { label: "Broken Blocks", value: "brokenblocks", default: filter === "brokenblocks" },
        { label: "Deaths", value: "deaths", default: filter === "deaths" },
        { label: "Kills", value: "kills", default: filter === "kills" },
        { label: "Mobs Killed", value: "mobskilled", default: filter === "lmobskilledd" },
        { label: "Money", value: "money", default: filter === "one" },
        { label: "Placed Blocks", value: "placedblocks", default: filter === "placedblocks" },
        { label: "Playtime", value: "playtime", default: filter === "playtime" },
        { label: "Money Made on /Sell", value: "sell", default: filter === "sell" },
        { label: "Shards", value: "shards", default: filter === "shards" },
        { label: "Money Spent on /Shop", value: "shop", default: filter === "shop" },

    ];

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("sort_filter")
        .addOptions(arrayChoices)
        .setDisabled(loading);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const row = new ActionRowBuilder().addComponents(
        previousButton,
        nextButton
    );

    return new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`### Leadboard - Page ${pageNumber} of ${maxPageNumber}`))
        .addTextDisplayComponents(...leaderboardTextRows)
        .addSeparatorComponents((seperator) => seperator)
        .addActionRowComponents(row)
        .addSeparatorComponents((seperator) => seperator.setDivider(false))
        .addActionRowComponents(selectRow);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('fetch leaderboard results')
        .addStringOption((option) =>
            option
                .setName('filter')
                .setDescription('sorting filter')
                .setRequired(true)
                .addChoices(
                    { name: "Broken Blocks", value: "brokenblocks"},
                    { name: "Deaths", value: "deaths"},
                    { name: "Kills", value: "kills"},
                    { name: "Mobs Killed", value: "mobskilled"},
                    { name: "Money", value: "money"},
                    { name: "Placed Blocks", value: "placedblocks"},
                    { name: "Playtime", value: "playtime"},
                    { name: "Money Made on /Sell", value: "sell"},
                    { name: "Shards", value: "shards"},
                    { name: "Money Spent on /Shop", value: "shop"}
                ),
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.IsComponentsV2
        });

        let start = 0;
        let stop = 10;
        let pageNumber = 1;
        let filter = interaction.options.getString('filter');

        try {

            let leaderboardResults = await fetchLeaderboardList(filter);
            let leaderboardPage =  getLeaderboardPage(leaderboardResults, start, stop, pageNumber,filter);

            const msg = await interaction.editReply({
                components: [leaderboardPage],
                flags: MessageFlags.IsComponentsV2
            });

            const collector = msg.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 120_000
            });

            collector.on("collect", async (i) => {
                await i.deferUpdate();

                const loadingPage = getLeaderboardPage(leaderboardResults, start, stop, pageNumber, filter, true);

                await i.editReply({
                    components: [loadingPage],
                    flags: MessageFlags.IsComponentsV2
                });

                if (i.customId === "next_page") {
                    start = stop;
                    stop += 10;
                    pageNumber++;
                } 
                else if (i.customId === "previous_page") {
                    stop = start;
                    start -= 10;
                    pageNumber--;
                }
                else if (i.customId === "sort_filter") {
                    start = 0;
                    stop = 10;
                    pageNumber = 1;
                    filter = i.values[0];
                    leaderboardResults = await fetchLeaderboardList(filter);
                }

                const newPage = getLeaderboardPage(leaderboardResults, start, stop, pageNumber, filter, false);

                await i.editReply({
                    components: [newPage],
                    flags: MessageFlags.IsComponentsV2
            });
        });

        } catch (err) {
            console.error(err);
        }
    }
}