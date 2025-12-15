
import React from 'react';
import { Loader2 } from 'lucide-react';

export const GlassPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl ${className}`}>
    {children}
  </div>
);

export const NeonButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ElementType;
  children: React.ReactNode;
  variant?: 'blue' | 'purple' | 'green' | 'red';
  className?: string;
}> = ({ onClick, disabled, loading, icon: Icon, children, variant = 'blue', className = '' }) => {
  
  const colors = {
    blue: 'from-cyan-500 to-blue-600 shadow-cyan-500/20 hover:shadow-cyan-500/40 border-cyan-400/20',
    purple: 'from-purple-500 to-indigo-600 shadow-purple-500/20 hover:shadow-purple-500/40 border-purple-400/20',
    green: 'from-emerald-500 to-teal-600 shadow-emerald-500/20 hover:shadow-emerald-500/40 border-emerald-400/20',
    red: 'from-red-500 to-pink-600 shadow-red-500/20 hover:shadow-red-500/40 border-red-400/20',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide text-white
        bg-gradient-to-r ${colors[variant]}
        border-t border-l
        flex items-center justify-center gap-2
        transition-all duration-300 transform
        hover:-translate-y-0.5 active:scale-95 active:translate-y-0
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${className}
      `}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
};
