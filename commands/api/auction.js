const api = require('../../src/utils/api');
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

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
                }** - ${data.time_left}`
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

async function getAuctionPage(results, start, stop, pageNumber, filter){
    const auctionTextDisplays = results.map((res) => new TextDisplayBuilder().setContent(res)).slice(start,stop)
    const maxPageNumber = Math.ceil(results.length / 10)

    const previousButton = new ButtonBuilder()
        .setCustomId("previous_page")
        .setLabel("Previous Page")
        .setStyle(ButtonStyle.Primary);

    const nextButton = new ButtonBuilder()
        .setCustomId("next_page")
        .setLabel("Next Page")
        .setStyle(ButtonStyle.Primary)

    let arrayChoices = [              
        { label: "Lowest Price", value: "lowest_price", default: "lowest_price" === filter ? true : false },
        { label: "Highest Price", value: "highest_price", default: "highest_price" === filter ? true : false },
        { label: "Recently Listed", value: "recently_listed", default: "recently_listed" === filter ? true : false },
        { label: "Last Listed", value: "last_listed", default: "last_listed" === filter ? true : false }
    ]

    const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("sort_filter")
            .addOptions(
                arrayChoices
            )
    );

    if(start === 0 && stop == 10){
        previousButton.setDisabled(true);
    }
    if(start + 10 > results.length){
        nextButton.setDisabled(true);
    }

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
        const search = interaction.options.getString('search');
        let start = 0;
        let stop = 10;
        let pageNumber = 1;
        let filter = "lowest_price";
        let resort = false;
        let auctionResults = await fetchAuctionList(search, filter);

        try {

            const auctionContainer = await getAuctionPage(auctionResults, start, stop, pageNumber);

            const msg = await interaction.reply({
                components: [auctionContainer],
                flags: MessageFlags.IsComponentsV2,
                withResponse: true
            });

            const message = msg.resource.message;
            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 60_000
            });

            collector.on("collect", async (i) => {
                if (i.customId === "next_page") {
                    start = stop;
                    stop = stop + 10;
                    pageNumber++;
                } 
                else if (i.customId === "previous_page") {
                    stop = start;
                    start = start - 10;
                    pageNumber--;
                }
                else if(i.customId === "sort_filter"){
                    start = 0;
                    stop = 10;
                    pageNumber = 1;
                    filter = i.values[0]
                    resort = true;
                }

                if(resort){
                    auctionResults = await fetchAuctionList(search, filter);
                }

                const newPage = await getAuctionPage(auctionResults, start, stop, pageNumber, filter);

                await i.update({
                    components: [newPage],
                    flags: MessageFlags.IsComponentsV2
                });
            });
        }
        catch(err){
            console.error(err);
            await interaction.reply({
                content: `Failed to find aunction house data.`,
                ephemeral: true
            });
        }
    }
}