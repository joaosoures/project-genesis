import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'content-type, content-length, accept-ranges, content-range',
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const buildDriveUrls = (fileId: string) => [
  `https://drive.google.com/uc?export=download&id=${fileId}`,
  `https://docs.google.com/uc?export=download&id=${fileId}`,
  `https://docs.google.com/document/d/${fileId}/export?format=pdf`,
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get('id');

    if (!fileId) {
      return jsonResponse({ error: 'Missing file id', fallback: false }, 400);
    }

    const requestHeaders = new Headers();
    const range = req.headers.get('range');
    if (range) requestHeaders.set('range', range);

    let response: Response | null = null;
    let lastStatus = 0;
    let lastBody = '';

    for (const googleUrl of buildDriveUrls(fileId)) {
      const attempt = await fetch(googleUrl, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: requestHeaders,
        redirect: 'follow',
      });

      if (attempt.ok) {
        response = attempt;
        break;
      }

      lastStatus = attempt.status;
      lastBody = await attempt.text().catch(() => '');
      console.error('Google Drive proxy attempt failed', { status: lastStatus, googleUrl, body: lastBody.slice(0, 300) });
    }

    if (!response) {
      const fallbackable = lastStatus >= 500 || lastStatus === 0;
      return jsonResponse({
        error: fallbackable ? 'GOOGLE_DRIVE_UNAVAILABLE' : `Google Drive responded with ${lastStatus}`,
        fallback: fallbackable,
        status: lastStatus,
      }, fallbackable ? 200 : Math.max(lastStatus, 400));
    }

    // Proxy the response
    const { body, headers, status } = response;
    
    // We want to keep most headers, especially Content-Type and Content-Length
    const responseHeaders = new Headers(corsHeaders);
    headers.forEach((value, key) => {
      if (['content-type', 'content-length', 'accept-ranges', 'content-range'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new Response(body, {
      status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Unexpected google-drive-proxy error:', error);
    return jsonResponse({ error: 'PROXY_SERVICE_FAILED', fallback: true }, 200);
  }
})
