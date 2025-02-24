# Discord Asset Bot

This bot automatically monitors and posts user avatar and banner updates to a specified webhook channel.

## Setup

1. Create a new Discord application and bot at https://discord.com/developers/applications
2. Get your bot token and add it to the `.env` file
3. Create a webhook in your Discord server and add the URL to the `.env` file
4. Install dependencies with `npm install`
5. Start the bot with `npm start`

## Features

- Automatically detects when users update their avatars (including GIFs) or banners
- Sends updates to a specified webhook channel
- Caches user data to minimize API calls
- Supports high-quality images (4096px)

The bot will automatically send updates to the webhook channel whenever a user changes their avatar or banner.