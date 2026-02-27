const api = require('../../src/utils/api');
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder,ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auction')
        .setDescription('fetch auction house results')
	    .addStringOption((option) => option.setName('search').setDescription('search term for AH')),

    async execute(interaction) {
        const number = 1;
        const search = interaction.options.getString('search');

        try {
            const response = await api.get(`/auction/list/${number}`,
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

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("previous_page")
                    .setLabel("Previous Page")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("next_page")
                    .setLabel("Next Page")
                    .setStyle(ButtonStyle.Primary)
                );

            const auctionContainer = new ContainerBuilder()
                .setAccentColor(0x0099ff)
                .addTextDisplayComponents((textDisplay) => textDisplay.setContent("## Auction Listings"))
                .addTextDisplayComponents(...auctionTextDisplays)
                .addSeparatorComponents((seperator) => seperator)
                .addActionRowComponents(row);

            
            await interaction.reply({
                components: [auctionContainer],
                flags: MessageFlags.IsComponentsV2,
                
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