
import React from 'react';
import { Loader2 } from 'lucide-react';

/** Glass Card — the universal card surface */
export const GlassPanel: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style }) => (
  <div className={`glass-card ${className}`} style={style}>
    {children}
  </div>
);

/** Primary CTA button — indigo background */
export const NeonButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ElementType;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost';
  className?: string;
}> = ({ onClick, disabled, loading, icon: Icon, children, variant = 'primary', className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className={`${variant === 'ghost' ? 'btn-ghost' : 'btn-primary'} ${className}`}
  >
    {loading ? <Loader2 size={16} className="spinner" /> : Icon && <Icon size={16} />}
    {children}
  </button>
);

/** Severity Pill */
export const SeverityPill: React.FC<{ severity: string }> = ({ severity }) => {
  const s = severity.toLowerCase();
  return (
    <span className={`severity-pill severity-pill--${s}`}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
        background: s === 'critical' ? '#FF3B5C' : s === 'high' ? '#FF6B2B' : s === 'medium' ? '#FFB800' : '#00FF87'
      }} />
      {severity.toUpperCase()}
    </span>
  );
};

/** Card Header with accent bar */
export const CardHeader: React.FC<{ title: string; cyan?: boolean }> = ({ title, cyan }) => (
  <div className="card-header">
    <div className={`card-accent-bar${cyan ? ' card-accent-bar--cyan' : ''}`} />
    <span className="card-title">{title}</span>
  </div>
);
