import { Book } from '@koinsight/common/types';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, promises, rename, rmSync } from 'fs';
import path from 'path';
import { appConfig } from '../../config';

const execFileAsync = promisify(execFile);
const EPUB_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

export class CoversService {
  static async get(book: Book): Promise<string | null> {
    const files = await promises.readdir(appConfig.coversPath);
    const file = files.find((f) => f.startsWith(book.md5));

    if (file) {
      return `${appConfig.coversPath}/${file}`;
    }

    const extractedCover = await this.extractFromMatchingEpub(book);
    return extractedCover;
  }

  static async deleteExisting(book: Book) {
    const files = await promises.readdir(appConfig.coversPath);
    const file = files.find((f) => f.startsWith(book.md5));

    if (file) {
      const filePath = `${appConfig.coversPath}/${file}`;
      rmSync(filePath, { force: true });
    }
  }

  static async upload(book: Book, file: Express.Multer.File) {
    if (!existsSync(appConfig.coversPath)) {
      mkdirSync(appConfig.coversPath, { recursive: true });
    }

    const extension = path.extname(file.originalname) || '';
    const newFilename = `${book.md5}${extension}`;
    const newPath = path.join(path.dirname(file.path), newFilename);
    await rename(file.path, newPath, () => {});
  }

  private static async extractFromMatchingEpub(book: Book): Promise<string | null> {
    const epubPath = await this.findMatchingEpubFile(book.title);
    if (!epubPath) {
      return null;
    }

    const coverInEpubPath = await this.findCoverImagePathInEpub(epubPath);
    if (!coverInEpubPath) {
      return null;
    }

    const coverBuffer = await this.readFileFromZip(epubPath, coverInEpubPath);
    if (!coverBuffer || coverBuffer.length === 0) {
      return null;
    }

    if (!existsSync(appConfig.coversPath)) {
      mkdirSync(appConfig.coversPath, { recursive: true });
    }

    const extension = this.resolveCoverExtension(coverInEpubPath, coverBuffer);
    const coverPath = path.join(appConfig.coversPath, `${book.md5}${extension}`);
    await promises.writeFile(coverPath, coverBuffer);

    return coverPath;
  }

  private static async findMatchingEpubFile(bookTitle: string): Promise<string | null> {
    const rootPath = appConfig.booksPath;
    const queue = [rootPath];
    const normalizedBookTitle = this.normalizeBookName(bookTitle);

    while (queue.length > 0) {
      const currentPath = queue.shift()!;
      const entries = await promises.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const absolutePath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          queue.push(absolutePath);
          continue;
        }

        if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.epub') {
          continue;
        }

        const basename = path.basename(entry.name, '.epub');
        const normalizedBasename = this.normalizeBookName(basename);

        if (this.isMatchingTitle(basename, bookTitle, normalizedBookTitle, normalizedBasename)) {
          return absolutePath;
        }
      }
    }

    return null;
  }


  private static isMatchingTitle(
    basename: string,
    bookTitle: string,
    normalizedBookTitle: string,
    normalizedBasename: string
  ): boolean {
    if (basename === bookTitle || normalizedBasename === normalizedBookTitle) {
      return true;
    }

    const filenameTitle = basename.split(/\s*-\s*/)[0];
    return this.normalizeBookName(filenameTitle) === normalizedBookTitle;
  }

  private static normalizeBookName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private static async findCoverImagePathInEpub(epubPath: string): Promise<string | null> {
    const containerXml = await this.readTextFileFromZip(epubPath, 'META-INF/container.xml');
    if (!containerXml) {
      return null;
    }

    const opfRelativePath = this.extractOpfPath(containerXml);
    if (!opfRelativePath) {
      return null;
    }

    const opfContents = await this.readTextFileFromZip(epubPath, opfRelativePath);
    if (!opfContents) {
      return null;
    }

    const opfDirectory = path.posix.dirname(opfRelativePath);
    const coverHref = this.extractCoverHrefFromOpf(opfContents);
    if (coverHref) {
      return path.posix.normalize(path.posix.join(opfDirectory, coverHref));
    }

    const entryList = await this.listZipEntries(epubPath);
    const coverEntry = entryList.find((entry) => {
      const lowerEntry = entry.toLowerCase();
      return (
        lowerEntry.includes('cover') && EPUB_IMAGE_EXTENSIONS.has(path.posix.extname(lowerEntry))
      );
    });

    return coverEntry ?? null;
  }

  private static extractOpfPath(containerXml: string): string | null {
    const rootfileMatch = containerXml.match(/full-path\s*=\s*["']([^"']+)["']/i);
    return rootfileMatch?.[1] ?? null;
  }

  private static extractCoverHrefFromOpf(opfContents: string): string | null {
    const metaCoverId = opfContents.match(
      /<meta[^>]*name\s*=\s*["']cover["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>/i
    )?.[1];

    if (metaCoverId) {
      const byId = this.findManifestHrefByAttribute(opfContents, 'id', metaCoverId);
      if (byId) {
        return byId;
      }
    }

    const byProperty = opfContents.match(
      /<item[^>]*properties\s*=\s*["'][^"']*cover-image[^"']*["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i
    )?.[1];
    if (byProperty) {
      return byProperty;
    }

    const fallbackById = this.findManifestHrefByAttribute(opfContents, 'id', 'cover');
    if (fallbackById) {
      return fallbackById;
    }

    return opfContents.match(
      /<item[^>]*href\s*=\s*["']([^"']*cover[^"']*\.(?:jpe?g|png|gif|webp))["'][^>]*>/i
    )?.[1] ?? null;
  }

  private static findManifestHrefByAttribute(
    opfContents: string,
    attributeName: string,
    attributeValue: string
  ): string | null {
    const escaped = attributeValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `<item[^>]*${attributeName}\\s*=\\s*["']${escaped}["'][^>]*href\\s*=\\s*["']([^"']+)["'][^>]*>`,
      'i'
    );
    return opfContents.match(pattern)?.[1] ?? null;
  }

  private static async listZipEntries(zipPath: string): Promise<string[]> {
    const { stdout } = await execFileAsync('unzip', ['-Z1', zipPath], {
      maxBuffer: 4 * 1024 * 1024,
    });

    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private static async readTextFileFromZip(
    zipPath: string,
    zipEntryPath: string
  ): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync('unzip', ['-p', zipPath, zipEntryPath], {
        maxBuffer: 4 * 1024 * 1024,
      });
      return stdout ? stdout.toString() : null;
    } catch {
      return null;
    }
  }

  private static async readFileFromZip(zipPath: string, zipEntryPath: string): Promise<Buffer | null> {
    try {
      const { stdout } = await execFileAsync('unzip', ['-p', zipPath, zipEntryPath], {
        encoding: 'buffer',
        maxBuffer: 25 * 1024 * 1024,
      });
      return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
    } catch {
      return null;
    }
  }

  private static resolveCoverExtension(zipEntryPath: string, coverBuffer: Buffer): string {
    const extension = path.extname(zipEntryPath).toLowerCase();
    if (EPUB_IMAGE_EXTENSIONS.has(extension)) {
      return extension === '.jpeg' ? '.jpg' : extension;
    }

    if (coverBuffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
      return '.png';
    }

    if (coverBuffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
      return '.jpg';
    }

    if (coverBuffer.subarray(0, 3).equals(Buffer.from('GIF'))) {
      return '.gif';
    }

    return '.jpg';
  }
}
