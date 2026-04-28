import { NextFunction, Request, Response, Router } from 'express';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import multer from 'multer';
import { appConfig } from '../config';
import { BooksRepository } from './books-repository';
import { BooksService } from './books-service';
import { coversRouter } from './covers/covers-router';
import { getBookById } from './get-book-by-id-middleware';

const router = Router();
const allowedBookExtensions = new Set(['.epub', '.pdf', '.txt']);

const bookUploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(appConfig.booksPath)) {
      mkdirSync(appConfig.booksPath, { recursive: true });
    }
    cb(null, appConfig.booksPath);
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
  },
});

const bookUpload = multer({
  storage: bookUploadStorage,
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedBookExtensions.has(extension)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only .epub, .pdf, and .txt files are allowed'));
  },
  limits: { fileSize: appConfig.upload.maxFileSizeMegaBytes * 1024 * 1024 },
});

router.use('/:bookId/cover', coversRouter);

router.post('/upload', bookUpload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  res.status(200).json({
    message: 'Book uploaded successfully',
    file: req.file.filename,
  });
});

/**
 * Get all books with attached entity data
 */
router.get('/', async (req: Request, res: Response) => {
  const returnDeleted = Boolean(req.query.showHidden && req.query.showHidden === 'true');
  const books = await BooksRepository.getAllWithData(returnDeleted);
  res.status(200).json(books);
});

/**
 * Get a book with attached entity data by ID
 */
router.get('/:bookId', getBookById, async (req: Request, res: Response, next: NextFunction) => {
  const book = req.book!;
  const includeDeleted = req.query.includeDeleted === 'true';
  const bookWithData = await BooksService.withData(book, includeDeleted);
  res.status(200).json(bookWithData);
});

/**
 * Delete a book by ID
 */
router.delete('/:bookId', getBookById, async (req: Request, res: Response) => {
  const book = req.book!;

  try {
    await BooksRepository.delete(book);
    res.status(200).json({ message: 'Book deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

router.put('/:bookId/hide', getBookById, async (req: Request, res: Response) => {
  const book = req.book!;
  const hidden = req.body.hidden;

  if (hidden === undefined || hidden === null) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    await BooksRepository.softDelete(book.id, hidden);
    res.status(200).json({ message: `Book ${hidden ? 'hidden' : 'shown'}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update book visibility' });
  }
});

/**
 * Adds a new genre to a book
 */
router.post('/:bookId/genres', getBookById, async (req: Request, res: Response) => {
  const book = req.book!;
  const { genreName } = req.body;

  if (!genreName) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    await BooksRepository.addGenre(book.md5, genreName);
    res.status(200).json({ message: 'Genre added' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add genre' });
  }
});

/**
 * Updates a book's reference pages
 */
router.put('/:bookId/reference_pages', getBookById, async (req: Request, res: Response) => {
  const book = req.book!;
  const { reference_pages } = req.body;

  if (reference_pages === undefined || reference_pages === null) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    await BooksRepository.setReferencePages(book.id, reference_pages);
    res.status(200).json({ message: 'Reference pages updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update reference pages' });
  }
});

router.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    const maxMb = Math.round(appConfig.upload.maxFileSizeMegaBytes);
    res.status(413).json({ error: `File too large. Maximum file size allowed is ${maxMb} MB.` });
    return;
  }

  if (err?.message === 'Only .epub, .pdf, and .txt files are allowed') {
    res.status(400).json({ error: err.message });
    return;
  }

  next(err);
});

export { router as booksRouter };
