#!/usr/bin/env node
import('./dist/booksprint/index.js').then(({ default: app }) => {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
