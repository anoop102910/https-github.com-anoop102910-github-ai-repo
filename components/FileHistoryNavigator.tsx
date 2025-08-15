import React from 'react';

interface FileHistoryNavigatorProps {
  isOpen: boolean;
  files: string[]; // Should be pre-sorted (most recent first)
  selectedIndex: number;
}

const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const FileHistoryNavigator: React.FC<FileHistoryNavigatorProps> = ({ isOpen, files, selectedIndex }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-2xl w-full max-w-xl">
        <div className="p-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300">Recently Opened Files</h3>
        </div>
        <ul className="py-1">
          {files.map((path, index) => {
            const isSelected = index === selectedIndex;
            const fileName = path.substring(path.lastIndexOf('/') + 1);
            const directory = path.substring(0, path.lastIndexOf('/'));

            return (
              <li
                key={path}
                className={`flex items-center px-4 py-2 mx-1 rounded-md ${isSelected ? 'bg-blue-600/40' : ''}`}
                aria-selected={isSelected}
              >
                <FileIcon />
                <span className="text-gray-200 font-medium">{fileName}</span>
                <span className="text-gray-500 ml-auto pl-4 text-right truncate">{directory}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default FileHistoryNavigator;
