import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { exit } from 'node:process';
import { DatabaseSync } from 'node:sqlite';

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { TypedConfigService } from '@common/config/app-config';

export interface IResetPeriod {
    start: Date;
    end: Date;
}

export interface IResetUsage {
    used: number;
    period: IResetPeriod;
}

/**
 * Persists self-service traffic resets so the monthly quota survives restarts
 * and is shared between PM2 cluster instances. Backed by the SQLite build that
 * ships with Node.js, so no native dependency is required.
 */
@Injectable()
export class TrafficResetRepository implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TrafficResetRepository.name);
    private db: DatabaseSync | null = null;

    constructor(private readonly configService: TypedConfigService) {}

    onModuleInit(): void {
        if (this.configService.getOrThrow('TRAFFIC_RESET_LIMIT_PER_MONTH') === 0) {
            return;
        }

        const dataDir = path.resolve(process.cwd(), this.configService.getOrThrow('DATA_DIR'));
        const dbPath = path.join(dataDir, 'subpage.sqlite');

        try {
            mkdirSync(dataDir, { recursive: true });

            this.db = new DatabaseSync(dbPath, { timeout: 5_000 });
            this.db.exec('PRAGMA journal_mode = WAL;');
            this.db.exec('PRAGMA synchronous = NORMAL;');
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS traffic_resets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    short_uuid TEXT NOT NULL,
                    reset_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_traffic_resets_user_reset_at
                    ON traffic_resets (user_id, reset_at);
            `);

            this.logger.log(`[OK] Traffic reset storage: ${dbPath}`);
        } catch (error) {
            this.logger.error(
                `[FATAL] Cannot open traffic reset storage at ${dbPath}. ` +
                    'Mount a writable volume to DATA_DIR or set TRAFFIC_RESET_LIMIT_PER_MONTH=0.',
            );
            this.logger.error(error);

            exit(1);
        }
    }

    onModuleDestroy(): void {
        this.db?.close();
        this.db = null;
    }

    /** Calendar month in UTC that contains `now`. */
    public getPeriod(now: Date = new Date()): IResetPeriod {
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

        return { start, end };
    }

    public getUsage(userId: number, now: Date = new Date()): IResetUsage {
        const period = this.getPeriod(now);

        const row = this.getDb()
            .prepare(
                'SELECT COUNT(*) AS used FROM traffic_resets WHERE user_id = ? AND reset_at >= ? AND reset_at < ?',
            )
            .get(userId, period.start.toISOString(), period.end.toISOString()) as
            | { used: number }
            | undefined;

        return { used: Number(row?.used ?? 0), period };
    }

    /**
     * Atomically consumes one reset from the user's monthly quota.
     * Returns the reservation id, or `null` when the quota is exhausted.
     * Call `release()` if the downstream reset fails.
     */
    public reserve(
        userId: number,
        shortUuid: string,
        limit: number,
        now: Date = new Date(),
    ): number | null {
        const db = this.getDb();
        const period = this.getPeriod(now);

        db.exec('BEGIN IMMEDIATE;');

        try {
            const row = db
                .prepare(
                    'SELECT COUNT(*) AS used FROM traffic_resets WHERE user_id = ? AND reset_at >= ? AND reset_at < ?',
                )
                .get(userId, period.start.toISOString(), period.end.toISOString()) as
                | { used: number }
                | undefined;

            if (Number(row?.used ?? 0) >= limit) {
                db.exec('ROLLBACK;');
                return null;
            }

            const result = db
                .prepare(
                    'INSERT INTO traffic_resets (user_id, short_uuid, reset_at) VALUES (?, ?, ?)',
                )
                .run(userId, shortUuid, now.toISOString());

            db.exec('COMMIT;');

            return Number(result.lastInsertRowid);
        } catch (error) {
            db.exec('ROLLBACK;');
            throw error;
        }
    }

    public release(reservationId: number): void {
        this.getDb().prepare('DELETE FROM traffic_resets WHERE id = ?').run(reservationId);
    }

    private getDb(): DatabaseSync {
        if (!this.db) {
            throw new Error('Traffic reset storage is not initialised');
        }

        return this.db;
    }
}
