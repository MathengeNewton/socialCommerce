'use client';

import { useMemo, useState } from 'react';

export type DataTableColumn<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  emptyMessage?: string;
  title?: string;
  onExport?: (rows: T[]) => void;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
  filters?: React.ReactNode;
  actions?: React.ReactNode;
};

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  getRowId,
  emptyMessage = 'No data',
  title,
  onExport,
  pagination,
  filters,
  actions,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [globalFilter, setGlobalFilter] = useState('');

  const sortedData = useMemo(() => {
    let result = [...data];
    if (globalFilter.trim()) {
      const q = globalFilter.toLowerCase().trim();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col.key];
          if (val == null) return false;
          const str = typeof val === 'object' && val !== null && 'toString' in val
            ? (val as { toString(): string }).toString()
            : String(val);
          return str.toLowerCase().includes(q);
        })
      );
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sortable !== false) {
        result.sort((a, b) => {
          const av = a[sortKey];
          const bv = b[sortKey];
          const aStr = av == null ? '' : typeof av === 'object' ? JSON.stringify(av) : String(av);
          const bStr = bv == null ? '' : typeof bv === 'object' ? JSON.stringify(bv) : String(bv);
          const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
          return sortDir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return result;
  }, [data, columns, sortKey, sortDir, globalFilter]);

  const handleSort = (key: string) => {
    const col = columns.find((c) => c.key === key);
    if (col?.sortable === false) return;
    setSortKey((k) => (k === key ? k : key));
    setSortDir((d) => (sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  const exportCsv = () => {
    const headers = ['#', ...columns.map((c) => c.label)];
    const rows = sortedData.map((row, i) => {
      const num = pagination
        ? (pagination.page - 1) * pagination.pageSize + i + 1
        : i + 1;
      const cells = [
        String(num),
        ...columns.map((c) => {
          const val = c.exportValue ? c.exportValue(row) : row[c.key];
          return escapeCsv(val != null ? String(val) : '');
        }),
      ];
      return cells.join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onExport?.(sortedData);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {filters}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
        {actions}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-14">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider ${
                    col.sortable !== false ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                  }`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && sortKey === col.key && (
                      <span className="text-blue-600">
                        {sortDir === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => (
                <tr key={getRowId(row)} className="hover:bg-gray-50/50">
                  <td className="py-3 px-4 text-gray-500 font-medium">
                    {pagination
                      ? (pagination.page - 1) * pagination.pageSize + idx + 1
                      : idx + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="py-3 px-4 text-gray-700">
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
