export function generateMd5Hash(title: string): string {
  return require('crypto').createHash('md5').update(title).digest('hex');
}

export function normalizeBookTitle(title: string): string {
  return title
    .replace(/\s*[（(][^）)]*[）)]\s*$/u, '')
    .trim();
}
