'use client';

import { useEffect, useState } from 'react';
import { api, formatCurrency } from '@/lib/api';
import { AdminCard, AdminTable, ActionBtn, Field } from '../shared';

interface User {
  id: string;
  email: string;
  balance: number;
  role: string;
  is_suspended: boolean;
  is_banned?: boolean;
  created_at: string;
}

export default function UsersSection({ userRole }: { userRole: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Array<Record<string, unknown>>>([]);
  const [creditForm, setCreditForm] = useState({ userId: '', amount: 0 });
  const [debitForm, setDebitForm] = useState({ userId: '', amount: 0 });
  const [resetForm, setResetForm] = useState({ userId: '', password: 'reset123' });
  const [roleForm, setRoleForm] = useState({ userId: '', role: 'user' });

  const load = () => api<User[]>('/admin/users').then(setUsers).catch(console.error);

  useEffect(() => { load(); }, []);

  const loadTransactions = async (id: string) => {
    setSelectedId(id);
    const data = await api<Array<Record<string, unknown>>>(`/admin/users/${id}/transactions`);
    setTransactions(data);
  };

  const credit = async () => {
    await api(`/admin/users/${creditForm.userId}/credit`, { method: 'POST', body: JSON.stringify({ amount: creditForm.amount }) });
    load();
  };

  const debit = async () => {
    await api(`/admin/users/${debitForm.userId}/debit`, { method: 'POST', body: JSON.stringify({ amount: debitForm.amount }) });
    load();
  };

  const suspend = async (id: string, suspend: boolean) => {
    await api(`/admin/users/${id}/suspend`, { method: 'PUT', body: JSON.stringify({ suspend }) });
    load();
  };

  const ban = async (id: string, ban: boolean) => {
    await api(`/admin/users/${id}/ban`, { method: 'PUT', body: JSON.stringify({ ban }) });
    load();
  };

  const resetPassword = async () => {
    await api(`/admin/users/${resetForm.userId}/reset-password`, { method: 'POST', body: JSON.stringify({ password: resetForm.password }) });
    alert('Password reset');
  };

  const changeRole = async () => {
    await api(`/admin/users/${roleForm.userId}/role`, { method: 'PUT', body: JSON.stringify({ role: roleForm.role }) });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AdminCard title="Credit Balance">
          <div className="space-y-2">
            <input placeholder="User ID" value={creditForm.userId} onChange={(e) => setCreditForm({ ...creditForm, userId: e.target.value })} className="input-field" />
            <input type="number" placeholder="Amount" value={creditForm.amount} onChange={(e) => setCreditForm({ ...creditForm, amount: parseFloat(e.target.value) })} className="input-field" />
            <button onClick={credit} className="btn-primary w-full">Credit</button>
          </div>
        </AdminCard>
        <AdminCard title="Debit Balance">
          <div className="space-y-2">
            <input placeholder="User ID" value={debitForm.userId} onChange={(e) => setDebitForm({ ...debitForm, userId: e.target.value })} className="input-field" />
            <input type="number" placeholder="Amount" value={debitForm.amount} onChange={(e) => setDebitForm({ ...debitForm, amount: parseFloat(e.target.value) })} className="input-field" />
            <button onClick={debit} className="btn-secondary w-full">Debit</button>
          </div>
        </AdminCard>
        <AdminCard title="Reset Password">
          <div className="space-y-2">
            <input placeholder="User ID" value={resetForm.userId} onChange={(e) => setResetForm({ ...resetForm, userId: e.target.value })} className="input-field" />
            <input placeholder="New password" value={resetForm.password} onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })} className="input-field" />
            <button onClick={resetPassword} className="btn-secondary w-full">Reset</button>
          </div>
        </AdminCard>
      </div>

      {userRole === 'super_admin' && (
        <AdminCard title="Assign Role (Super Admin)">
          <div className="flex gap-3 flex-wrap">
            <input placeholder="User ID" value={roleForm.userId} onChange={(e) => setRoleForm({ ...roleForm, userId: e.target.value })} className="input-field flex-1" />
            <select value={roleForm.role} onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })} className="input-field w-40">
              <option value="user">User</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <button onClick={changeRole} className="btn-primary">Update Role</button>
          </div>
        </AdminCard>
      )}

      <AdminCard title="All Users">
        <AdminTable headers={['Email', 'Balance', 'Role', 'Status', 'Actions']}>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-dark-700">
              <td className="py-3 pr-4">
                <button onClick={() => loadTransactions(u.id)} className="text-white hover:text-primary-500 text-left">
                  {u.email}
                </button>
              </td>
              <td className="pr-4">{formatCurrency(u.balance)}</td>
              <td className="pr-4 capitalize text-xs">{u.role}</td>
              <td className="pr-4 text-xs">
                {u.is_banned ? 'Banned' : u.is_suspended ? 'Suspended' : 'Active'}
              </td>
              <td>
                <ActionBtn onClick={() => suspend(u.id, !u.is_suspended)}>{u.is_suspended ? 'Unsuspend' : 'Suspend'}</ActionBtn>
                <ActionBtn variant="danger" onClick={() => ban(u.id, !u.is_banned)}>{u.is_banned ? 'Unban' : 'Ban'}</ActionBtn>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>

      {selectedId && (
        <AdminCard title="Transaction History">
          <AdminTable headers={['Type', 'Amount', 'Status', 'Date']}>
            {transactions.map((t) => (
              <tr key={String(t.id)} className="border-b border-dark-700">
                <td className="py-2 pr-4 capitalize">{String(t.type)}</td>
                <td className="pr-4">{formatCurrency(Number(t.amount || 0))}</td>
                <td className="pr-4 capitalize">{String(t.status)}</td>
                <td className="text-gray-400 text-xs">{new Date(String(t.created_at)).toLocaleString()}</td>
              </tr>
            ))}
          </AdminTable>
        </AdminCard>
      )}
    </div>
  );
}
