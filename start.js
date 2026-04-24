import { serve } from 'hono/node-server';
import app from './src/api/index.ts';

const port = process.env.PORT || 3000;

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
});

console.log(`🚀 Server running on http://0.0.0.0:${port}`);

