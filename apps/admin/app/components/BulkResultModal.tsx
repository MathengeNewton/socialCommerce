'use client';

export type BulkRowResult = {
  rowIndex: number;
  success: boolean;
  id?: string;
  error?: string;
};

export type BulkResultModalProps = {
  title: string;
  summary: { total: number; succeeded: number; failed: number };
  results: BulkRowResult[];
  onClose: () => void;
};

function buildErrorReportCsv(results: BulkRowResult[]): string {
  const header = 'Row,Status,Error\n';
  const rows = results
    .filter((r) => !r.success)
    .map((r) => `${r.rowIndex},failed,"${(r.error ?? '').replace(/"/g, '""')}"`)
    .join('\n');
  return header + rows;
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function BulkResultModal({ title, summary, results, onClose }: BulkResultModalProps) {
  const failed = results.filter((r) => !r.success);
  const hasFailures = failed.length > 0;

  const handleDownloadReport = () => {
    const csv = buildErrorReportCsv(results);
    downloadCsv(csv, `bulk-import-errors-${Date.now()}.csv`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="bulk-result-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h2 id="bulk-result-title" className="text-xl font-bold text-gray-900">
            {title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {summary.succeeded} succeeded, {summary.failed} failed (of {summary.total} total).
          </p>
        </div>
        {hasFailures && (
          <>
            <div className="px-6 py-3 overflow-auto flex-1 min-h-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Row</th>
                    <th className="pb-2 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {failed.map((r) => (
                    <tr key={r.rowIndex} className="border-b border-gray-50">
                      <td className="py-2 font-medium">{r.rowIndex}</td>
                      <td className="py-2 text-red-600">{r.error ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-between items-center">
              <button
                type="button"
                onClick={handleDownloadReport}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Download error report (CSV)
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </>
        )}
        {!hasFailures && (
          <div className="p-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
