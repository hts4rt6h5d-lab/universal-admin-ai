import { css } from '../lib/css';

function TaskRow({ t }) {
  return (
    <div style={css('background:var(--color-surface);border-radius:14px;padding:14px;display:flex;align-items:flex-start;gap:12px;box-shadow:var(--shadow-sm)')}>
      <button onClick={t.onDone} aria-label="Terminer" style={css('border:0;background:none;padding:0;width:26px;height:26px;flex:none;margin-top:1px;cursor:pointer;display:grid;place-items:center')}>
        {t.done && <i className="ph-fill ph-check-circle" style={css('font-size:26px;color:oklch(0.74 0.11 158)')}></i>}
        {!t.done && <span style={css('width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 2px color-mix(in srgb, var(--color-text) 30%, transparent)')}></span>}
      </button>
      <div style={css('flex:1')}>
        {t.done && <div style={css('font-size:15px;font-weight:500;text-decoration:line-through;color:color-mix(in srgb, var(--color-text) 45%, transparent)')}>{t.title}</div>}
        {!t.done && <div style={css('font-size:15px;font-weight:500')}>{t.title}</div>}
        <div style={css('font-size:13px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-top:3px')}>{t.due} · {t.from}</div>
      </div>
    </div>
  );
}

function TaskGroup({ dotColor, label, items, last }) {
  return (
    <>
      <div style={css('display:flex;align-items:center;gap:8px;margin:6px 0 10px')}>
        <span style={{ ...css('width:9px;height:9px;border-radius:50%'), background: dotColor }}></span>
        <span style={css('font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent)')}>{label}</span>
      </div>
      <div style={css(`display:flex;flex-direction:column;gap:10px;${last ? '' : 'margin-bottom:20px'}`)}>
        {items.map((t) => <TaskRow key={t.id} t={t} />)}
      </div>
    </>
  );
}

export default function Tasks({ tasksRemaining, urgentTasks, soonTasks, plannedTasks }) {
  return (
    <div style={css('height:100%;overflow-y:auto;padding:46px 18px 22px')}>
      <div style={css('margin-bottom:18px')}>
        <h1 style={css('font-size:26px;margin:0 0 2px;font-weight:600')}>À faire</h1>
        <p style={css('font-size:14px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin:0')}>{tasksRemaining} tâches en attente</p>
      </div>
      <TaskGroup dotColor="oklch(0.68 0.15 25)" label="Urgent" items={urgentTasks} />
      <TaskGroup dotColor="oklch(0.77 0.12 72)" label="À faire bientôt" items={soonTasks} />
      <TaskGroup dotColor="oklch(0.74 0.11 158)" label="Planifié" items={plannedTasks} last />
    </div>
  );
}
