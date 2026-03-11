'use client';

import { useMemo, useRef, useState } from 'react';

type BulkUploadModalProps = {
  title: string;
  description: string;
  sampleFilename: string;
  sampleCsv: string;
  uploading?: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void> | void;
};

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function BulkUploadModal({
  title,
  description,
  sampleFilename,
  sampleCsv,
  uploading = false,
  onClose,
  onUpload,
}: BulkUploadModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const helperText = useMemo(() => {
    if (!selectedFile) return 'Only CSV files are allowed.';
    return `${selectedFile.name} selected`;
  }, [selectedFile]);

  const validateFile = (file: File | null) => {
    if (!file) return null;
    const isCsv =
      file.name.toLowerCase().endsWith('.csv') ||
      file.type === 'text/csv' ||
      file.type === 'application/vnd.ms-excel';
    if (!isCsv) {
      setError('Please choose a CSV file.');
      return null;
    }
    setError('');
    return file;
  };

  const handleFile = (file: File | null) => {
    const validFile = validateFile(file);
    if (!validFile) return;
    setSelectedFile(validFile);
  };

  const handleSubmit = async () => {
    if (!selectedFile || uploading) {
      if (!selectedFile) setError('Select a CSV file first.');
      return;
    }
    setError('');
    await onUpload(selectedFile);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-upload-modal-title"
    >
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="bulk-upload-modal-title" className="text-xl font-bold text-gray-900">
                {title}
              </h2>
              <p className="mt-2 text-sm text-gray-600">{description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close bulk upload modal"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-blue-900">Need a template?</h3>
                <p className="mt-1 text-sm text-blue-800">
                  Download a sample CSV and replace the example values with your own products.
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadCsv(sampleCsv, sampleFilename)}
                className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
              >
                Download sample CSV
              </button>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              handleFile(event.target.files?.[0] ?? null);
              event.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              handleFile(event.dataTransfer.files?.[0] ?? null);
            }}
            className={`flex min-h-56 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : selectedFile
                  ? 'border-green-300 bg-green-50/70'
                  : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40'
            }`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
              <svg className="h-7 w-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">Drag and drop your CSV here</h3>
            <p className="mt-2 text-sm text-gray-600">Or click this area to choose a file from your computer.</p>
            <p className="mt-4 text-sm font-medium text-gray-700">{helperText}</p>
            <span className="mt-4 inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
              CSV only
            </span>
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-xl border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}
