// api/discord-status.js
import { Client, GatewayIntentBits } from 'discord.js';

export default async function handler(req, res) {
  try {
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers
      ]
    });

    await client.login(process.env.DISCORD_BOT_TOKEN);

    const user = await client.users.fetch('1257675618175422576'); // Твой ID
    const guild = client.guilds.cache.first();
    const member = guild?.members.cache.get('1257675618175422576');

    let status = 'offline';
    let activity = '';

    if (member?.presence) {
      status = member.presence.status;
      if (member.presence.activities.length > 0) {
        const act = member.presence.activities[0];
        activity = `${act.name}${act.details ? `: ${act.details}` : ''}`;
      }
    }

    await client.destroy();

    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    res.status(200).json({
      status,
      activity,
      avatar: `https://cdn.discordapp.com/avatars/1257675618175422576/${user.avatar}.png?size=64`,
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}