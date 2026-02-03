'use client';

import { useEffect, useMemo, useState } from 'react';

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
  pagination?:
    | { pageSize: number }
    | {
        pageSize: number;
        page: number;
        totalPages: number;
        total: number;
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
  const [page, setPage] = useState(1);

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

  const isExternalPagination =
    pagination &&
    'totalPages' in pagination &&
    'onPageChange' in pagination &&
    typeof pagination.onPageChange === 'function';
  const pageSize = pagination?.pageSize ?? sortedData.length;
  const totalPages = isExternalPagination
    ? (pagination as { totalPages: number }).totalPages
    : Math.max(1, Math.ceil(sortedData.length / pageSize));
  const currentPage = isExternalPagination
    ? (pagination as { page: number }).page
    : Math.min(page, totalPages);
  const displayData = useMemo(() => {
    if (!pagination) return sortedData;
    if (isExternalPagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, pagination, isExternalPagination, currentPage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [globalFilter, sortKey, sortDir, data.length]);

  const handleSort = (key: string) => {
    const col = columns.find((c) => c.key === key);
    if (col?.sortable === false) return;
    setSortKey((k) => (k === key ? k : key));
    setSortDir((d) => (sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  const exportCsv = () => {
    const headers = ['#', ...columns.map((c) => c.label)];
    const rows = sortedData.map((row, i) => {
      const num = i + 1;
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
        <div className="flex flex-wrap items-center gap-2">
          {filters}
          <div className="relative">
            <input
              type="text"
              placeholder="Search…"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-md text-sm w-40 text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
            <svg
              className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={exportCsv}
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
        {actions && <div className="flex items-center">{actions}</div>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200">
            <tr>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left py-2.5 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider ${
                    col.sortable !== false ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                  }`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && sortKey === col.key && (
                      <span className="text-blue-600 text-[10px]">
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
              displayData.map((row, idx) => (
                <tr key={getRowId(row)} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-3 text-slate-500 text-xs font-medium">
                    {pagination
                      ? (currentPage - 1) * pageSize + idx + 1
                      : idx + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="py-2.5 px-3 text-slate-700 text-sm">
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            {isExternalPagination
              ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, (pagination as { total: number }).total)} of ${(pagination as { total: number }).total}`
              : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, sortedData.length)} of ${sortedData.length}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                isExternalPagination
                  ? (pagination as { onPageChange: (p: number) => void }).onPageChange(currentPage - 1)
                  : setPage((p) => Math.max(1, p - 1))
              }
              disabled={currentPage <= 1}
              className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="px-2 text-xs text-slate-600 font-medium min-w-[4rem] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                isExternalPagination
                  ? (pagination as { onPageChange: (p: number) => void }).onPageChange(currentPage + 1)
                  : setPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
