'use strict'

// Import the discord.js module
const Discord = require('discord.js');
// import resources such as icons and image links
const { Resources } = require('./botResources.js');
// import database functions
const Db = require('./db.js');
// import luxon (timezones)
const {DateTime} = require("luxon");
// import cron
const schedule = require('node-schedule');

module.exports = {
    // Returns the value of the reaction along with users id and username
    removeMessageReaction: async function removeMessageReaction(client, messageReaction, user) {
        // removes users reaction
        await messageReaction.users.remove(user);
        return {
            'reaction_value': messageReaction.emoji.name,
            'reaction_user_id': user.id,
            'reaction_user_name': user.name
        };
    },

    changeEmbedContent: async function changeEmbedContent(oldMessage, newFields) {
        // create new embed to edit the old one with
        return await new Discord.MessageEmbed(oldMessage.embeds[0])
            // switch old embed fields with new ones
            .spliceFields(0, oldMessage.embeds[0].fields.length, newFields);
    },

    getAuthorNickname: async function getAuthorNickname(message, user) {
        const member = await message.channel.guild.member(user);
        // if user has no nickname in the server return normal discord username
        if (member.nickname === null) return await user.username;
        return await member.nickname;
    },

    // The frenchmans insanity
    raidsetup: async function raidsetup(message) {
        let Template = new Resources.Templates
        let eventTemplate
        let eventType
        let cancelled = false;
        let completed = false;
        let stepIndex = 1;
        let isSet = {
            eventType: false,
            eventDate: false,
            eventTime: false,
            eventName: false,
            eventDescription: false
        };
        let eventTime = DateTime.now();
        while (!cancelled && !completed) {
            // Template choice
            if (stepIndex === 1) {
                const sentDM = await message.author.send("What type of event would you like to schedule?");
                var DMchannel = sentDM.channel;
                while (true) {
                    try {
                        let reply = await DMchannel.awaitMessages(m => !m.author.bot, {
                            max: 1,
                            time: 300000,
                            errors: ['time']
                        });
                        // Convert message to text
                        let msgText = reply.entries().next().value[1].content.toString();
                        eventTemplate = await Template.decideTemplate(msgText)
                        if (eventTemplate) {
                            eventType = 'template'
                            console.log(eventTemplate);
                            isSet.eventType = true;
                            stepIndex = stepIndex + 1;
                            break
                        }
                        else if (new RegExp("custom", "i").test(msgText)) {
                            eventType = 'custom';
                            let customflag = false;
                            while (!customflag) {
                                await message.author.send("Please choose an event name");
                                let reply = await DMchannel.awaitMessages(m => !m.author.bot, {
                                    max: 1,
                                    time: 300000,
                                    errors: ['time']
                                });
                                var eventName = reply.entries().next().value[1].content.toString();
                                isSet.eventName = true;
                                await message.author.send("Please choose an event description");
                                reply = await DMchannel.awaitMessages(m => !m.author.bot, {
                                    max: 1,
                                    time: 300000,
                                    errors: ['time']
                                });
                                var eventDescription = reply.entries().next().value[1].content.toString();
                                isSet.eventDescription = true;
                                await message.author.send("Your event is now the following:\n \n" + eventName + "\n" + eventDescription + "\nIs this correct?");
                                while (true) {
                                    let reply = await DMchannel.awaitMessages(m => !m.author.bot, {
                                        max: 1,
                                        time: 300000,
                                        errors: ['time']
                                    });
                                    let replytext = reply.first().content.toString();
                                    if (new RegExp("ye?s?", "i").test(replytext)) {
                                        customflag = true;
                                        break
                                    } else if (new RegExp("no?", "i").test(replytext)) {
                                        customflag = false;
                                        break
                                    } else {
                                        await message.author.send("Reply not recognized. Please try again.");
                                    }
                                }
                                stepIndex = stepIndex + 1;
                            }
                            break
                        } else if (new RegExp("cancel", "i").test(msgText)) {
                            await DMchannel.send("Event setup cancelled. You can start over by using the !Raid command again.");
                            return undefined;
                        } else if (new RegExp("next", "i").test(msgText)) {
                            if (!isSet.eventType) {
                                await DMchannel.send("Event type not set. Please try again.");
                            } else {
                                stepIndex = stepIndex + 1;
                                break
                            }
                        } else {
                            await DMchannel.send("Reply not recognized. Please try again.");
                        }
                    } catch (error) {
                        await DMchannel.send("Response has timed out. To restart event setup, please use !raid.");
                        cancelled = true;
                        break
                    }
                }
            }
            // Date setup
            if (stepIndex === 2) {
                console.log(eventTime.toLocaleString(DateTime.DATETIME_FULL));
                await message.author.send("What date? Format: weekday (e.g. Monday) or mm-dd (if month isn't specified, default to current month).");
                while (true) {
                    try {
                        const reply = await DMchannel.awaitMessages(m => !m.author.bot, {
                            max: 1,
                            time: 300000,
                            errors: ['time']
                        });
                        let msgtext = reply.entries().next().value[1].content.toString();
                        if (/^\d\d?-\d\d?$/.test(msgtext)) {
                            let datelist = msgtext.split("-").map(e => parseInt(e));
                            eventTime = eventTime.set({month: datelist[0], day: datelist[1]});
                            isSet.eventDate = true;
                            stepIndex = stepIndex + 1;
                            break
                        } else if (/^\d\d?(st|nd|rd|th)?$/.test(msgtext)) {
                            let date = parseInt(msgtext.replace(/\D+$/g, ''));
                            if (date > DateTime.now().daysInMonth) {
                                await DMchannel.send("Invalid date. Please try again.");
                            } else {
                                eventTime = eventTime.set({day: date});
                                isSet.eventDate = true;
                                stepIndex = stepIndex + 1;
                                break
                            }
                        } else if (new RegExp("^(janu?a?r?y?|febr?u?a?r?y?|marc?h?|apr?i?l?|may|june?|july?|augu?s?t?|sept?e?m?b?e?r?|octo?b?e?r?|nove?m?b?e?r?|dece?m?b?e?r?) ?\\d\\d?(st|nd|rd|th)?$", "i").test(msgtext)) {
                            let months = ["janu?a?r?y?", "febr?u?a?r?y?", "marc?h?", "apr?i?l?", "may", "june?", "july?", "augu?s?t?", "sept?e?m?b?e?r?", "octo?b?e?r?", "nove?m?b?e?r?", "dece?m?b?e?r?"];
                            let date = parseInt(msgtext.match(/\d\d?/));
                            let i = 0;
                            for (; i < 12; i++) {
                                if (new RegExp(months[i], "i").test(msgtext)) {
                                    break
                                }
                            }
                            if (date > DateTime.fromObject({month: i + 1}).daysInMonth) {
                                await DMchannel.send("Invalid date. Please try again.");
                            } else {
                                eventTime = eventTime.set({month: i + 1, day: date});
                                isSet.eventDate = true;
                                stepIndex = stepIndex + 1;
                                break
                            }
                        } else if (new RegExp("^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$", "i").test(msgtext)) {
                            let days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                            for (let i = 0; i < 7; i++) {
                                if (new RegExp(days[i], "i").test(msgtext)) {
                                    eventTime = eventTime.set({weekday: i + 1});
                                    break
                                }
                            }
                            isSet.eventDate = true;
                            stepIndex = stepIndex + 1;
                            break
                        } else if (new RegExp("^today$", "i").test(msgtext)) {
                            eventTime = DateTime.now();
                            isSet.eventDate = true;
                            stepIndex = stepIndex + 1;
                            break
                        } else if (new RegExp("^tomorrow$", "i").test(msgtext)) {
                            eventTime = DateTime.now();
                            eventTime = eventTime.set({day: eventTime.day + 1});
                            isSet.eventDate = true;
                            stepIndex = stepIndex + 1;
                            break
                        } else if (new RegExp("^back$", "i").test(msgtext)) {
                            stepIndex = stepIndex - 1;
                            break
                        } else if (new RegExp("^cancel$", "i").test(msgtext)) {
                            await DMchannel.send("Event setup cancelled. You can start over by using the !Raid command again.");
                            return undefined;
                        } else if (new RegExp("^next$", "i").test(msgtext)) {
                            if (!isSet.eventDate) {
                                await DMchannel.send("Date not set. Please try again.");
                            } else {
                                stepIndex = stepIndex + 1;
                                break
                            }
                        } else {
                            await DMchannel.send("Reply does not match date format. Please try again.");
                        }
                    } catch (error) {
                        await DMchannel.send("Response has timed out. To restart event setup, please use !raid.");
                        cancelled = true;
                        break
                    }
                }
            }
            // Time setup
            if (stepIndex === 3) {
                console.log(eventTime.toLocaleString(DateTime.DATETIME_FULL));
                await message.author.send("What time? Format: hh:mm");
                while (true) {
                    try {
                        const reply = await DMchannel.awaitMessages(m => !m.author.bot, {
                            max: 1,
                            time: 300000,
                            errors: ['time']
                        });
                        let msgtext = reply.entries().next().value[1].content.toString();
                        if (/^\d\d?:\d\d$/.test(msgtext)) {
                            let timelist = msgtext.split(":").map(e => parseInt(e));
                            if (timelist[0] > 23 || timelist[0] < 0 || timelist[1] > 59) {
                                await DMchannel.send("Invalid time. Please try again.");
                            } else {
                                eventTime = eventTime.set({hour: timelist[0], minute: timelist[1]});
                                if (timelist[0] < 13) {
                                    await message.author.send("AM or PM?");
                                    const timereply = await DMchannel.awaitMessages(m => !m.author.bot, {
                                        max: 1,
                                        time: 300000,
                                        errors: ['time']
                                    });
                                    if (new RegExp("^p\\.?m\\.?$", "i").test(timereply.entries().next().value[1].content.toString())) {
                                        eventTime = eventTime.plus({hours: 12});
                                    }
                                }
                                isSet.eventTime = true;
                                stepIndex = stepIndex + 1;
                                break
                            }
                        } else if (/^\d\d?$/.test(msgtext)) {
                            let time = parseInt(msgtext);
                            if (time > 24) {
                                await DMchannel.send("Invalid time. Please try again.");
                            } else {
                                eventTime = eventTime.set({hour: time, minute: 0});
                                isSet.eventTime = true;
                                stepIndex = stepIndex + 1;
                                break
                            }
                        } else if (new RegExp("^\\d\\d?:\\d\\d ?[ap]\\.?m\\.?$", "i").test(msgtext)) {
                            let timelist = msgtext.replace(/\D+$/g, '').split(":").map(e => parseInt(e));
                            if (timelist[0] > 12 || timelist[1] > 59) {
                                await DMchannel.send("Invalid time. Please try again.");
                            } else {
                                eventTime = eventTime.set({hour: timelist[0], minute: timelist[1]});
                                if (/[pP]/.test(msgtext)) {
                                    eventTime = eventTime.plus({hours: 12});
                                }
                                isSet.eventTime = true;
                                stepIndex = stepIndex + 1;
                                break
                            }
                        } else if (new RegExp("^\\d\\d? ?[ap]\\.?m\\.?$", "i").test(msgtext)) {
                            let time = parseInt(msgtext.replace(/\D+$/g, ''));
                            if (time > 12) {
                                await DMchannel.send("Invalid time. Please try again.");
                            } else {
                                eventTime = eventTime.set({hour: time, minute: 0});
                                if (/[pP]/.test(msgtext)) {
                                    eventTime = eventTime.plus({hours: 12});
                                }
                                isSet.eventTime = true;
                                stepIndex = stepIndex + 1;
                                break
                            }
                        } else if (new RegExp("^back$", "i").test(msgtext)) {
                            stepIndex = stepIndex - 1;
                            break
                        } else if (new RegExp("^next$", "i").test(msgtext)) {
                            if (!isSet.eventTime) {
                                await DMchannel.send("Time not set. Please try again.");
                            } else {
                                stepIndex = stepIndex + 1;
                                break
                            }
                        } else if (new RegExp("^cancel$", "i").test(msgtext)) {
                            await DMchannel.send("Event setup cancelled. You can start over by using the !Raid command again.");
                            return undefined;
                        } else {
                            await DMchannel.send("Reply does not match time format. Please try again.");
                        }
                    } catch (error) {
                        await DMchannel.send("Response has timed out. To restart event setup, please use !raid.");
                        cancelled = true;
                        break
                    }
                }
            }
            // Confirmation
            if (stepIndex === 4) {
                console.log(eventTime.toLocaleString(DateTime.DATETIME_FULL));
                if (eventTime < DateTime.now()) {
                    if (eventTime.plus({weeks: 1}) < DateTime.now()) {
                        eventTime = eventTime.plus({years: 1});
                    } else {
                        eventTime = eventTime.plus({weeks: 1});
                    }
                }
                const sentDM = await message.author.send("Your event time is " + eventTime.toLocaleString(DateTime.DATETIME_FULL) + ". Is this correct?");
                var DMchannel = sentDM.channel;
                while (true) {
                    try {
                        const reply = await DMchannel.awaitMessages(m => !m.author.bot, {
                            max: 1,
                            time: 300000,
                            errors: ['time']
                        });
                        let msgtext = reply.entries().next().value[1].content.toString();
                        if (new RegExp("^yes$", "i").test(msgtext)) {
                            completed = true;
                            console.log("setup completed");
                            break
                        } else if (new RegExp("^no$", "i").test(msgtext)) {
                            stepIndex = 1;
                            console.log("setup restarting");
                            break
                        } else {
                            await DMchannel.send("Reply not recognized. Please try again.");
                        }
                    } catch (error) {
                        await DMchannel.send("Response has timed out. To restart event setup, please use !raid.");
                        cancelled = true;
                        break
                    }
                }
            }
        }
        if (!cancelled) {
            await DMchannel.send("Congratulations! Your even has been scheduled for " + eventTime.toLocaleString(DateTime.DATETIME_FULL));
            if (eventType === 'template') {
                var params = Template.newEventFromTemplate(eventTemplate, eventTime.toSQL({includeOffset: false}))
            } else if (eventType === 'custom') {
                let event_roles = {
                    1: 8,
                    2: 1,
                    3: 1
                };
                var params = new Resources.Templates.EventTemplate(eventName, eventDescription, "000000", undefined, eventTime.toSQL({includeOffset: false}), "Custom Event", 8, event_roles);
            }
        }

        return params;
    },

    // TODO event edit
    eventedit: async function eventedit(message) {
        const sentDM = await message.author.send("Here is a list of ongoing events. Which one would you like to edit?");
    },

    scheduleDM: async function scheduleDM(client, eventTime, messageID) {
        let jobid = messageID.toString();
        var job = schedule.scheduleJob(jobid, eventTime.toJSDate(), async function () {
            //SQL query for all signups
            let signups = await Db.getsignups(messageID);
            for (const e of signups[0]) {
                const user = await client.users.fetch(BigInt(e.p_id));
                await user.send("REMINDER: you have a raid starting in 15 minutes. Please prepare accordingly.");
                await Db.removejob(jobid);
                await Db.removeevent(messageID);
            }

        });
        await Db.logscheduledjob(jobid, eventTime.toISO(), 'event reminder');
        return job;
    },

    restartjobs: async function restartjobs(client) {
        let joblist = await Db.fetchjobs();
        for (const j of joblist[0]) {
            if (j.job_type == 'event reminder') {
                console.log('restarted job ' + BigInt(j.id).toString());
                await Db.removejob(j.id);
                let job = await this.scheduleDM(client, DateTime.fromISO(j.time), BigInt(j.id));
            }
        }
    }

}