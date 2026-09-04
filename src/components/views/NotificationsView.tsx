import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  FileText,
  CreditCard,
  AlertCircle,
  Megaphone,
  CheckCircle,
  Filter,
  Search,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { AppNotification } from '../../types';
import { formatDateTime } from '../../utils/formatters';

interface NotificationsViewProps {
  onNavigate?: (path: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const { notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead } =
    useData();
  const [filter, setFilter] = useState<'all' | 'unread' | 'invoice' | 'payment' | 'announcement'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotifications = notifications.filter((notif) => {
    // Filter by type or unread status
    if (filter === 'unread' && notif.isRead) return false;
    if (filter === 'invoice' && !notif.type.startsWith('invoice_')) return false;
    if (filter === 'payment' && notif.type !== 'payment_received') return false;
    if (filter === 'announcement' && notif.type !== 'announcement') return false;

    // Filter by query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        notif.title.toLowerCase().includes(q) ||
        notif.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'invoice_created':
      case 'invoice_updated':
        return <FileText className="w-5 h-5 text-amber-500" />;
      case 'invoice_paid':
      case 'payment_received':
        return <CreditCard className="w-5 h-5 text-emerald-500" />;
      case 'invoice_overdue':
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'announcement':
        return <Megaphone className="w-5 h-5 text-sky-500" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const handleClick = (notif: AppNotification) => {
    if (!notif.isRead) {
      markNotificationRead(notif.id);
    }
    if (notif.relatedInvoiceId && onNavigate) {
      onNavigate(`/invoice/${notif.relatedInvoiceId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-amber-500" />
            System Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time activity alerts, payment confirmations, and system updates
          </p>
        </div>

        {unreadNotificationCount > 0 && (
          <button
            id="mark-all-read-btn"
            onClick={() => markAllNotificationsRead()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            Mark all as read ({unreadNotificationCount})
          </button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'unread'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Unread ({unreadNotificationCount})
          </button>
          <button
            onClick={() => setFilter('invoice')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'invoice'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => setFilter('payment')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'payment'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Payments
          </button>
          <button
            onClick={() => setFilter('announcement')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'announcement'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Announcements
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search notification messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
        {filteredNotifications.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Bell className="w-12 h-12 mx-auto text-slate-300 mb-3 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-600">No notifications found</p>
            <p className="text-xs text-slate-400 mt-1">
              {filter !== 'all' || searchQuery
                ? 'Try clearing your filters or search query.'
                : 'You are completely caught up!'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`p-4 flex items-start gap-4 transition-colors cursor-pointer ${
                notif.isRead ? 'hover:bg-slate-50/80' : 'bg-amber-50/30 hover:bg-amber-50/60'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  notif.isRead ? 'bg-slate-100' : 'bg-white shadow-xs border border-slate-200'
                }`}
              >
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className={`text-sm tracking-tight ${
                      notif.isRead ? 'font-medium text-slate-800' : 'font-bold text-slate-950'
                    }`}
                  >
                    {notif.title}
                  </h3>
                  <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">
                    {formatDateTime(notif.createdAt)}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>

                {notif.relatedInvoiceId && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                      View Invoice &rarr;
                    </span>
                  </div>
                )}
              </div>

              {!notif.isRead && (
                <span
                  title="Unread"
                  className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-2"
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
