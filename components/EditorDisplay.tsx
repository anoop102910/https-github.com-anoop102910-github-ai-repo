import React, { useEffect, useRef, useMemo, forwardRef } from 'react';

// Make hljs available in the window scope
declare const hljs: any;

const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-full">
        <div className="w-16 h-16 border-4 border-t-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
);

const getLanguageFromPath = (path: string | null): string => {
    if (!path) return '';
    const extension = path.split('.').pop()?.toLowerCase();
    if (!extension) return 'plaintext';
    
    // Alias common extensions
    const langMap: { [key: string]: string } = {
        js: 'javascript',
        jsx: 'javascript',
        ts: 'typescript',
        tsx: 'typescript',
        py: 'python',
        rb: 'ruby',
        java: 'java',
        cs: 'csharp',
        cpp: 'cpp',
        c: 'c',
        go: 'go',
        php: 'php',
        html: 'html',
        css: 'css',
        scss: 'scss',
        json: 'json',
        md: 'markdown',
        yml: 'yaml',
        yaml: 'yaml',
        sh: 'bash',
        sql: 'sql',
    };
    return langMap[extension] || extension;
};

interface EditorDisplayProps {
  filePath: string | null;
  content: string | null;
  isLoading: boolean;
  error: string | null;
  onTextSelect: (selectedText: string, event: React.MouseEvent) => void;
  onSummarize: () => void;
  isSummarizing: boolean;
  onGoToDefinition: (token: string) => void;
}

const EditorDisplay = forwardRef<HTMLDivElement, EditorDisplayProps>(({ filePath, content, isLoading, error, onTextSelect, onSummarize, isSummarizing, onGoToDefinition }, ref) => {
  const codeRef = useRef<HTMLElement>(null);

  const highlightedCode = useMemo(() => {
    if (!content) return '';
    const language = getLanguageFromPath(filePath);
    try {
      if (typeof hljs !== 'undefined' && hljs.getLanguage(language)) {
        return hljs.highlight(content, { language }).value;
      }
    } catch (e) {
      console.error("Highlight.js error:", e);
    }
    // Fallback for no content or unsupported language
    return content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }, [content, filePath]);

  const lineCount = useMemo(() => content?.split('\n').length || 0, [content]);

  const handleMouseUp = (event: React.MouseEvent) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? '';
    
    if (selectedText.length > 0 && selectedText.length < 100) {
        onTextSelect(selectedText, event);
    }
  };

  const handleCodeClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!onGoToDefinition || (!event.ctrlKey && !event.metaKey)) {
        return;
    }
    event.preventDefault();
    
    // The `document.caretRangeFromPoint` method is non-standard and not available in all browsers (e.g., Firefox).
    // We add a check to prevent errors.
    if (typeof document.caretRangeFromPoint !== 'function') {
        return;
    }

    const range = document.caretRangeFromPoint(event.clientX, event.clientY);
    if (!range) return;

    // The old `range.expand('word')` is non-standard and was causing an error.
    // This is a standards-compliant way to get the word at a point.
    const { startContainer, startOffset } = range;
    if (startContainer.nodeType !== Node.TEXT_NODE || !startContainer.textContent) {
        return;
    }
    
    const textContent = startContainer.textContent;
    let start = startOffset;
    let end = startOffset;

    // Expand backwards to find the start of the word. A "word" character is a letter, number, or underscore.
    while (start > 0 && /\w/.test(textContent[start - 1])) {
        start--;
    }

    // Expand forwards to find the end of the word.
    while (end < textContent.length && /\w/.test(textContent[end])) {
        end++;
    }

    const token = textContent.substring(start, end).trim();

    if (token) {
        onGoToDefinition(token);
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (error) {
        return <div className="text-red-400 p-8">Error: {error}</div>;
    }

    if (!filePath || content === null) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
          <h2 className="text-2xl font-semibold">Welcome to GitHub Repository Explorer</h2>
          <p className="mt-2">Enter a GitHub repository URL above to get started.</p>
          <p>Select a file from the tree on the left to view its content.</p>
        </div>
      );
    }
    
    const isBinary = content.includes('\uFFFD');
    if(isBinary) {
        return <div className="flex items-center justify-center h-full text-gray-500">Cannot display binary file content.</div>;
    }

    return (
      <div className="flex text-base p-4">
        <div className="line-numbers text-right text-gray-500 select-none mr-4 font-mono">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre
            onMouseUp={handleMouseUp}
            onClick={handleCodeClick}
            className="whitespace-pre-wrap break-words select-text w-full code-interactive"
          >
            <code ref={codeRef} className="font-mono" dangerouslySetInnerHTML={{ __html: highlightedCode }}/>
          </pre>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-2 flex justify-between items-center">
        <h2 className="text-gray-400 truncate" title={filePath || undefined}>{filePath || 'No file selected'}</h2>
        {filePath && content && !isLoading && (
          <button
            onClick={onSummarize}
            disabled={isSummarizing}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded px-2 py-1 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center transition-colors"
          >
            {isSummarizing ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5"></div>
                Summarizing...
              </>
            ) : "Summarize File"}
          </button>
        )}
      </div>
      <div className="flex-grow overflow-auto" ref={ref}>
        {renderContent()}
      </div>
    </div>
  );
});

export default EditorDisplay;