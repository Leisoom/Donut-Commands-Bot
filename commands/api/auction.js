const api = require('../../src/utils/api');
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder,ButtonStyle } = require('discord.js');

async function getAuctionPage(search, number){
    const response = await api.get(`/auction/list/${number + 1}`,
        {
            data: {
            search: `${search}`,
            sort: "lowest_price"
            }
        }
    );

    const auctionListings = response.data.result
        .map(data => ` **${data.seller.name}** - $${data.price} - ${data.item.id.substring(data.item.id.indexOf(':') + 1).split("_").join(" ")}`)

    const auctionTextDisplays = auctionListings.map((al) => new TextDisplayBuilder().setContent(al)).slice(0,20)

    const previousButton =  new ButtonBuilder()
            .setCustomId("previous_page")
            .setLabel("Previous Page")
            .setStyle(ButtonStyle.Primary);

    if(number === 1){
        previousButton.setDisabled(true);
    }

    const row = new ActionRowBuilder().addComponents(
       previousButton,

        new ButtonBuilder()
            .setCustomId("next_page")
            .setLabel("Next Page")
            .setStyle(ButtonStyle.Primary)
        );

    return new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent("## Auction Listings"))
        .addTextDisplayComponents(...auctionTextDisplays)
        .addSeparatorComponents((seperator) => seperator)
        .addActionRowComponents(row);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auction')
        .setDescription('fetch auction house results')
	    .addStringOption((option) => option.setName('search').setDescription('search term for AH')),

    async execute(interaction) {
        const search = interaction.options.getString('search');

        try {
            const auctionContainer = await getAuctionPage(search, 1);
            const msg = await interaction.reply({
                components: [auctionContainer],
                flags: MessageFlags.IsComponentsV2,
                withResponse: true
            });

            let currentPage = 1;
            const message = msg.resource.message;
            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 60_000
            });

            collector.on("collect", async (i) => {
                if (i.customId === "next_page") {
                    currentPage++;
                } 
                else if (i.customId === "previous_page") {
                    currentPage--;
                }

                const newPage = await getAuctionPage(search, currentPage);

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