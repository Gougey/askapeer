import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { comments, handles, posts, reports } from '../db/schema';
import type { CreateReportDto, ReportTargetType } from './reports.dto';

export type ReportResult = { id: string; priority: boolean };

@Injectable()
export class ReportsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * File a report against content or a handle (EPIC-F §2). The target is validated to
   * exist — a report must point at something real — but nothing about it is returned
   * beyond existence, and the priority tier is derived by the column from the category,
   * not trusted from the caller (EPIC-F §4). The report lands `open` for the S11c queue.
   *
   * Self-reports and duplicate reports are permitted: a member re-flagging the same
   * content, or several members flagging it, is signal for the queue, not an error — and
   * suppressing a "you already reported this" would leak that a prior report exists.
   */
  async create(reporterHandleId: string, dto: CreateReportDto): Promise<ReportResult> {
    if (!(await this.targetExists(dto.targetType, dto.targetId))) {
      throw new NotFoundException(`No such ${dto.targetType}.`);
    }
    const [row] = await this.db
      .insert(reports)
      .values({
        reporterHandleId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        category: dto.category,
        comment: dto.comment?.trim() || null,
      })
      .returning({ id: reports.id, priority: reports.priority });
    // The generated column is typed `boolean | null`, but the expression over a NOT NULL
    // category always yields true/false — coerce so the DTO stays a plain boolean.
    return { id: row.id, priority: row.priority ?? false };
  }

  /** Polymorphic existence check across the three target tables (cf. KudosService). */
  private async targetExists(type: ReportTargetType, id: string): Promise<boolean> {
    const table = type === 'post' ? posts : type === 'comment' ? comments : handles;
    const [row] = await this.db.select({ id: table.id }).from(table).where(eq(table.id, id));
    return Boolean(row);
  }
}
