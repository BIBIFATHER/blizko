const DEFAULT_UPSTREAM_ORIGIN = 'https://www.blizko.app';

function buildUpstreamUrl(requestUrl, upstreamOrigin) {
  const incoming = new URL(requestUrl);
  const upstream = new URL(upstreamOrigin);
  upstream.pathname = incoming.pathname;
  upstream.search = incoming.search;
  return upstream;
}

function rewriteRedirectLocation(location, requestUrl, upstreamOrigin) {
  if (!location) return location;

  try {
    const requestOrigin = new URL(requestUrl).origin;
    const upstream = new URL(upstreamOrigin);
    const target = new URL(location, upstreamOrigin);

    if (target.origin === upstream.origin) {
      return `${requestOrigin}${target.pathname}${target.search}${target.hash}`;
    }
  } catch {
    return location;
  }

  return location;
}

export default {
  async fetch(request, env) {
    const upstreamOrigin = String(env.UPSTREAM_ORIGIN || DEFAULT_UPSTREAM_ORIGIN).trim() || DEFAULT_UPSTREAM_ORIGIN;
    const upstreamUrl = buildUpstreamUrl(request.url, upstreamOrigin);

    const headers = new Headers(request.headers);
    const requestUrl = new URL(request.url);
    headers.set('x-forwarded-host', requestUrl.host);
    headers.set('x-forwarded-proto', requestUrl.protocol.replace(':', ''));
    headers.set('x-blizko-mirror', 'cloudflare-workers');

    const response = await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    });

    const proxiedHeaders = new Headers(response.headers);
    const location = proxiedHeaders.get('location');
    if (location) {
      proxiedHeaders.set('location', rewriteRedirectLocation(location, request.url, upstreamOrigin));
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: proxiedHeaders,
    });
  },
};
