import { getDatabase } from '../index';
import { v4 as uuidv4 } from 'uuid';

export interface ScheduledTaskRow {
  id: string;
  type: string;
  reference_id: string;
  execute_at: string;
  status: string;
  result: string | null;
  created_at: string;
}

export const scheduledTaskRepo = {
  findPending(): ScheduledTaskRow[] {
    return getDatabase().prepare(
      "SELECT * FROM scheduled_tasks WHERE status = 'pending' AND execute_at <= datetime('now') ORDER BY execute_at ASC"
    ).all() as ScheduledTaskRow[];
  },

  findById(id: string): ScheduledTaskRow | undefined {
    return getDatabase().prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as ScheduledTaskRow | undefined;
  },

  create(data: {
    type: 'notification' | 'action';
    referenceId: string;
    executeAt: string;
  }): ScheduledTaskRow {
    const id = uuidv4();
    getDatabase().prepare(`
      INSERT INTO scheduled_tasks (id, type, reference_id, execute_at)
      VALUES (?, ?, ?, ?)
    `).run(id, data.type, data.referenceId, data.executeAt);
    return this.findById(id)!;
  },

  updateStatus(id: string, status: string, result?: string): void {
    if (result) {
      getDatabase().prepare('UPDATE scheduled_tasks SET status = ?, result = ? WHERE id = ?').run(status, result, id);
    } else {
      getDatabase().prepare('UPDATE scheduled_tasks SET status = ? WHERE id = ?').run(status, id);
    }
  },

  cancel(id: string): boolean {
    const result = getDatabase().prepare("UPDATE scheduled_tasks SET status = 'cancelled' WHERE id = ? AND status = 'pending'").run(id);
    return result.changes > 0;
  },
};
