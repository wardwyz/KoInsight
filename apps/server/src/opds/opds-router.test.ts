import express from 'express';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { appConfig } from '../config';
import { opdsRouter } from './opds-router';

describe('opds router', () => {
  const app = express();
  app.use('/opds', opdsRouter);

  const originalBooksPath = appConfig.booksPath;
  let tempBooksPath = '';

  beforeEach(async () => {
    tempBooksPath = await mkdtemp(path.join(os.tmpdir(), 'koinsight-opds-'));
    appConfig.booksPath = tempBooksPath;
  });

  afterEach(async () => {
    appConfig.booksPath = originalBooksPath;
    await rm(tempBooksPath, { recursive: true, force: true });
  });

  it('returns OPDS entries with file-specific MIME type', async () => {
    await writeFile(path.join(tempBooksPath, 'sample.epub'), 'book-content');

    const response = await request(app).get('/opds');

    expect(response.status).toBe(200);
    expect(response.type).toContain('application/atom+xml');
    expect(response.text).toContain('type="application/epub+zip"');
  });


  it('includes parsed author metadata when filename follows "title - author"', async () => {
    const fileName = '人呐 - 莫言.epub';
    await writeFile(path.join(tempBooksPath, fileName), 'book-content');

    const response = await request(app).get('/opds');

    expect(response.status).toBe(200);
    expect(response.text).toContain('<title>人呐</title>');
    expect(response.text).toContain('<name>莫言</name>');
  });

  it('downloads files with original filename and MIME type', async () => {
    const fileName = 'downloadable.epub';
    await writeFile(path.join(tempBooksPath, fileName), 'book-content');
    const encodedPath = Buffer.from(fileName, 'utf8').toString('base64url');

    const response = await request(app).get(`/opds/books/${encodedPath}`);

    expect(response.status).toBe(200);
    expect(response.header['content-type']).toContain('application/epub+zip');
    expect(response.header['content-disposition']).toContain(`filename="${fileName}"`);
  });


  it('sets UTF-8 content disposition for chinese filenames', async () => {
    const fileName = '中文书名.epub';
    await writeFile(path.join(tempBooksPath, fileName), 'book-content');
    const encodedPath = Buffer.from(fileName, 'utf8').toString('base64url');

    const response = await request(app).get(`/opds/books/${encodedPath}`);

    expect(response.status).toBe(200);
    expect(response.header['content-disposition']).toContain("filename*=UTF-8''%E4%B8%AD%E6%96%87%E4%B9%A6%E5%90%8D.epub");
  });
});
