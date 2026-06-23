'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

export function AdminCard({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('card border-dark-600/50', className)}>
      {title && <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider text-primary-500">{title}</h3>}
      {children}
    </div>
  );
}

export function AdminTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-dark-600 text-left">
            {headers.map((h) => (
              <th key={h} className="py-2 pr-4 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function ActionBtn({
  onClick,
  children,
  variant = 'default',
}: {
  onClick: () => void;
  children: ReactNode;
  variant?: 'default' | 'danger' | 'success';
}) {
  const colors = {
    default: 'text-primary-500 hover:text-primary-400',
    danger: 'text-red-400 hover:text-red-300',
    success: 'text-accent-500 hover:text-accent-400',
  };
  return (
    <button onClick={onClick} className={clsx('text-xs font-semibold mr-2 min-h-[44px] min-w-[44px] px-2 py-2 touch-manipulation', colors[variant])}>
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-400 font-medium">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
