// Audibert API implementation
export class Audibert {
  async getUser(userId) {
    try {
      const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }
      
      const userData = await response.json();
      
      return {
        avatar: {
          url: userData.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${userData.avatar}${userData.avatar.startsWith('a_') ? '.gif' : '.png'}?size=4096` : null,
          hash: userData.avatar
        },
        banner: {
          url: userData.banner ? `https://cdn.discordapp.com/banners/${userId}/${userData.banner}${userData.banner.startsWith('a_') ? '.gif' : '.png'}?size=4096` : null,
          hash: userData.banner
        },
        badges: this.getBadges(userData.public_flags),
        avatarDecoration: userData.avatar_decoration,
        accentColor: userData.accent_color ? `#${userData.accent_color.toString(16)}` : null
      };
    } catch (error) {
      console.error('Error in Audibert getUser:', error);
      return null;
    }
  }

  getBadges(flags) {
    const badges = [];
    if (!flags) return badges;

    const BADGES = {
      DISCORD_EMPLOYEE: 1 << 0,
      PARTNERED_SERVER_OWNER: 1 << 1,
      HYPESQUAD_EVENTS: 1 << 2,
      BUG_HUNTER_LEVEL_1: 1 << 3,
      HOUSE_BRAVERY: 1 << 6,
      HOUSE_BRILLIANCE: 1 << 7,
      HOUSE_BALANCE: 1 << 8,
      EARLY_SUPPORTER: 1 << 9,
      BUG_HUNTER_LEVEL_2: 1 << 14,
      VERIFIED_BOT_DEVELOPER: 1 << 17,
      ACTIVE_DEVELOPER: 1 << 22
    };

    for (const [badge, bit] of Object.entries(BADGES)) {
      if (flags & bit) {
        badges.push(badge);
      }
    }

    return badges;
  }
}