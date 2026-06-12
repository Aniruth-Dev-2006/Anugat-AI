import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  subLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  accent?: string;
}

export default function StatCard({
  label,
  value,
  delta,
  deltaPositive = true,
  subLabel,
  icon: Icon,
  iconColor = '#3DA1FF',
  accent = '#3DA1FF',
}: StatCardProps) {
  return (
    <div className="stat-card">
      {/* Icon badge */}
      <div className="stat-card-icon" style={{ color: iconColor, background: `${accent}14` }}>
        <Icon size={20} strokeWidth={1.75} />
      </div>

      {/* Label */}
      <p className="stat-card-label">{label}</p>

      {/* Big value */}
      <p className="stat-card-value">{value}</p>

      {/* Delta / sub-label */}
      {delta && (
        <p
          className="stat-card-delta"
          style={{ color: deltaPositive ? '#16a34a' : '#dc2626' }}
        >
          {deltaPositive ? '▲' : '▼'} {delta}
        </p>
      )}
      {subLabel && !delta && (
        <p className="stat-card-sublabel">{subLabel}</p>
      )}
    </div>
  );
}
