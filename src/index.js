import { Client, GatewayIntentBits, EmbedBuilder, Events, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { Audibert } from './audibert.js';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
const audibert = new Audibert();

// Store user data to compare changes
const userCache = new Map();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Audibert API integration is ready');
});

// Function to get user assets using Audibert API
async function getUserAssets(userId) {
  try {
    console.log(`Fetching data for user ${userId} using Audibert API...`);
    
    // Fetch user data using Audibert API
    const audibertData = await audibert.getUser(userId);
    console.log('Audibert API response:', {
      avatar: audibertData.avatar?.url,
      banner: audibertData.banner?.url,
      badges: audibertData.badges,
      avatarDecoration: audibertData.avatarDecoration,
      accentColor: audibertData.accentColor
    });
    
    const userData = await rest.get(Routes.user(userId));
    const user = await client.users.fetch(userId, { force: true });

    const assets = {
      avatar: audibertData.avatar?.url || user.defaultAvatarURL,
      banner: audibertData.banner?.url || null,
      username: userData.username,
      avatarHash: audibertData.avatar?.hash || null,
      bannerHash: audibertData.banner?.hash || null,
      badges: audibertData.badges || [],
      avatarDecoration: audibertData.avatarDecoration || null,
      accentColor: audibertData.accentColor || null
    };

    console.log('Processed user assets:', assets);
    return assets;
  } catch (error) {
    console.error('Error fetching user assets:', error);
    return null;
  }
}

// Function to send webhook
async function sendWebhook(userId, oldAssets, newAssets) {
  const webhook = process.env.WEBHOOK_URL;
  if (!webhook || !oldAssets || !newAssets) return;

  console.log('Comparing assets for changes:', {
    userId,
    oldAvatar: oldAssets.avatarHash,
    newAvatar: newAssets.avatarHash,
    oldBanner: oldAssets.bannerHash,
    newBanner: newAssets.bannerHash
  });

  const embed = new EmbedBuilder()
    .setTitle(`${newAssets.username} Updated Their Profile`)
    .setColor(newAssets.accentColor || '#0099ff')
    .setTimestamp();

  // Check if avatar changed
  if (oldAssets.avatarHash !== newAssets.avatarHash) {
    console.log('Avatar change detected:', {
      old: oldAssets.avatar,
      new: newAssets.avatar
    });
    
    embed.addFields({ 
      name: 'New Avatar', 
      value: newAssets.avatar 
    });
    embed.setImage(newAssets.avatar);
  }

  // Check if banner changed
  if (oldAssets.bannerHash !== newAssets.bannerHash) {
    if (newAssets.banner) {
      console.log('Banner change detected:', {
        old: oldAssets.banner,
        new: newAssets.banner
      });
      
      embed.addFields({ 
        name: 'New Banner', 
        value: newAssets.banner 
      });
      // If both avatar and banner changed, we'll show the banner in the thumbnail
      if (oldAssets.avatarHash !== newAssets.avatarHash) {
        embed.setThumbnail(newAssets.banner);
      } else {
        embed.setImage(newAssets.banner);
      }
    }
  }

  // Add badge information if available
  if (newAssets.badges && newAssets.badges.length > 0) {
    console.log('User badges:', newAssets.badges);
    embed.addFields({
      name: 'User Badges',
      value: newAssets.badges.join(', ')
    });
  }

  // Add avatar decoration if present
  if (newAssets.avatarDecoration) {
    console.log('Avatar decoration:', newAssets.avatarDecoration);
    embed.addFields({
      name: 'Avatar Decoration',
      value: newAssets.avatarDecoration
    });
  }

  // Only send webhook if there are actual changes
  if (embed.data.fields?.length > 0) {
    try {
      console.log('Sending webhook with changes...');
      const response = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `${newAssets.username} updated their profile:`,
          embeds: [embed.toJSON()],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send webhook');
      }
      console.log('Webhook sent successfully!');
    } catch (error) {
      console.error('Error sending webhook:', error);
    }
  } else {
    console.log('No changes detected, skipping webhook');
  }
}

// Monitor user updates
client.on(Events.UserUpdate, async (oldUser, newUser) => {
  try {
    console.log(`User update event triggered for ${newUser.tag}`);
    const userId = newUser.id;
    const oldAssets = userCache.get(userId) || await getUserAssets(userId);
    const newAssets = await getUserAssets(userId);

    // Check if there are any changes
    if (
      oldAssets?.avatarHash !== newAssets?.avatarHash ||
      oldAssets?.bannerHash !== newAssets?.bannerHash
    ) {
      console.log('Changes detected, sending webhook...');
      await sendWebhook(userId, oldAssets, newAssets);
    } else {
      console.log('No profile changes detected');
    }

    // Update cache
    if (newAssets) {
      userCache.set(userId, newAssets);
      console.log('User cache updated');
    }
  } catch (error) {
    console.error('Error handling user update:', error);
  }
});

// Initialize cache for guild members when joining a new guild
client.on(Events.GuildCreate, async (guild) => {
  try {
    console.log(`Joined new guild: ${guild.name}`);
    const members = await guild.members.fetch();
    console.log(`Caching ${members.size} members...`);
    
    for (const [userId, member] of members) {
      if (!userCache.has(userId)) {
        const assets = await getUserAssets(userId);
        if (assets) {
          userCache.set(userId, assets);
          console.log(`Cached user data for ${member.user.tag}`);
        }
      }
    }
    console.log('Guild member caching complete');
  } catch (error) {
    console.error('Error caching guild members:', error);
  }
});

// Periodically check for updates (every 5 minutes)
setInterval(async () => {
  try {
    console.log('Running periodic update check...');
    for (const [userId, oldAssets] of userCache) {
      const newAssets = await getUserAssets(userId);
      if (
        newAssets &&
        (oldAssets.avatarHash !== newAssets.avatarHash ||
        oldAssets.bannerHash !== newAssets.bannerHash)
      ) {
        console.log(`Changes detected for user ${userId}`);
        await sendWebhook(userId, oldAssets, newAssets);
        userCache.set(userId, newAssets);
      }
    }
    console.log('Periodic update check complete');
  } catch (error) {
    console.error('Error in periodic update check:', error);
  }
}, 5 * 60 * 1000);

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);