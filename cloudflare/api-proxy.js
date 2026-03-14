export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    
    const allowedOrigins = [
      'https://blizko.app',
      'https://www.blizko.app',
      'http://localhost:5173',
      'https://blizko-3.vercel.app'
    ];
    
    const corsOrigin = allowedOrigins.includes(origin) ? origin : '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, x-supabase-api-version, prefer, traceparent, baggage, Range, Content-Range',
      'Access-Control-Expose-Headers': 'Content-Range, Range, x-supabase-api-version, Content-Length',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // The destination Supabase project URL
    const SUPABASE_URL = "https://geomyyfjvemdphaeimkz.supabase.co";
    const targetUrl = new URL(request.url);
    const supaUrl = new URL(SUPABASE_URL);
    
    targetUrl.hostname = supaUrl.hostname;
    // ensure HTTPS
    targetUrl.protocol = 'https:';

    const modifiedRequest = new Request(targetUrl, request);
    // Overwrite Host header to match the true Supabase domain
    modifiedRequest.headers.set('Host', supaUrl.hostname);
    // Explicitly prevent Supabase from returning its own restrictive CORS headers
    // by handling them purely at the edge
    
    const response = await fetch(modifiedRequest);
    
    const newResponse = new Response(response.body, response);
    
    // Inject our generous CORS headers
    for (const [key, value] of Object.entries(corsHeaders)) {
      newResponse.headers.set(key, value);
    }
    
    return newResponse;
  }
};
