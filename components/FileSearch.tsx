import React, { useState, useEffect, useRef, useMemo } from 'react';

interface FuzzyResult {
  path: string;
  score: number;
  indices: number[];
}

// A simple but effective fuzzy matching algorithm
function fuzzyMatch(query: string, path: string): { score: number; indices: number[] } | null {
  const lowerQuery = query.toLowerCase();
  const lowerPath = path.toLowerCase();
  
  if (lowerQuery.length === 0) return { score: 1, indices: [] };
  
  const indices: number[] = [];
  let queryIndex = 0;
  let pathIndex = 0;
  let score = 0;
  let lastMatchIndex = -1;

  while (pathIndex < path.length && queryIndex < lowerQuery.length) {
    if (lowerPath[pathIndex] === lowerQuery[queryIndex]) {
      indices.push(pathIndex);
      
      score += 100; // Base score for a match
      
      if (lastMatchIndex !== -1 && pathIndex === lastMatchIndex + 1) { score += 70; } // Bonus for consecutive match
      if (lastMatchIndex !== -1 && ['/', '.', '_', '-'].includes(path[pathIndex - 1])) { score += 80; } // Bonus for match after a separator
      if (path[pathIndex] === path[pathIndex].toUpperCase() && pathIndex > 0 && path[pathIndex - 1] !== '/') { score += 80; } // Bonus for match on uppercase letter (camelCase)
      
      lastMatchIndex = pathIndex;
      queryIndex++;
    }
    pathIndex++;
  }
  
  if (queryIndex !== lowerQuery.length) return null;
  
  score -= path.length; // Penalize for path length
  
  const fileNameIndex = path.lastIndexOf('/');
  if (indices[0] > fileNameIndex) { score += 50; } // Bonus if match is in filename

  return { score, indices };
}

function performFuzzySearch(query: string, paths: string[], maxResults: number = 20): FuzzyResult[] {
  if (!query) return [];
  return paths.map(path => ({ path, match: fuzzyMatch(query, path) }))
    .filter((item): item is { path: string; match: { score: number; indices: number[] } } => item.match !== null)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, maxResults)
    .map(item => ({ path: item.path, score: item.match.score, indices: item.match.indices }));
}

const renderHighlightedPath = (path: string, indices: number[]) => {
    const indicesSet = new Set(indices);
    const fileNameIndex = path.lastIndexOf('/') + 1;
    const directory = path.substring(0, fileNameIndex);
    const fileName = path.substring(fileNameIndex);

    const highlight = (text: string, offset: number) => (
        <>
            {text.split('').map((char, i) =>
                indicesSet.has(i + offset) ? (
                    <strong key={i} className="text-blue-400">{char}</strong>
                ) : (
                    char
                )
            )}
        </>
    );

    return (
        <>
          <span className="text-gray-400">{highlight(directory, 0)}</span>
          <span className="text-gray-200">{highlight(fileName, fileNameIndex)}</span>
        </>
    );
};

interface FileSearchProps {
  isOpen: boolean;
  onClose: () => void;
  allFilePaths: string[];
  onFileSelect: (path: string) => void;
}

const FileSearch: React.FC<FileSearchProps> = ({ isOpen, onClose, allFilePaths, onFileSelect }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => performFuzzySearch(query, allFilePaths), [query, allFilePaths]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setQuery('');
    }
  }, [isOpen]);
  
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;
        
        if (e.key === 'Escape') { onClose(); } 
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                onFileSelect(results[selectedIndex].path);
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onFileSelect, results, selectedIndex]);

  useEffect(() => {
    listRef.current?.children[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center z-40" onClick={onClose} role="dialog" aria-modal="true">
        <div 
            onClick={(e) => e.stopPropagation()}
            className="z-50 w-full max-w-2xl bg-gray-800 border border-gray-600 rounded-lg shadow-2xl text-gray-300 flex flex-col mt-20 max-h-[60vh]"
        >
            <div className="p-3 border-b border-gray-700">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for files by name..."
                    className="w-full bg-gray-700 text-gray-200 placeholder-gray-400 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <ul ref={listRef} className="overflow-y-auto p-2">
                {results.length > 0 ? results.map((result, index) => (
                    <li 
                      key={result.path}
                      onClick={() => onFileSelect(result.path)}
                      className={`px-3 py-2 rounded-md cursor-pointer truncate ${index === selectedIndex ? 'bg-blue-600/30' : 'hover:bg-gray-700/50'}`}
                      aria-selected={index === selectedIndex}
                    >
                        {renderHighlightedPath(result.path, result.indices)}
                    </li>
                )) : (
                    <li className="px-3 py-4 text-center text-gray-500">
                        {query ? 'No files found' : 'Start typing to search'}
                    </li>
                )}
            </ul>
        </div>
    </div>
  );
};

export default FileSearch;