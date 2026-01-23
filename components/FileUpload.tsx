'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface FileUploadProps {
  onFilesUploaded: (files: File[]) => void;
  hasFiles?: boolean;
  maxSize?: number; // MB 단위
  acceptedTypes?: string[];
  placeholderImage?: string; // 플레이스홀더 이미지 경로
  label?: string; // 업로드 라벨
}

export default function FileUpload({
  onFilesUploaded,
  hasFiles = false,
  maxSize = 50,
  acceptedTypes = [
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.csv',
    '.txt',
    '.png',
    '.jpg',
    '.jpeg',
    '.dicom',
    '.dcm'
  ],
  placeholderImage,
  label = 'Lateral Cephalometric X-ray 이미지'
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // basePath for images (production: /new, development: '')
  const basePath = process.env.NODE_ENV === 'production' ? '/new' : '';

  const validateFiles = (files: FileList | null): File[] => {
    if (!files) return [];

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      // 파일 크기 체크
      if (file.size > maxSize * 1024 * 1024) {
        errors.push(`${file.name}: 파일 크기가 ${maxSize}MB를 초과합니다.`);
        return;
      }

      // 파일 타입 체크
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedTypes.some(type => fileExtension === type.toLowerCase())) {
        errors.push(`${file.name}: 지원하지 않는 파일 형식입니다.`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setErrorMessage(errors.join('\n'));
      setTimeout(() => setErrorMessage(''), 5000);
    }

    return validFiles;
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // 자식 요소로 이동하는 경우를 체크
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    const validFiles = validateFiles(files);
    if (validFiles.length > 0) {
      onFilesUploaded(validFiles);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const validFiles = validateFiles(files);
    if (validFiles.length > 0) {
      onFilesUploaded(validFiles);
    }
    // 파일 선택 초기화 (같은 파일 재선택 가능하도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-4
          transition-all duration-200 cursor-pointer
          w-full h-full flex flex-col justify-center items-center
          overflow-hidden
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        style={{
          minHeight: '196px',
          backgroundColor: isDragging ? '#eff6ff' : '#f9fafb'
        }}
      >
        {/* 배경 이미지 레이어 - 연하게 표시 */}
        {!hasFiles && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ zIndex: 0 }}>
            <img
              src={placeholderImage || `${basePath}/images/placeholders/sample_lateral.jpg`}
              alt="placeholder"
              className="max-w-full max-h-full object-contain"
              style={{ opacity: 0.45 }}
            />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-center relative z-10">
          <svg
            className={`mx-auto h-6 w-6 ${
              isDragging ? 'text-blue-500' : 'text-gray-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          <p className="mt-2 text-sm font-medium text-gray-900">
            {isDragging ? '파일을 놓아주세요' : '클릭하거나 파일을 드래그하세요'}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {label}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            지원 형식: DICOM, JPG, PNG, PDF
          </p>

          <p className="mt-0.5 text-xs text-gray-400">
            최대 {maxSize}MB
          </p>
        </div>

        {/* 업로드 버튼 (모바일 친화적) */}
        <div className="mt-2 flex justify-center relative z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            파일 선택
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {errorMessage && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 whitespace-pre-line">
            {errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}