import { fileURLToPath } from 'url';
import { dirname } from 'path';
import app from './src/api/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
