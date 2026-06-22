'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) {
      api<{ notifications: Notification[] }>('/notifications')
        .then((d) => setNotifications(d.notifications))
        .catch(console.error);
    }
  }, [user, loading, router]);

  const markAll = async () => {
    await api('/notifications/read-all', { method: 'PUT' });
    setNotifications((n) => n.map((x) => ({ ...x, is_read: true })));
  };

  const icon = (type: string) => {
    switch (type) {
      case 'win': return '🏆';
      case 'deposit': return '💰';
      case 'withdrawal': return '💸';
      case 'match': return '⚽';
      default: return '📢';
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black">Notifications</h1>
        <button onClick={markAll} className="text-primary-500 text-sm hover:underline">Mark all read</button>
      </div>

      {notifications.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">No notifications</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`card flex gap-3 ${!n.is_read ? 'border-primary-500/30' : ''}`}>
              <span className="text-2xl">{icon(n.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{n.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{n.message}</p>
                <p className="text-gray-600 text-[10px] mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0 mt-2" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
