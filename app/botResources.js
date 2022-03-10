const base64 = require('base-64')
const mysql = require('mysql2/promise');
const config = require("./config");

const connection = mysql.createPool({
    host: config.database.host,
    user: config.database.user,
    database: config.database.database,
    port: config.database.port,
    password: config.database.password,
    connectionLimit: 10,
    queueLimit: 0,
    waitForConnections: true
})
let Resources = class Resources {}

Resources.Templates = class Templates {
    // Pulls all default templates from DM
    async pullDefaultTemplates() {
        let sql = `select default_template.id,
            (select GROUP_CONCAT(role_id, ':', role_count order by templates.default_template.id, role_id)
        from templates.template_roles
        where template_id = default_template.id) as roles,
            event_title,
            event_description,
            event_color,
            event_thumbnail,
            creation_response,
            regexp_b64,
            max_players,
            event_footer
        from templates.default_template`
        let data = await connection.query(sql)
        // Convert roles string to object
        data[0].forEach((roles_str, index) => {
            let roles_tmp = roles_str.roles.split(',')
            let roles_new = []
            roles_tmp.forEach(roles => {
                let roles_toInt = roles.split(':')
                roles_toInt[0] = parseInt(roles_toInt[0])
                roles_toInt[1] = parseInt(roles_toInt[1])
                roles_new.push(roles_toInt)
            })
            let entries = new Map(roles_new)
            roles_new = Object.fromEntries(entries)
            data[0][index].roles = roles_new
        })
        return await data[0];
    }

    // Decides which template to use, returns false in none match
    async decideTemplate(string) {
        let templateList = await this.pullDefaultTemplates()
        let out = false
        templateList.forEach(template => {
            let regexp = base64.decode(template.regexp_b64)
            if (new RegExp(regexp, 'i').test(string)) {
                // console.log(template)
                out = template
            }
        })
        return await out
    }

    async newEventFromTemplate(event, event_time) {
        return new Resources.Templates.EventTemplate(
            event.event_title,
            event.event_description,
            event.event_color,
            event.event_thumbnail,
            event_time,
            event.event_footer,
            event.max_players,
            event.roles
        )
    }
}

Resources.Templates.EventTemplate = class EventTemplate {
    constructor(event_title, event_description, event_color, event_thumbnail, event_time, event_footer, max_players, event_roles) {
        this.event_title = event_title;
        this.event_description = event_description;
        this.event_color = event_color;
        this.event_thumbnail = event_thumbnail;
        this.event_time = event_time;
        this.event_footer = event_footer;
        this.max_players = max_players;
        this.event_roles = event_roles;
    }
}

module.exports = {
    // custom icons are fetched using the last bit of the link you get by r-clicking on them,
    // formatting is as follows <:default_emoji_id:your_emoji_id>
    // default emojis have to be copied directly
    // https://cdn.discordapp.com/emojis/820504586674241537.png?v=1
    Resources,
    icons: // icon IDs
        icons = {
            'offense': '<:eyes:819698693300420628>',
            'defense': '<:eyes:819698728943747073>',
            'tech': '<:eyes:819698662552371240>',
            'decline': '<:eyes:821514708259045388>'
        },
}