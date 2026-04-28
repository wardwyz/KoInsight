import { Router } from 'express';
import { createHash } from 'crypto';
import { access, readdir } from 'fs/promises';
import path from 'path';
import { appConfig } from '../config';

const router = Router();

const SUPPORTED_EXTENSIONS = new Set([
  '.epub',
  '.pdf',
  '.mobi',
  '.azw3',
  '.fb2',
  '.txt',
  '.cbz',
  '.cbr',
]);

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  '.epub': 'application/epub+zip',
  '.pdf': 'application/pdf',
  '.mobi': 'application/x-mobipocket-ebook',
  '.azw3': 'application/vnd.amazon.ebook',
  '.fb2': 'application/fb2+xml',
  '.txt': 'text/plain',
  '.cbz': 'application/vnd.comicbook+zip',
  '.cbr': 'application/vnd.comicbook-rar',
};

type BookFile = {
  relativePath: string;
  absolutePath: string;
  title: string;
  extension: string;
};

function toPosixPath(value: string) {
  return value.split(path.sep).join('/');
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function encodeRelativePath(relativePath: string) {
  return Buffer.from(relativePath, 'utf8').toString('base64url');
}

function decodeRelativePath(encodedPath: string) {
  return Buffer.from(encodedPath, 'base64url').toString('utf8');
}

function getMimeTypeByExtension(extension: string) {
  return MIME_TYPE_BY_EXTENSION[extension] ?? 'application/octet-stream';
}

async function collectBookFiles(rootPath: string): Promise<BookFile[]> {
  const queue = [rootPath];
  const files: BookFile[] = [];

  while (queue.length > 0) {
    const currentPath = queue.shift()!;
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        queue.push(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(extension)) {
        continue;
      }

      const relativePath = toPosixPath(path.relative(rootPath, absolutePath));
      const title = path.basename(entry.name, extension);

      files.push({
        relativePath,
        absolutePath,
        title,
        extension,
      });
    }
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

router.get('/', async (req, res) => {
  try {
    await access(appConfig.booksPath);
  } catch {
    res.status(404).json({
      error: `Books path not found: ${appConfig.booksPath}. Configure BOOKS_PATH and mount your books directory.`,
    });
    return;
  }

  const books = await collectBookFiles(appConfig.booksPath);
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const updated = new Date().toISOString();

  const entries = books
    .map((book) => {
      const id = createHash('sha1').update(book.relativePath).digest('hex');
      const encodedPath = encodeRelativePath(book.relativePath);
      const downloadUrl = `${baseUrl}/opds/books/${encodedPath}`;
      const mimeType = getMimeTypeByExtension(book.extension);

      return `
  <entry>
    <title>${escapeXml(book.title)}</title>
    <id>urn:koinsight:book:${id}</id>
    <updated>${updated}</updated>
    <link rel="http://opds-spec.org/acquisition"
      href="${escapeXml(downloadUrl)}"
      type="${mimeType}"/>
  </entry>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opds="http://opds-spec.org/2010/catalog">
  <id>urn:koinsight:opds:catalog</id>
  <title>KoInsight OPDS Catalog</title>
  <updated>${updated}</updated>
  <author>
    <name>KoInsight</name>
  </author>${entries}
</feed>`;

  res.setHeader('Content-Type', 'application/atom+xml;profile=opds-catalog;kind=acquisition');
  res.status(200).send(xml);
});

router.get('/books/:encodedPath', async (req, res) => {
  try {
    const relativePath = decodeRelativePath(req.params.encodedPath);

    if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes('..')) {
      res.status(400).json({ error: 'Invalid book path' });
      return;
    }

    const absolutePath = path.resolve(appConfig.booksPath, relativePath);
    const normalizedBooksPath = path.resolve(appConfig.booksPath);

    if (!absolutePath.startsWith(normalizedBooksPath + path.sep) && absolutePath !== normalizedBooksPath) {
      res.status(400).json({ error: 'Invalid book path' });
      return;
    }

    await access(absolutePath);

    res.type(path.extname(absolutePath));
    const extension = path.extname(absolutePath).toLowerCase();
    const filename = path.basename(absolutePath);
    res.download(absolutePath, filename, {
      headers: {
        'Content-Type': getMimeTypeByExtension(extension),
      },
    });
  } catch {
    res.status(404).json({ error: 'Book file not found' });
  }
});

export { router as opdsRouter };
