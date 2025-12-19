import React, { ReactNode, useState } from 'react';
import { Home, Folder, Cpu, Settings, LogOut, Menu } from 'lucide-react';

type Props = {
  children: ReactNode;
  onNewProject?: () => void;
};

export default function DashboardLayout({ children, onNewProject }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      <aside className={`flex flex-col transition-all duration-200 bg-slate-900 border-r border-slate-800 ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className="h-16 flex items-center justify-between px-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center ${collapsed ? 'mx-auto' : ''}`}>
              <span className="font-bold text-sm text-white">CS</span>
            </div>
            {!collapsed && <div className="leading-tight">
              <div className="font-bold">CodeSensei</div>
              <div className="text-xs text-slate-400">AI Architect</div>
            </div>}
          </div>
          <button onClick={() => setCollapsed(c => !c)} className="p-1 rounded hover:bg-slate-800/50">
            <Menu size={16} />
          </button>
        </div>

        <nav className="flex-1 px-1 py-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Home },
            { id: 'projects', label: 'Projects', icon: Folder },
            { id: 'agents', label: 'Agents', icon: Cpu },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((item) => (
            <button key={item.id} className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-800/40 rounded">
              <item.icon size={18} />
              {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-200">U</div>
            {!collapsed && <div className="flex-1">
              <div className="text-sm font-medium">Guest</div>
              <div className="text-xs text-slate-400">View profile</div>
            </div>}
            <button className="p-2 rounded hover:bg-slate-800/50"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50">
          <div className="text-slate-300 font-medium">Dashboard</div>
          <div>
            <button onClick={onNewProject} className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 rounded text-black font-semibold">New Project</button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-slate-950">{children}</main>
      </div>
    </div>
  );
}
