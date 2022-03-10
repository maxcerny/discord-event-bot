FROM node:16-alpine

RUN mkdir -p /app/discord_bot

COPY . /app/discord_bot

WORKDIR "/app/discord_bot"

RUN npm install

CMD ["node", "/app/discord_bot/bot.js"]