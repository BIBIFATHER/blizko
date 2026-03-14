export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    // Allow localhost for dev, and main domains for production
    const allowedOrigins = [
      'https://blizko.app',
      'https://www.blizko.app',
      'http://localhost:5173',
      'https://blizko-3.vercel.app'
    ];
    
    const corsOrigin = allowedOrigins.includes(origin) ? origin : '*';

    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
      'Access-Control-Max-Age': '86400',
    };

    // 1. Handle CORS Preflight (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    const userAgent = request.headers.get('User-Agent') || '';
    
    // 2. SEO Previews for Nanny profiles (Bots only)
    const isBot = /telegrambot|whatsapp|twitterbot|facebookexternalhit|linkedinbot|vkshare|yandexbot|googlebot/i.test(userAgent);

    if (isBot && url.pathname.startsWith('/nanny/')) {
       // Extract slug: /nanny/anna-ivanova-123 => anna-ivanova-123
       const slug = url.pathname.split('/')[2];
       if (slug) {
          // Fetch data from Supabase securely via env vars
          const sbUrl = `${env.SUPABASE_URL}/rest/v1/nannies?slug=eq.${slug}&select=name,skills,experience_years,city`;
          const supabaseResponse = await fetch(sbUrl, {
            headers: {
              'apikey': env.SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`
            }
          });
          
          if (supabaseResponse.ok) {
             const data = await supabaseResponse.json();
             if (data && data.length > 0) {
                const nanny = data[0];
                const title = `Няня ${nanny.name} | Blizko`;
                const skillsText = nanny.skills ? nanny.skills.slice(0, 3).join(', ') : 'Уход за детьми';
                const description = `Опыт: ${nanny.experience_years} лет. Навыки: ${skillsText}. Работает в городе: ${nanny.city}. Бронируйте проверенную няню на Blizko.`;
                const image = `https://www.blizko.app/og-image-nanny.jpg`; 

                // Inject SEO Meta tags for social previews
                return new Response(`
                  <!DOCTYPE html>
                  <html lang="ru">
                    <head>
                      <meta charset="utf-8">
                      <title>${title}</title>
                      <meta name="description" content="${description}">
                      <meta property="og:title" content="${title}">
                      <meta property="og:description" content="${description}">
                      <meta property="og:image" content="${image}">
                      <meta property="og:url" content="${request.url}">
                      <meta property="og:type" content="profile">
                      <meta name="twitter:card" content="summary_large_image">
                    </head>
                    <body></body>
                  </html>
                `, {
                  headers: { 
                    'content-type': 'text/html;charset=UTF-8',
                    ...corsHeaders
                  }
                });
             }
          }
       }
    }

    // 3. Normal traffic and API pass-through
    // Cloudflare fetch automatically forwards ALL original headers (including Authorization/Bearer)
    const response = await fetch(request);
    
    // 4. Inject CORS headers into the final response going to the client
    const newResponse = new Response(response.body, response);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newResponse.headers.set(key, value);
    }
    
    return newResponse;
  }
};
