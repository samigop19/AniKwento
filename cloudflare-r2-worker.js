/**
 * Cloudflare Worker for AniKwento R2 Public Access
 *
 * This worker enables public access to files stored in your R2 bucket.
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Go to Cloudflare Dashboard > Workers & Pages > Create Application > Create Worker
 * 2. Name it: anikwento-r2-public
 * 3. Copy and paste this entire file's contents into the worker editor
 * 4. Click "Deploy"
 * 5. Go to Settings > Variables > R2 Bucket Bindings
 * 6. Add binding:
 *    - Variable name: MY_BUCKET
 *    - R2 bucket: anikwento-stories-dev
 * 7. Save and deploy
 * 8. Copy your worker URL (e.g., https://anikwento-r2-public.yourusername.workers.dev)
 * 9. Update source/handlers/r2_config.php with your worker URL as the public_url
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1); // Remove leading slash

    // Get object from R2
    const object = await env.MY_BUCKET.get(key);

    if (object === null) {
      return new Response('Object Not Found', { status: 404 });
    }

    // Set proper headers
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Access-Control-Allow-Origin', '*'); // Enable CORS
    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    return new Response(object.body, {
      headers,
    });
  },
};
