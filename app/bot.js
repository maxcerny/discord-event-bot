'use strict';
const config = require('./config.js')

// Import mysql
const mysql = require('mysql2/promise');
// Import the discord.js module
const Discord = require('discord.js');
// import custom functions
const RaidBot = require('./raidBot-functions.js');
// import resources such as icons and image links
const Resources = require('./botResources.js');
// import database functions
const Db = require('./db.js');
// import luxon (timezones)
const {DateTime} = require('luxon');
// import cron
const schedule = require('node-schedule');

let inSetup = [];

// Create an instance of a Discord client
const client = new Discord.Client({partials: ['MESSAGE', 'CHANNEL', 'REACTION']});

// global bot prefix
const prefix = "!";

// notifies on client ready
client.on('ready', () => {
    console.log('Client ready');
});

// restart stopped jobs
RaidBot.restartjobs(client);

client.on('guildCreate', guild => {
    let emojis = ['declined', 'defense', 'offense', 'hazard', 'tech', 'healer']
    emojis.forEach(value => {
        guild.emojis.create(`./emoji/${value}.png`, value)
            .then(emoji => {
                console.log(emoji)
                Db.updateEmoji(emoji)
            })
            .catch(console.error);
    })
})

// create an event listener for messages
client.on('message', async message => {

    let messageID = message.author.id;
    if (message.content === prefix + 'raid' && !inSetup.includes(messageID) && !message.author.bot) {
        inSetup.push(messageID); // add user to "in setup" state, won't respond to new !raid commands until setup is finished
        let params = await RaidBot.raidsetup(message);

        if (typeof params != 'undefined') {
            // Create new Embed
            const embed = new Discord.MessageEmbed()
                // embed title, description, timestamp, color.
                .setTitle(params.event_title)
                .setDescription(params.event_description)
                .setTimestamp(params.event_time)
                .setColor(params.event_color)
            //set thumbnail if specified
            if (typeof params.event_thumbnail !== undefined) {
                embed.setThumbnail(params.event_thumbnail);
            }
            // set footer if specified
            if (typeof params.event_footer !== undefined) {
                embed.setFooter(params.event_footer);
            }
            // add predefined field template
            embed.addFields(await Db.generateNewEmbedContent(undefined, params));
            // send message and add reactions
            let sentEmbed = await message.channel.send(embed);
            // reacts with roles that have given IDs
            await Db.addReactions(sentEmbed, Object.keys(params.event_roles))
            await sentEmbed.react(client.emojis.cache.find(emoji => emoji.name === 'declined'))
            // create new event in database and add roles based on params
            await Db.createNewEventInDb(sentEmbed.id, params, messageID)
            let job = await RaidBot.scheduleDM(client, DateTime.fromSQL(params.event_time), sentEmbed.id);
        }
        inSetup = inSetup.filter(val => val !== messageID); //remove user from "in setup" state

    } else if (message.content === prefix + 'test') {
        const connection = mysql.createPool({
            host: config.database.host,
            user: config.database.user,
            database: config.database.database,
            port: config.database.port,
            password: config.database.password,
            connectionLimit: 10,
            queueLimit: 0,
            waitForConnections: true
        });
        let signups = await connection.query(`select cast(player_id as char) as p_id from signup`);
        for (const e of signups[0]) {
            let user = await client.users.fetch(BigInt(e.p_id));
            await user.send("REMINDER: you have a raid starting in 15 minutes. Please prepare accordingly.");
        }
    } else if (message.content === prefix + 'edit') {
        //inSetup.push(messageID);
        //let params = await RaidBot.raidsetup(message);
    }
});

// event listener for signing up for events
client.on('messageReactionAdd', async (oldMessageReaction, user) => {
    // sets default value for variable indicating if the message was partial or cached on entering the listener
    let wasPartial = false

    // checks if the data of the message being reacted on is partial(not cached), if so fetches the message from discord
    if (oldMessageReaction.partial) {
        try {
            // caches the old message
            await oldMessageReaction.fetch();
            // sets partial to true because of a false .me flag on the reaction
            wasPartial = true;
        } catch (error) {
            console.error('Something went wrong when fetching the message: ', error);
            return;
        }
    }

    // check if the reaction was on a message by the bot and
    // check if the reaction is not by the bot or was partial before
    // (this is due to an error with the first reaction to a non cached message)
    if (
        oldMessageReaction.message.author.id === client.user.id &&
        (oldMessageReaction.me === false || wasPartial === true) &&
        oldMessageReaction.message.embeds.length !== 0
    ) {
        const oldMessage = oldMessageReaction.message;
        // check if the message is a raid event
        if (await Db.messageExists(oldMessage.id)) {
            console.log(oldMessageReaction.emoji.identifier)
            // check if the reaction is a role on this event

            if (await Db.roleExists(oldMessage.id, oldMessageReaction.emoji) || oldMessageReaction.emoji.name === 'declined') {
                // removes the message reaction of a specific user
                await RaidBot.removeMessageReaction(client, oldMessageReaction, user);
                // fetches the nickname for the user
                const reactionAuthorNickname = await RaidBot.getAuthorNickname(oldMessageReaction.message, user)
                // handles adding / removing roles from events
                await Db.pushRoleToDatabase(user.id, reactionAuthorNickname, oldMessageReaction.emoji.name, oldMessage.id);
                // generates new embed fields
                const newFields = await Db.generateNewEmbedContent(oldMessage.id)
                // create new message from edited fields and old parameters
                const newMessage = await RaidBot.changeEmbedContent(oldMessageReaction.message, newFields);
                // edit the old message with the contents of the new one
                await oldMessage.edit(newMessage);
            }
        }
    }
})


// login the bot in using the token from https://discord.com/developers/applications
client.login(config.discord.token).then(
    r => console.log(`Token: ${r}`)
);