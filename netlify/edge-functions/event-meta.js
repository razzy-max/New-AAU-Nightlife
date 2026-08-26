const BOT_UA_PATTERNS = [
  /facebookexternalhit/i, /Facebot/i, /Twitterbot/i, /WhatsApp/i, /Slackbot/i,
  /TelegramBot/i, /LinkedInBot/i, /Discordbot/i, /Googlebot/i, /bingbot/i,
  /Applebot/i, /Pinterest/i, /redditbot/i, /Embedly/i, /SkypeUriPreview/i,
];

const isBot = (ua) => BOT_UA_PATTERNS.some((re) => re.test(ua));

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const truncate = (value, max) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

export default async (request, context) => {
  const userAgent = request.headers.get('user-agent') || '';
  if (!isBot(userAgent)) {
    return context.next();
  }

  const url = new URL(request.url);
  const idOrSlug = url.pathname.split('/').filter(Boolean)[1];
  if (!idOrSlug) {
    return context.next();
  }

  const backendBase = Netlify.env.get('BACKEND_API_URL') || 'https://new-aau-nightlife-backend.onrender.com';

  try {
    const apiRes = await fetch(`${backendBase}/api/events/${encodeURIComponent(idOrSlug)}`);
    if (!apiRes.ok) {
      return context.next();
    }
    const event = await apiRes.json();

    const title = escapeHtml(truncate(event.title || 'AAU Nightlife Event', 70));
    const description = escapeHtml(truncate(event.shortDescription || event.description || '', 200));
    const imageUrl = `${backendBase}/api/events/${event._id}/image?v=${encodeURIComponent(event.updatedAt || '')}`;
    const pageUrl = `${url.origin}/events/${event.slug || event._id}`;

    const baseResponse = await context.next();
    let html = await baseResponse.text();

    html = html
      .replace(/<title>.*?<\/title>/, `<title>${title} | AAU Nightlife</title>`)
      .replace(/(<meta name="title" content=")(.*?)(" \/>)/, `$1${title}$3`)
      .replace(/(<meta name="description" content=")(.*?)(" \/>)/, `$1${description}$3`)
      .replace(/(<meta property="og:url" content=")(.*?)(" \/>)/, `$1${pageUrl}$3`)
      .replace(/(<meta property="og:title" content=")(.*?)(" \/>)/, `$1${title}$3`)
      .replace(/(<meta property="og:description" content=")(.*?)(" \/>)/, `$1${description}$3`)
      .replace(/(<meta property="og:image" content=")(.*?)(" \/>)/, `$1${imageUrl}$3`)
      .replace(/(<meta property="twitter:url" content=")(.*?)(" \/>)/, `$1${pageUrl}$3`)
      .replace(/(<meta property="twitter:title" content=")(.*?)(" \/>)/, `$1${title}$3`)
      .replace(/(<meta property="twitter:description" content=")(.*?)(" \/>)/, `$1${description}$3`)
      .replace(/(<meta property="twitter:image" content=")(.*?)(" \/>)/, `$1${imageUrl}$3`);

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('event-meta edge function error:', error);
    return context.next();
  }
};

export const config = { path: '/events/*' };
