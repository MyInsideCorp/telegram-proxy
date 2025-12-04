const TELEGRAM_API_BASE = 'https://api.telegram.org';

async function handleRequest(request) {
  const url = new URL(request.url);

  if (url.pathname === '/' || url.pathname === '') {
    return new Response(DOC_HTML, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  const pathParts = url.pathname.split('/').filter(Boolean);
  if (pathParts.length < 2) {
    return new Response('Invalid request format', { status: 400 });
  }
  if (pathParts[0] === 'file') {
    if (pathParts.length < 3 || !pathParts[1].startsWith('bot')) {
      return new Response('Invalid file request format', { status: 400 });
    }
  } else if (!pathParts[0].startsWith('bot')) {
    return new Response('Invalid bot request format', { status: 400 });
  }

  const telegramUrl = `${TELEGRAM_API_BASE}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);

  const contentType = headers.get('Content-Type');
  if (contentType && contentType.startsWith('application/json') && !contentType.includes('charset')) {
    headers.set('Content-Type', 'application/json; charset=UTF-8');
  }

  const init = {
    method: request.method,
    headers,
    redirect: 'follow',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  const proxyReq = new Request(telegramUrl, init);

  try {
    const tgRes = await fetch(proxyReq);
    const res = new Response(tgRes.body, tgRes); // Copy response as-is
    const reqAllowHeaders = request.headers.get('Access-Control-Request-Headers');
    const allowHeaders = reqAllowHeaders ? reqAllowHeaders : 'Content-Type';
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS, HEAD'
    );
    res.headers.set('Access-Control-Allow-Headers', allowHeaders);
    return res;
  } catch (err) {
    return new Response(`Error proxying request: ${err.message}`, { status: 500 });
  }
}

function handleOptions(request) {
  const reqAllowHeaders = request.headers.get('Access-Control-Request-Headers');
  const allowHeaders = reqAllowHeaders ? reqAllowHeaders : 'Content-Type';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': allowHeaders,
    'Access-Control-Max-Age': '86400',
  };

  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

addEventListener('fetch', event => {
  const request = event.request;

  if (request.method === 'OPTIONS') {
    event.respondWith(handleOptions(request));
  } else {
    event.respondWith(handleRequest(request));
  }
}); 