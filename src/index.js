require('dotenv/config');
const { Client, IntentsBitField} = require('discord.js');
const path = require('path')

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,

    ],
});

client.once('ready', () => {
    console.log(`logged in as ${client.user.tag}`)
})

client.login(process.env.DISCORD_CLIENT_TOKEN)