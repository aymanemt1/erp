/** Tiny hand-rolled SVG charts — no chart library needed. */

export function BarChart({ data = [], height = 180, format }) {
  const vals = data.map((d) => Number(d.value || 0));
  const max = Math.max(...vals, 1);
  const W = 560;
  const H = height;
  const padB = 26;
  const n = Math.max(data.length, 1);
  const bw = Math.min(44, (W / n) * 0.55);
  const step = W / n;
  const fmt = format || ((v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a5b4fc" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1="0" x2={W} y1={(H - padB) * (1 - f)} y2={(H - padB) * (1 - f)} stroke="#e2e8f0" strokeDasharray="4 4" />
      ))}
      {data.map((d, i) => {
        const v = Number(d.value || 0);
        const h = Math.max(3, ((H - padB - 8) * v) / max);
        const x = step * i + (step - bw) / 2;
        const y = H - padB - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={h} rx="6" fill="url(#barGrad)" opacity={v === 0 ? 0.25 : 1}>
              <title>{`${d.label}: ${fmt(v)}`}</title>
            </rect>
            <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="600">
              {v > 0 ? fmt(v) : ''}
            </text>
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const DONUT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export function DonutChart({ data = [], size = 170 }) {
  const total = data.reduce((s, d) => s + Number(d.value || 0), 0) || 1;
  const R = 60;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 160 160" className="shrink-0">
        <circle cx="80" cy="80" r={R} fill="none" stroke="#f1f5f9" strokeWidth="24" />
        {data.map((d, i) => {
          const frac = Number(d.value || 0) / total;
          const dash = `${frac * C} ${C}`;
          const rot = (acc / total) * 360;
          acc += Number(d.value || 0);
          return (
            <circle
              key={i}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={d.color || DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth="24"
              strokeDasharray={dash}
              transform={`rotate(${rot - 90} 80 80)`}
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </circle>
          );
        })}
        <text x="80" y="76" textAnchor="middle" fontSize="20" fontWeight="800" fill="#0f172a">
          {data.length}
        </text>
        <text x="80" y="94" textAnchor="middle" fontSize="10" fill="#64748b">
          categories
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.slice(0, 6).map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color || DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="truncate font-medium">{d.label}</span>
            <span className="ml-auto font-bold text-slate-800">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
