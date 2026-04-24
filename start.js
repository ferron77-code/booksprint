import { serve } from 'hono/node-server';
import app from './src/api/index.ts';

const port = 8080; // Hardcoded for Fly.io
const hostname = '0.0.0.0';

console.log(`Starting server on ${hostname}:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname,
}).catch(err => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

console.log(`🚀 Server listening on http://${hostname}:${port}`);



