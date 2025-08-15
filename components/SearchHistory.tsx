import React from 'react';

interface SearchHistoryProps {
  history: string[];
  onSelect: (url: string) => void;
  onClear: () => void;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({ history, onSelect, onClear }) => {
  return (
    <div className="absolute top-full mt-1.5 w-full bg-gray-800 border border-gray-600 rounded-md shadow-lg z-30 overflow-hidden">
      <ul className="max-h-60 overflow-y-auto">
        {history.map((url) => (
          <li key={url}>
            <button
              onClick={() => onSelect(url)}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 truncate"
              title={url}
            >
              {url}
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-gray-600">
        <button
          onClick={onClear}
          className="w-full text-center px-3 py-2 text-sm text-red-400 hover:bg-red-900/20"
        >
          Clear History
        </button>
      </div>
    </div>
  );
};

export default SearchHistory;