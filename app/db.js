const mysql = require('mysql2/promise');
const config = require('./config.js')

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


module.exports = {
    // adds reactions specified by role id to message
    // no returns
    addReactions: async function mysqlPull(message, array) {
        let query = `SELECT discord_emote FROM role where role.id in (${array}) order by role.id;`
        const result = await connection.query(query);
        result[0].forEach(async function (value) {
            await message.react(value["discord_emote"])
        })
    },

    // gets role id from database based on reaction value
    // returns int
    getRoleIdByReactionValue: async function getRoleIdByReactionValue(reactionValue) {
        let query = await `SELECT id FROM role where role.reaction_value = '${reactionValue}';`
        let result = await connection.query(query)

        return result[0][0]["id"]
    },

    // handles adding the user, his role and his status to the event specified by message id
    // no returns
    pushRoleToDatabase: async function pushRoleToDatabase(player_id, player_name, reaction_value, messageId) {
        // declare variables for later use
        let role_id
        let reaction_player_status = "accepted"
        let signup

        // checks if the user has reacted with a role or declined
        if (reaction_value !== 'declined') {
            // fetches the role id by value of the reaction
            role_id = await this.getRoleIdByReactionValue(reaction_value);
        } else {
            // user has declined
            reaction_player_status = "declined"
        }

        // checks if the player has reacted with a role
        if (reaction_player_status === "accepted") {
            // tries to pull the user signup from database
            signup = await connection.query(`select signup.id as signup, signup.status as status
            from signup
            where message_id = ${messageId}
              and player_id = ${player_id};`)
            // checks if user exists according
            if (signup[0].length === 0) {
                // pulls additional info from database if user exists
                signup = await connection.query(`select signup.id as signup, r.id as roleId, signup.status as status
from signup
         inner join signup_has_roles shr on signup.id = shr.signup_id_signup
         inner join role r on shr.role_id_role = r.id
where message_id = ${messageId}
  AND player_id = ${player_id};`)
            }
        } else if (reaction_player_status === "declined") {
            // tries to pull the user signup from database
            signup = await connection.query(`select signup.id as signup, signup.status as status
            from signup
            where message_id = ${messageId}
              and player_id = ${player_id};`)
        }

        // if player is new create signup and add role from reaction
        if (signup[0].length === 0) {
            // add player with status and role
            if (reaction_player_status === "accepted") {
                // add user as accepted
                let query = `insert into signup (message_id, player_id, player_nickname, status)
                values (${messageId}, ${player_id}, '${player_name}', '${reaction_player_status}');`
                await connection.query(query)

                // add role to user
                query = `insert into signup_has_roles (signup_id_signup, role_id_role)
                values ((select signup.id
                         from signup
                         where message_id = ${messageId}
                           and player_id = ${player_id}), ${role_id});`
                await connection.query(query)
            } else if (reaction_player_status === "declined") {
                // add user as declined
                let query = `insert into signup (message_id, player_id, player_nickname, status)
                values (${messageId}, ${player_id}, '${player_name}', '${reaction_player_status}');`
                await connection.query(query)
            }
        } else {
            // pull variables from
            const signupId = signup[0][0].signup
            const signupStatus = signup[0][0].status

            if (reaction_player_status === signupStatus) {
                if (signupStatus === "accepted") {
                    // get all roles for specified player
                    let query = `select r.id as roleId from signup inner join signup_has_roles shr on signup.id = shr.signup_id_signup inner join role r on shr.role_id_role = r.id where message_id = ${messageId} AND player_id = ${player_id};`;
                    let roles = await connection.query(query);

                    // check if user has any roles
                    if (roles[0].length !== 0) {
                        // check if reaction role exists in the
                        let roleExists
                        for (let i = 0; i < roles[0].length; i++) {
                            console.log(roles[0][i]);
                            if (role_id === roles[0][i].roleId) roleExists = true
                            if (roleExists) break
                        }
                        // if the roles exists delete it
                        if (roleExists) {
                            query = `delete from signup_has_roles where signup_id_signup = ${signupId} and role_id_role = ${role_id};`
                            await connection.query(query)

                            // if it is the last role, delete user
                            query = `delete
                            from signup
                            where message_id = ${messageId}
                              and player_id = ${player_id}
                                and 0 = (select count(*) from signup_has_roles where signup_id_signup = ${signupId})`
                            await connection.query(query)
                        } else {
                            query = `insert into signup_has_roles (signup_id_signup, role_id_role)
                            values (
                                (select signup.id
                                    from signup
                                        where message_id = ${messageId}
                                        and player_id = ${player_id}),
                                ${role_id}
                            );`
                            await connection.query(query)
                        } // if the role doesn't exist add it
                    }
                } else if (signupStatus === "declined") {
                    let query = `delete
                    from signup
                    where message_id = ${messageId}
                      and player_id = ${player_id}`

                    await connection.query(query)
                } // if user already declined before, remove his decline status
            } else if (reaction_player_status !== signupStatus) {
                if (signupStatus === "accepted") {
                    // remove roles
                    let query = `delete from signup_has_roles where signup_has_roles.signup_id_signup = ${signupId};`
                    await connection.query(query)

                    // set status as declined //TODO remove user first then add a new record to fix issues with coming back from declining
                    query = `UPDATE signups.signup t SET t.status = 'declined' WHERE t.id = ${signupId}`
                    let result = await connection.query(query)
                    console.log(result)
                } else if (signupStatus === "declined") {
                    // set status as accepted //TODO remove user first then add a new record to fix issues with coming back from declining
                    let query = `UPDATE signups.signup t SET t.status = 'accepted' WHERE t.id = ${signupId}`
                    await connection.query(query)
                    // add users role
                    query = `insert into signup_has_roles (signup_id_signup, role_id_role)
                            values (
                                (select signup.id
                                    from signup
                                        where message_id = ${messageId}
                                        and player_id = ${player_id}),
                                ${role_id}
                            );`
                    await connection.query(query)
                }
            }
        }
    },

    // generates new embeds based on event data from database
    // returns embed fields
    generateNewEmbedContent: async function (messageId, params = undefined) {
        let roleIDs
        let roles
        let max_players
        let fields
        // checks if parameters are pushed
        if (params !== undefined) {
            roles = params.event_roles
            if (roles !== undefined) roleIDs = Object.keys(roles);
            max_players = params.max_players
        } else {
            roleIDs = [];
            roles = [];
        }
        //
        if (messageId === undefined) {
            fields = [{
                'name': `Accepted 0/${params.max_players}`,
                'value': `\u200B`, // empty space because discord doesn't like a whitespace only
                'inline': true
            }, {
                'name': "Declined",
                'value': `\u200B`,
                'inline': true
            }, {
                'name': `\u200B`,
                'value': `\u200B`,
                'inline': false
            }, {
                'name': await this.generateRoleCount(messageId, roleIDs, roles),
                'value': "\u200B",
                'inline': false
            }]
        } else {
            max_players = await this.getMaxPlayers(messageId)
            let standby = await this.getStandbyPlayers(messageId, max_players)
            fields = [{
                'name': await this.generateNumberOfAccepted(messageId),
                'value': await this.generateAcceptedUsers(messageId, max_players),
                'inline': true
            }, {
                'name': "Declined",
                'value': await this.generateDeclinedUsers(messageId),
                'inline': true
            }, {
                'name': `\u200B`,
                'value': `\u200B`,
                'inline': false
            }, {
                'name': await this.generateRoleCount(messageId, roleIDs, roles),
                'value': "\u200B",
                'inline': false
            }]
            if (standby !== "\u200b") {
                fields[2] = {
                    'name': `Standby`,
                    'value': standby,
                    'inline': false
                }
            }
        }


        return fields;
    },

    // Generate contents of the accepted field
    // returns string
    generateAcceptedUsers: async function generateAcceptedUsers(messageId, max_players) {
        let query = `select CONCAT( GROUP_CONCAT(r.discord_emote order by r.id SEPARATOR ''),player_nickname) as array
                    from signup
                             inner join signup_has_roles shr on signup.id = shr.signup_id_signup
                             inner join role r on shr.role_id_role = r.id
                    where signup.message_id = ${messageId} and signup.status = 'accepted'
                    group by player_id, signup.id order by signup.id limit ${max_players};`

        let roles = await connection.query(query)

        roles = roles[0]

        if (roles.length === 0) {
            return "\u200B"
        }

        return ">>> " + await this.joinDataWithNewline(roles, "array", "\u200B")
    },

    // generates contents of the accepted field
    // returns string
    generateDeclinedUsers: async function generateDeclinedUsers(messageId) {
        let query = `select player_nickname as array
                    from signup
                    where signup.message_id = ${messageId} and signup.status = 'declined'
                    group by player_id, signup.id order by signup.id;`

        let roles = await connection.query(query)

        roles = roles[0]

        if (roles.length === 0) {
            return "\u200B"
        }

        return ">>> " + await this.joinDataWithNewline(roles, "array", "\u200B")
    },
    generateRoleCount: async function generateRoleCount(messageId, roleIDs = [], roles = []) {
        if (messageId !== undefined) {
            let query = `select CONCAT(role.discord_emote,role.role_name,
              " ",
              (select count(*)
               from signup_has_roles
               where signup_id_signup IN
                     (select signup.id from signup where message_id = ${messageId} and signup.status = 'accepted')
                 and role_id_role = role.id
              ),
              "/",
              (select role_count from event_roles where event_roles.role_id = role.id and event_roles.event_id = ${messageId})
           ) as array
from role
where id in (select role_id
from event_roles where event_id = ${messageId}) order by role.id;`
            let result = await connection.query(query)
            result = result[0]
            return this.joinDataWithNewline(result, "array", "\u200b")
        } else {
            let query = `create temporary table temp_roles(id int not null, count int not null, constraint temp_table_pk primary key (id));`
            await connection.query(query)

            for (let index in roles) {
                query = `insert into temp_roles (id, count) values (${index},${roles[index]});`
                await connection.query(query)
            }

            query = `select CONCAT(role.discord_emote,role.role_name,
              " 0",
              "/",
              (select count from temp_roles where temp_roles.id = role.id)
           ) as array
from role
where id in (${roleIDs});`
            let result = await connection.query(query)
            await connection.query("drop temporary table temp_roles;")
            result = result[0]
            return this.joinDataWithNewline(result, "array", "\u200b", "role_count")
        }

    },
    joinDataWithNewline: async function joinDataWithNewLine(array, innerArrayIndex = "array", emptyValue = "\u200b", replace = "", replaceWith = "") {
        let output = emptyValue
        array.forEach(function (value) {
            if (output === emptyValue) {
                output = value[innerArrayIndex].replace(replace, replaceWith)
            } else {
                output = output + "\n" + value[innerArrayIndex].replace(replace, replaceWith)
            }
        })

        return output;
    },
    createNewEventInDb: async function createNewEventInDb(messageId, params, authorId) {
        const event_params = params
        let query = `insert into event_params (message_id, event_title, event_description, event_color, event_thumbnail, event_time, event_author_id, max_players)
values (${messageId}, "${event_params.event_title}", "${event_params.event_description}", "${event_params.event_color}", "${event_params.event_thumbnail}", "${event_params.event_time}", ${authorId}, ${event_params.max_players});`
        await connection.query(query)

        const roles = params.event_roles

        for (const index in roles) {
            let query = `INSERT INTO signups.event_roles (event_id, role_id, role_count) VALUES (${messageId}, ${index}, ${roles[index]})`
            await connection.query(query)
        }
    },
    generateNumberOfAccepted: async function generateNumberOfAccepted(messageId) {
        let query = `select concat('Accepted ',count(*),'/',(select max_players from event_params where event_params.message_id = ${messageId})) as accepted
from signup where message_id = ${messageId} and status = 'accepted';`
        let output = await connection.query(query)
        return output[0][0]["accepted"]
    },
    getMaxPlayers: async function getMaxPlayers(messageId) {
        let query = `select max_players
from event_params where message_id = ${messageId};`
        let output = await connection.query(query)
        return output[0][0]["max_players"]
    },
    getStandbyPlayers: async function getStandbyPlayers(messageId, max_players) {
        let query = `select CONCAT( GROUP_CONCAT(r.discord_emote order by r.id SEPARATOR ''),player_nickname) as standby
                    from signup
                             inner join signup_has_roles shr on signup.id = shr.signup_id_signup
                             inner join role r on shr.role_id_role = r.id
                    where signup.message_id = ${messageId}
                    group by player_id, signup.id order by signup.id limit 500 offset ${max_players};`
        let output = await connection.query(query)
        output = output[0]
        if (output.length === 0) {
            return "\u200B"
        }

        return ">>> " + await this.joinDataWithNewline(output, "standby", "\u200B")
    },
    // checks if the message exists in database
    // returns a boolean value
    messageExists: async function messageExists(messageId) {
        let query = `select count(*) as count
        from event_params
        where message_id = ${messageId};`
        let result = await connection.query(query)

        return result[0][0]["count"] === 1;
    },

    // checks if the role exists in database on a specified message
    // returns a boolean value
    roleExists: async function roleExists(messageId, reactionValue) {
        let result
        if (reactionValue.identifier.includes(':')) {
            let query = `select count(*) as count
        from event_roles inner join role r on event_roles.role_id = r.id
        where event_id = ${messageId} and reaction_value = '${reactionValue.name}';`
            result = await connection.query(query)
            return result[0][0]["count"] === 1;
        }
        return false;
    },

    removeevent: async function removeevent(messageID) {
        await connection.query(`delete from signups.signup_has_roles where signup_id_signup in (select id from signups.signup where message_id = ${messageID});
                                delete from signups.signup where id = '${messageID}';
                                delete from signups.event_roles where id = '${messageID}';
                                delete from signups.event_params where id = '${messageID}';`);
    },

    getsignups: async function getsignups(messageID) {
        return await connection.query(`select cast(player_id as char) as p_id from signup where message_id = ${messageID};`);
    },

    logscheduledjob: async function logscheduledjob(messageID,jobtime,jobtype) {
        await connection.query(`insert into schedule.jobs values ('${messageID}', '${jobtime}', '${jobtype}');`);
    },

    removejob: async function removejob(messageID) {
        await connection.query(`delete from schedule.jobs where id = '${messageID}';`);
    },

    fetchjobs: async function fetchjobs() {
        return await connection.query(`select id, time, job_type from schedule.jobs;`);
    },

    updateEmoji: async function updateEmoji(emoji) {
        let newEmoji = `<:${emoji.name}:${emoji.id}>`
        connection.query(`update role set discord_emote = "${newEmoji}" where reaction_value = "${emoji.name}"`)
    }
}