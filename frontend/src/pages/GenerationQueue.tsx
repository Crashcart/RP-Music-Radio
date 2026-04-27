import { useState, useEffect } from 'react';
import { api, type Draft, type TaskStatus } from '../api/client';

interface Props {
  drafts: Draft[];
}

export function GenerationQueue({ drafts }: Props) {
  const [tasks, setTasks] = useState<Map<string, TaskStatus>>(new Map());

  // Poll task statuses
  useEffect(() => {
    const activeDrafts = drafts.filter(d => d.task_id && d.status !== 'completed');
    if (activeDrafts.length === 0) return;

    const poll = async () => {
      for (const draft of activeDrafts) {
        if (!draft.task_id) continue;
        try {
          const status = await api.getTask(draft.task_id);
          setTasks(prev => new Map(prev).set(draft.task_id!, status));
        } catch {
          // Task not found yet — skip
        }
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [drafts]);

  const stageLabel = (status: string): string => {
    const map: Record<string, string> = {
      queued: '⏳ Queued',
      resolving_dna: '🧬 Resolving DNA',
      generating_script: '📝 Generating Script',
      generating_audio: '🎵 Generating Audio',
      generating_art: '🎨 Generating Art',
      imprinting: '💿 Imprinting Metadata',
      finalizing: '✨ Finalizing',
      completed: '✅ Completed',
      failed: '❌ Failed',
    };
    return map[status] || status;
  };

  return (
    <div>
      <div className="page-header">
        <h2>⚡ Generation Queue</h2>
        <p>Monitor synthesis progress in real-time</p>
      </div>

      {drafts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">⚡</div>
            <div className="empty-title">No active generations</div>
            <div className="empty-description">
              Commit some drafts from the Drafting Table to start generating Lore-Shard MP3s.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {drafts.map(draft => {
            const task = draft.task_id ? tasks.get(draft.task_id) : null;
            const progress = task?.progress ?? 0;
            const status = task?.status ?? draft.status;

            return (
              <div key={draft.id} className="card task-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 2 }}>
                      {draft.artist_name}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {draft.station_name} • {draft.genre || 'varied'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>
                      {stageLabel(status)}
                    </div>
                    <span className={`badge badge-${status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'generating'}`}>
                      <span className="badge-dot" />
                      {progress}%
                    </span>
                  </div>
                </div>

                <div className="progress-bar" style={{ marginTop: 'var(--space-md)' }}>
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>

                {task?.output_file && (
                  <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-deep)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--success)' }}>
                    📁 {task.output_file}
                  </div>
                )}

                {task?.error && (
                  <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-sm) var(--space-md)', background: 'hsla(0,75%,55%,0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--error)' }}>
                    ⚠️ {task.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
