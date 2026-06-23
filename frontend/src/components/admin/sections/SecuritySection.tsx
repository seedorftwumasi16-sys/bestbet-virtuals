'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AdminCard, AdminTable } from '../shared';

export default function SecuritySection({ userRole }: { userRole: string }) {
  const [auditLogs, setAuditLogs] = useState<Array<Record<string, unknown>>>([]);
  const [loginHistory, setLoginHistory] = useState<Array<Record<string, unknown>>>([]);
  const [roles, setRoles] = useState<Array<Record<string, string>>>([]);

  useEffect(() => {
    api<Array<Record<string, unknown>>>('/admin/audit-logs').then(setAuditLogs).catch(console.error);
    if (userRole === 'admin' || userRole === 'super_admin') {
      api<Array<Record<string, unknown>>>('/admin/login-history').then(setLoginHistory).catch(console.error);
    }
    api<Array<Record<string, string>>>('/admin/roles').then(setRoles).catch(console.error);
  }, [userRole]);

  return (
    <div className="space-y-4">
      <AdminCard title="Role Permissions">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {roles.map((r) => (
            <div key={r.id} className="bg-dark-700/40 rounded-xl p-4 border border-dark-600/40">
              <p className="font-bold text-primary-500">{r.label}</p>
              <p className="text-gray-400 text-xs mt-1">{r.description}</p>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard title="Audit Logs">
        <AdminTable headers={['Action', 'User', 'Entity', 'IP', 'Date']}>
          {auditLogs.slice(0, 50).map((log) => (
            <tr key={String(log.id)} className="border-b border-dark-700">
              <td className="py-2 pr-4 text-white text-xs">{String(log.action)}</td>
              <td className="pr-4 text-gray-400 text-xs">{String(log.email || '—')}</td>
              <td className="pr-4 text-xs">{String(log.entity_type || '')}</td>
              <td className="pr-4 text-xs font-mono">{String(log.ip_address || '')}</td>
              <td className="text-gray-500 text-xs">{new Date(String(log.created_at)).toLocaleString()}</td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>

      {(userRole === 'admin' || userRole === 'super_admin') && (
        <AdminCard title="Login History">
          <AdminTable headers={['Email', 'IP', 'Success', 'Date']}>
            {loginHistory.slice(0, 50).map((log) => (
              <tr key={String(log.id)} className="border-b border-dark-700">
                <td className="py-2 pr-4">{String(log.user_email || log.email || '—')}</td>
                <td className="pr-4 font-mono text-xs">{String(log.ip_address || '')}</td>
                <td className="pr-4">{log.success ? '✓' : '✗'}</td>
                <td className="text-gray-500 text-xs">{new Date(String(log.created_at)).toLocaleString()}</td>
              </tr>
            ))}
          </AdminTable>
        </AdminCard>
      )}
    </div>
  );
}
