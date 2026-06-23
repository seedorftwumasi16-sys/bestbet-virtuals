'use client';

import { useEffect, useState } from 'react';
import { api, formatCurrency } from '@/lib/api';
import { AdminCard, AdminTable, ActionBtn } from '../shared';

export default function PaymentsSection() {
  const [deposits, setDeposits] = useState<Array<Record<string, unknown>>>([]);
  const [withdrawals, setWithdrawals] = useState<Array<Record<string, unknown>>>([]);
  const [config, setConfig] = useState<Record<string, string>>({});

  const load = () => {
    api<Array<Record<string, unknown>>>('/admin/deposits').then(setDeposits).catch(console.error);
    api<Array<Record<string, unknown>>>('/admin/withdrawals').then(setWithdrawals).catch(console.error);
    api<Record<string, string>>('/admin/payment-config').then(setConfig).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const approveDeposit = async (id: string) => {
    await api(`/admin/deposits/${id}/approve`, { method: 'PUT' });
    load();
  };

  const rejectDeposit = async (id: string) => {
    await api(`/admin/deposits/${id}/reject`, { method: 'PUT', body: JSON.stringify({ note: 'Rejected' }) });
    load();
  };

  const approveWithdrawal = async (id: string) => {
    await api(`/admin/withdrawals/${id}/approve`, { method: 'PUT' });
    load();
  };

  const rejectWithdrawal = async (id: string) => {
    await api(`/admin/withdrawals/${id}/reject`, { method: 'PUT', body: JSON.stringify({ note: 'Rejected' }) });
    load();
  };

  const saveConfig = async () => {
    await api('/admin/payment-config', { method: 'PUT', body: JSON.stringify(config) });
    alert('Payment config saved');
  };

  return (
    <div className="space-y-4">
      <AdminCard title="Payment Configuration">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-primary-500 font-bold">MTN MoMo</p>
            <input placeholder="Number" value={config.mtn_momo || ''} onChange={(e) => setConfig({ ...config, mtn_momo: e.target.value })} className="input-field" />
            <input placeholder="Account name" value={config.mtn_momo_name || ''} onChange={(e) => setConfig({ ...config, mtn_momo_name: e.target.value })} className="input-field" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-primary-500 font-bold">Telecel Cash</p>
            <input placeholder="Number" value={config.telecel_number || ''} onChange={(e) => setConfig({ ...config, telecel_number: e.target.value })} className="input-field" />
            <input placeholder="Account name" value={config.telecel_name || ''} onChange={(e) => setConfig({ ...config, telecel_name: e.target.value })} className="input-field" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-primary-500 font-bold">AirtelTigo Money</p>
            <input placeholder="Number" value={config.airteltigo_number || ''} onChange={(e) => setConfig({ ...config, airteltigo_number: e.target.value })} className="input-field" />
            <input placeholder="Account name" value={config.airteltigo_name || ''} onChange={(e) => setConfig({ ...config, airteltigo_name: e.target.value })} className="input-field" />
          </div>
        </div>
        <button onClick={saveConfig} className="btn-primary mt-4">Save Payment Config</button>
      </AdminCard>

      <AdminCard title="Deposit Requests">
        <AdminTable headers={['User', 'Amount', 'Method', 'Status', 'Actions']}>
          {deposits.map((d) => (
            <tr key={String(d.id)} className="border-b border-dark-700">
              <td className="py-3 pr-4">{String(d.email)}</td>
              <td className="pr-4">{formatCurrency(Number(d.amount || 0))}</td>
              <td className="pr-4 capitalize text-xs">{String(d.payment_method || '').replace('_', ' ')}</td>
              <td className="pr-4 capitalize">{String(d.status)}</td>
              <td>
                {d.status === 'pending' && (
                  <>
                    <ActionBtn variant="success" onClick={() => approveDeposit(String(d.id))}>Approve</ActionBtn>
                    <ActionBtn variant="danger" onClick={() => rejectDeposit(String(d.id))}>Reject</ActionBtn>
                  </>
                )}
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>

      <AdminCard title="Withdrawal Requests">
        <AdminTable headers={['User', 'Amount', 'Phone', 'Status', 'Actions']}>
          {withdrawals.map((w) => (
            <tr key={String(w.id)} className="border-b border-dark-700">
              <td className="py-3 pr-4">{String(w.email)}</td>
              <td className="pr-4">{formatCurrency(Number(w.amount || 0))}</td>
              <td className="pr-4">{String(w.phone_number)}</td>
              <td className="pr-4 capitalize">{String(w.status)}</td>
              <td>
                {w.status === 'pending' && (
                  <>
                    <ActionBtn variant="success" onClick={() => approveWithdrawal(String(w.id))}>Approve</ActionBtn>
                    <ActionBtn variant="danger" onClick={() => rejectWithdrawal(String(w.id))}>Reject</ActionBtn>
                  </>
                )}
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>
    </div>
  );
}
