'use client';

import { useCallback, useRef, useState } from 'react';

interface ContractUploadProps {
  value: string;
  onChange: (value: string) => void;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

const ACCEPTED = '.txt,.md,.docx,.pdf';
const TEXT_EXTENSIONS = ['.txt', '.md'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function ContractUpload({
  value,
  onChange,
  onFileSelect,
  selectedFile,
}: ContractUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setUploadError(null);
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!['.txt', '.md', '.docx', '.pdf'].includes(ext)) {
        setUploadError(`Unsupported file extension: ${ext}. Please select a .txt, .md, .docx, or .pdf file.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`File exceeds maximum allowed size of 5 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
        return;
      }
      if (file.size === 0) {
        setUploadError('The selected file is empty.');
        return;
      }

      if (TEXT_EXTENSIONS.includes(ext)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          onChange(text);
        };
        reader.readAsText(file);
      }
      onFileSelect(file);
    },
    [onChange, onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Contract Text
      </label>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your contract or provision here..."
          rows={12}
          className="block w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700"
        />
        <span className="absolute right-3 bottom-3 text-xs text-zinc-400">
          {value.length.toLocaleString()} characters
        </span>
      </div>

      {/* File upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          isDragging
            ? 'border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-800'
            : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
        }`}
      >
        <svg
          className="h-8 w-8 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-900 dark:text-zinc-200">
            Drop a file here
          </span>{' '}
          or click to browse
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Supports .txt, .md, .docx, .pdf
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {uploadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {uploadError}
        </div>
      )}

      {selectedFile && (
        <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">
          <svg
            className="h-4 w-4 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <span className="text-zinc-700 dark:text-zinc-300">
            {selectedFile.name}
          </span>
          <span className="text-zinc-400">
            ({(selectedFile.size / 1024).toFixed(1)} KB)
          </span>
        </div>
      )}
    </div>
  );
}
