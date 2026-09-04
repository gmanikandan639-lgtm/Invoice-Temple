import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useData } from '../../context/DataContext';
import { AlertTriangle, Info, X } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentPath,
  onNavigate,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { announcements } = useData();
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);

  // Find active un-dismissed announcements
  const activeAnnouncements = announcements.filter(
    (a) => !dismissedAnnouncements.includes(a.id)
  );

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Sidebar (hidden on print) */}
      <div className="print:hidden">
        <Sidebar
          currentPath={currentPath}
          onNavigate={onNavigate}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* Top Navbar (hidden on print) */}
        <div className="print:hidden">
          <Navbar
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onNavigate={onNavigate}
            currentPath={currentPath}
          />

          {/* Broadcast Admin Announcement Banners */}
          {activeAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className={`px-4 py-2.5 text-xs flex items-center justify-between gap-3 border-b ${
                ann.priority === 'urgent'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : ann.priority === 'important'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-sky-50 text-sky-900 border-sky-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {ann.priority === 'urgent' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className="font-bold">{ann.title}:</span>
                <span>{ann.message}</span>
              </div>
              <button
                onClick={() => setDismissedAnnouncements((prev) => [...prev, ann.id])}
                className="p-1 hover:bg-black/5 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
};
