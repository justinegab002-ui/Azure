// Fetches Discord profile data (name, avatar, banner) using a bot token kept in
// the DISCORD_BOT_TOKEN environment variable. The token never reaches the browser.
const API = "https://discord.com/api/v10/users/";
const CDN = "https://cdn.discordapp.com/";

const reply = (status, body) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=300" // profile changes show up within ~5 minutes
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return reply(500, { error: "DISCORD_BOT_TOKEN is not set" });

  const ids = [...new Set(
    ((event.queryStringParameters || {}).ids || "")
      .split(",").map((s) => s.trim()).filter((s) => /^\d{15,22}$/.test(s))
  )].slice(0, 25);

  const users = await Promise.all(ids.map(async (id) => {
    try {
      const r = await fetch(API + id, { headers: { Authorization: `Bot ${token}` } });
      if (!r.ok) return { id, error: r.status };
      const u = await r.json();
      const ext = (hash) => (hash && hash.startsWith("a_") ? "gif" : "png");
      return {
        id,
        name: u.global_name || u.username,
        username: u.username,
        avatar: u.avatar
          ? `${CDN}avatars/${id}/${u.avatar}.${ext(u.avatar)}?size=256`
          : `${CDN}embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`,
        banner: u.banner ? `${CDN}banners/${id}/${u.banner}.${ext(u.banner)}?size=600` : null,
        color: typeof u.accent_color === "number"
          ? "#" + u.accent_color.toString(16).padStart(6, "0") : null
      };
    } catch (e) {
      return { id, error: "fetch_failed" };
    }
  }));

  return reply(200, { users });
};
