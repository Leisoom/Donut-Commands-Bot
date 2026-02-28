const api = require('../../src/utils/api');
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, Message } = require('discord.js');

function formatGameDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours}h ${minutes}m ${seconds}s`;
}

function formatMoney(number){
    const formatted = new Intl.NumberFormat('en', { 
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1
        }).format(number);

    return formatted;
}

async function fetchAuctionList(search,filter) {

    let page = 1;
    let results = [];
    let hasResults = true;

    while (hasResults) {
        try {
            const response = await api.get(`/auction/list/${page}`, {
                data: {
                    search: search,
                    sort: filter
                }
            });
            
            let pageResults = response.data.result ?? [];
            pageResults = pageResults.filter(data => data && data.item.id.includes(search))
            const formatted = pageResults.map(data =>
                ` **${data.seller.name}** - $${formatMoney(data.price)} - **${data.item.count}x ${
                    data.item.id
                        .substring(data.item.id.indexOf(':') + 1)
                        .split("_")
                        .join(" ")
                }** - ${formatGameDuration(data.time_left)}`
            );

            results.push(...formatted);
            page++;

        } catch (err) {
            console.error("Auction fetch error:", err.message);
            hasResults = false;
        }
    }
    return results;
}

function getNoListingsContainer(search){
    return new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent("### No Listings Found"))
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`Search: ${search}`))
}

function getAuctionPage(results, start, stop, pageNumber, filter, loading = false) {
    const auctionTextDisplays = results
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
        { label: "Lowest Price", value: "lowest_price", default: filter === "lowest_price" },
        { label: "Highest Price", value: "highest_price", default: filter === "highest_price" },
        { label: "Recently Listed", value: "recently_listed", default: filter === "recently_listed" },
        { label: "Last Listed", value: "last_listed", default: filter === "last_listed" }
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
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`### Auction Listings - Page ${pageNumber} of ${maxPageNumber}`))
        .addTextDisplayComponents(...auctionTextDisplays)
        .addSeparatorComponents((seperator) => seperator)
        .addActionRowComponents(row)
        .addSeparatorComponents((seperator) => seperator)
        .addActionRowComponents(selectRow);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auction')
        .setDescription('fetch auction house results')
        .addStringOption((option) => option.setName('search').setDescription('search term for AH').setRequired(true)),

    async execute(interaction) {

    await interaction.deferReply({
        flags: MessageFlags.IsComponentsV2
    });

    const search = interaction.options.getString('search').split(" ").join("_");

    let start = 0;
    let stop = 10;
    let pageNumber = 1;
    let filter = "lowest_price";

        try {

            let auctionResults = await fetchAuctionList(search, filter);
            let auctionContainer =  getAuctionPage(auctionResults, start, stop, pageNumber);

           if(auctionResults.length === 0 ){
                auctionContainer = getNoListingsContainer(interaction.options.getString('search'))
           }

            const msg = await interaction.editReply({
                components: [auctionContainer],
                flags: MessageFlags.IsComponentsV2
            });

            const collector = msg.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 120_000
            });

            collector.on("collect", async (i) => {
                await i.deferUpdate();

                const loadingPage = getAuctionPage(auctionResults, start, stop, pageNumber, filter, true);

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
                    auctionResults = await fetchAuctionList(search, filter);
                }

                const newPage = getAuctionPage(auctionResults, start, stop, pageNumber, filter, false);

                await i.editReply({
                    components: [newPage],
                    flags: MessageFlags.IsComponentsV2
            });
        });

        } catch (err) {
            console.error(err);

            await interaction.editReply({
                components: [getNoListingsContainer()],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
}