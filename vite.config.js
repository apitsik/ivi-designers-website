import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Две страницы: главная и 404 (GitHub Pages отдаёт 404.html на любой
// несуществующий адрес).
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        notFound: resolve(__dirname, '404.html'),
      },
    },
  },
});
