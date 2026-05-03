import { Progress } from '@koinsight/common/types/progress';
import { User } from '@koinsight/common/types/user';
import { db } from '../knex';

export type ProgressCreate = Omit<Progress, 'id' | 'created_at' | 'updated_at'>;
export type ProgressUpdate = Omit<Progress, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export class KosyncRepository {
  private static normalizeDocument(document: Progress['document']): string {
    const decodedDocument = decodeURIComponent(document);
    const segments = decodedDocument.split('/');
    const fileName = segments.at(-1) ?? decodedDocument;
    return fileName.replace(/\.[^.]+$/, '').trim().toLowerCase();
  }

  private static isSameBookDocument(a: Progress['document'], b: Progress['document']): boolean {
    return this.normalizeDocument(a) === this.normalizeDocument(b);
  }

  private static async getByUserIdAndBookTitle(
    user_id: User['id'],
    document: Progress['document']
  ): Promise<Progress[]> {
    const progresses = await db<Progress>('progress').where({ user_id }).select('*');
    return progresses.filter((progress) => this.isSameBookDocument(progress.document, document));
  }

  static async hasDocument(user_id: User['id'], document: Progress['document']): Promise<boolean> {
    const results = await this.getByUserIdAndBookTitle(user_id, document);
    return results.length > 0;
  }

  static async create(progress: ProgressCreate): Promise<Progress | undefined> {
    const date = new Date();
    const result = await db<Progress>('progress')
      .insert({ ...progress, created_at: date, updated_at: date })
      .returning('*');
    return result.at(0);
  }

  static async update(
    user_id: User['id'],
    progress: ProgressUpdate,
    id?: Progress['id']
  ): Promise<Progress | undefined> {
    const query = db<Progress>('progress').where({ user_id });

    if (id) {
      query.andWhere({ id });
    } else {
      query.andWhere({ document: progress.document });
    }

    const result = await query.update({ ...progress, updated_at: new Date() }).returning('*');

    return result.at(0);
  }

  static async upsert(
    user_id: User['id'],
    progress: ProgressUpdate
  ): Promise<Progress | undefined> {
    const progresses = await this.getByUserIdAndBookTitle(user_id, progress.document);
    const bestProgress = progresses.sort((a, b) => b.percentage - a.percentage).at(0);

    if (!bestProgress) {
      return this.create({ ...progress, user_id });
    }

    if (progress.percentage <= bestProgress.percentage) {
      return bestProgress;
    }

    return this.update(user_id, progress, bestProgress.id);
  }

  static async getByUserIdAndDocument(
    user_id: User['id'],
    document: Progress['document']
  ): Promise<Progress | undefined> {
    const progresses = await this.getByUserIdAndBookTitle(user_id, document);
    return progresses.sort((a, b) => b.percentage - a.percentage).at(0);
  }

  static async getAll(): Promise<Progress[]> {
    const result = await db<Progress>('progress')
      .select(
        'progress.document',
        'progress.progress',
        'progress.percentage',
        'progress.device',
        'progress.device_id',
        'progress.created_at',
        'progress.updated_at',
        'user.username'
      )
      .innerJoin('user', 'user.id', 'progress.user_id');
    return result;
  }
}
