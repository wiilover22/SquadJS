import { COPYRIGHT_MESSAGE } from 'core/config';
import { RCON_CHAT_MESSAGE } from 'squad-server/events/rcon';

export default async function(server, discordClient, channelID, options = {}) {
  if (!server) {
    throw new Error('DiscordChatAdminRequest must be provided with a reference to the server.');
  }

  if (!discordClient) {
    throw new Error('DiscordChatAdminRequest must be provided with a Discord.js client.');
  }

  if (!channelID) {
    throw new Error('DiscordChatAdminRequest must be provided with a channel ID.');
  }

  const ignoreChats = options.ignoreChats || [];
  const adminPrefix = options.adminPrefix || '!admin';
  const pingGroups = options.pingGroups || [];
  const pingDelay = options.pingDelay || 60 * 1000;

  let lastPing = null;

  options = {
    color: 16761867,
    ...options
  };

  const channel = await discordClient.channels.fetch(channelID);

  server.on(RCON_CHAT_MESSAGE, async info => {
    if (ignoreChats.includes(info.chat)) return;
    if (!info.message.startsWith(`${adminPrefix}`)) return;

    const playerInfo = await server.getPlayerBySteamID(info.steamID);
    const trimmedMessage = info.message.replace(adminPrefix, '').trim();

    if (trimmedMessage.length === 0) {
      await server.rcon.warn(
        info.steamID,
        `Please specify what you would like help with when requesting an admin.`
      );
      return;
    }

    const message = {
      embed: {
        title: `${playerInfo.name} has requested admin support!`,
        color: options.color,
        fields: [
          {
            name: 'Player',
            value: playerInfo.name,
            inline: true
          },
          {
            name: 'SteamID',
            value: `[${playerInfo.steamID}](https://steamcommunity.com/profiles/${info.steamID})`,
            inline: true
          },
          {
            name: 'Team & Squad',
            value: `Team: ${playerInfo.teamID}, Squad: ${playerInfo.squadID || 'Unassigned'}`
          },
          {
            name: 'Message',
            value: trimmedMessage
          }
        ],
        timestamp: info.time.toISOString(),
        footer: {
          text: COPYRIGHT_MESSAGE
        }
      }
    };

    if (pingGroups.length > 0 && (lastPing === null || Date.now() - pingDelay > lastPing)) {
      message.content = pingGroups.map(groupID => `<@&${groupID}>`).join(' ');
      lastPing = Date.now();
    }

    channel.send(message);

    await server.rcon.warn(
      info.steamID,
      `An admin has been notified, please wait for us to get back to you.`
    );
  });
}
