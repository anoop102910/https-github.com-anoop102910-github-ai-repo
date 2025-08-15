import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import FileTree from './components/FileTree';
import EditorDisplay from './components/EditorDisplay';
import ExplanationPopup from './components/ExplanationPopup';
import SummaryPopup from './components/SummaryPopup';
import SearchHistory from './components/SearchHistory';
import FileSearch from './components/FileSearch';
import FileHistoryNavigator from './components/FileHistoryNavigator';
import ChatPanel from './components/ChatPanel';
import { parseGitHubUrl, fetchRepoTree, fetchFileContent } from './services/githubService';
import { getCodeExplanation, getFileSummary } from './services/geminiService';
import { 
    getSearchHistory, addSearchHistoryItem, clearSearchHistory, 
    getExplanationContext as getStoredContext, setExplanationContext as setStoredContext, 
    getGeminiApiKey, saveGeminiApiKeyToStorage, clearGeminiApiKey,
    getChatDisplayMode, setChatDisplayMode as saveChatDisplayMode
} from './services/localStorageService';
import { resolveImportPath } from './services/pathService';
import { TreeNode, RepoInfo, Explanation, ExplanationContextType, GithubFile, ChatDisplayMode } from './types';

const GithubIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
    </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

interface PopupState<T> { isVisible: boolean; isLoading: boolean; error: string | null; data: T | null; }
interface ExplanationPopupState extends PopupState<Explanation> { x: number; y: number; }
interface SummaryPopupState extends PopupState<string> {}

const flattenTree = (nodes: TreeNode[]): string[] => {
    const paths: string[] = [];
    const traverse = (node: TreeNode) => {
        if (node.type === 'blob') {
            paths.push(node.path);
        }
        if (node.children) {
            node.children.forEach(traverse);
        }
    };
    nodes.forEach(traverse);
    return paths;
};

export default function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [allFilePaths, setAllFilePaths] = useState<string[]>([]);

  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  
  const [isTreeLoading, setIsTreeLoading] = useState(false);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatDisplayMode, setChatDisplayMode] = useState<ChatDisplayMode>(getChatDisplayMode() || 'drawer');

  const [treeError, setTreeError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

  const [explanationContext, setExplanationContext] = useState<ExplanationContextType>(getStoredContext() || 'full');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(getGeminiApiKey());
  const [apiKeyInput, setApiKeyInput] = useState('');

  const [explanationPopup, setExplanationPopup] = useState<ExplanationPopupState>({ isVisible: false, x: 0, y: 0, data: null, isLoading: false, error: null });
  const [summaryPopup, setSummaryPopup] = useState<SummaryPopupState>({ isVisible: false, data: null, isLoading: false, error: null });
  
  const [searchHistory, setSearchHistory] = useState<string[]>(getSearchHistory());
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const searchFormRef = useRef<HTMLFormElement>(null);

  // --- Go to Definition State ---
  const [isCtrlDown, setIsCtrlDown] = useState(false);
  const [scrollToLine, setScrollToLine] = useState<number | null>(null);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  // --- Visited Files Navigator State ---
  const [visitedFileStack, setVisitedFileStack] = useState<string[]>([]);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [navigatorIndex, setNavigatorIndex] = useState(0);

  const closePopups = useCallback(() => {
    setExplanationPopup(p => ({ ...p, isVisible: false }));
    setSummaryPopup(p => ({ ...p, isVisible: false }));
  }, []);

  const handleFileSelect = useCallback(async (path: string) => {
    if (!repoInfo || path === selectedFilePath) return;

    closePopups();
    setSelectedFilePath(path);
    setIsContentLoading(true);
    setContentError(null);

    setVisitedFileStack(prevStack => {
        const newStack = prevStack.filter(p => p !== path);
        newStack.push(path);
        // Cap the stack size to a reasonable number
        if (newStack.length > 15) {
            newStack.shift();
        }
        return newStack;
    });

    try {
      const content = await fetchFileContent(repoInfo.owner, repoInfo.repo, path);
      setSelectedFileContent(content);
    } catch (err) {
        setContentError(err instanceof Error ? err.message : 'An unknown error occurred while fetching the file.');
        setSelectedFileContent(null);
    } finally {
      setIsContentLoading(false);
    }
  }, [repoInfo, selectedFilePath, closePopups]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => (e.key === 'Control' || e.key === 'Meta') && setIsCtrlDown(true);
    const handleKeyUp = (e: KeyboardEvent) => (e.key === 'Control' || e.key === 'Meta') && setIsCtrlDown(false);
    
    document.body.classList.toggle('ctrl-down', isCtrlDown);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', () => setIsCtrlDown(false)); // Reset if window loses focus
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', () => setIsCtrlDown(false));
      document.body.classList.remove('ctrl-down');
    };
  }, [isCtrlDown]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) setIsSettingsOpen(false);
      if (searchFormRef.current && !searchFormRef.current.contains(event.target as Node)) setIsHistoryVisible(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setStoredContext(explanationContext);
  }, [explanationContext]);
  
  useEffect(() => {
    saveChatDisplayMode(chatDisplayMode);
  }, [chatDisplayMode]);

  useEffect(() => {
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);

    if (scrollToLine && editorContainerRef.current) {
      const editorDiv = editorContainerRef.current;
      const codeEl = editorDiv.querySelector('code');
      if (!codeEl) return;
      
      const computedStyle = window.getComputedStyle(codeEl);
      const lineHeight = parseFloat(computedStyle.lineHeight);
      const paddingTop = parseFloat(computedStyle.paddingTop) || 16; // 1rem fallback
      
      const top = paddingTop + (scrollToLine - 1) * lineHeight;
      
      // Scroll to the line
      editorDiv.scrollTop = top - (editorDiv.clientHeight / 4);
      
      // Set highlight style
      setHighlightStyle({ top: `${top}px`, height: `${lineHeight}px`, left: 0, right: 0, position: 'absolute' });

      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightStyle(null);
      }, 1200);
      
      setScrollToLine(null); // Reset after scroll
    }
  }, [scrollToLine]);
  
  // File Search (Ctrl+P) and Chat (Ctrl+K) shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'p') {
                e.preventDefault();
                if (allFilePaths.length > 0) {
                    setIsFileSearchOpen(true);
                }
            } else if (e.key === 'k') {
                e.preventDefault();
                if (geminiApiKey) {
                    setIsChatOpen(prev => !prev);
                }
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [allFilePaths.length, geminiApiKey]);

  // Ctrl+Tab file navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Only trigger on Ctrl+Tab or Ctrl+Shift+Tab
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'tab') {
            e.preventDefault();
            
            if (visitedFileStack.length < 2) return;

            if (!isNavigatorOpen) {
                setIsNavigatorOpen(true);
                // On first press, select the previously opened file (index 1 in reversed list)
                setNavigatorIndex(1); 
            } else {
                // If navigator is already open, cycle through the list
                setNavigatorIndex(prev => {
                    const direction = e.shiftKey ? -1 : 1;
                    const maxIndex = Math.min(visitedFileStack.length - 1, 9); // Show max 10 files
                    let nextIndex = prev + direction;
                    
                    if (nextIndex > maxIndex) nextIndex = 0;
                    if (nextIndex < 0) nextIndex = maxIndex;
                    
                    return nextIndex;
                });
            }
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        // When the Ctrl/Meta key is released, close the navigator and select the file
        if ((e.key === 'Control' || e.key === 'Meta') && isNavigatorOpen) {
            setIsNavigatorOpen(false);
            
            const reversedStack = [...visitedFileStack].reverse();
            const navigatorList = reversedStack.slice(0, 10);
            const selectedPath = navigatorList[navigatorIndex];
            
            if (selectedPath && selectedPath !== selectedFilePath) {
                handleFileSelect(selectedPath);
            }
        }
    };
    
    // If the window loses focus, close the navigator
    const handleBlur = () => {
        if (isNavigatorOpen) {
            setIsNavigatorOpen(false);
        }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('blur', handleBlur);
    };
  }, [isNavigatorOpen, visitedFileStack, navigatorIndex, selectedFilePath, handleFileSelect]);
  
  const loadRepo = async (url: string) => {
    const info = parseGitHubUrl(url);
    if (!info) {
      setTreeError('Invalid GitHub repository URL.');
      return;
    }

    closePopups();
    setIsTreeLoading(true);
    setTreeError(null);
    setFileTree([]);
    setAllFilePaths([]);
    setSelectedFilePath(null);
    setSelectedFileContent(null);
    setVisitedFileStack([]); // Reset history for new repo
    setRepoInfo(info);
    addSearchHistoryItem(url);
    setSearchHistory(getSearchHistory());

    try {
      const tree = await fetchRepoTree(info.owner, info.repo);
      setFileTree(tree);
      setAllFilePaths(flattenTree(tree));
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsTreeLoading(false);
      setIsHistoryVisible(false);
    }
  }

  const handleFetchRepo = (e: React.FormEvent) => {
    e.preventDefault();
    loadRepo(repoUrl);
  };
  
  const handleSelectFromHistory = (url: string) => {
    setRepoUrl(url);
    loadRepo(url);
  };
  
  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
    setIsHistoryVisible(false);
  }

  const handleTextSelection = useCallback(async (selectedText: string, event: React.MouseEvent) => {
    if (!selectedFileContent || isCtrlDown || !geminiApiKey) return;

    closePopups();
    setExplanationPopup({ isVisible: true, x: event.clientX, y: event.clientY, isLoading: true, data: null, error: null });

    let codeContext = selectedFileContent;
    if (explanationContext === 'partial') {
        const lines = selectedFileContent.split('\n');
        const lineIndex = lines.findIndex(line => line.includes(selectedText));
        if (lineIndex !== -1) {
            const start = Math.max(0, lineIndex - 3);
            const end = Math.min(lines.length, lineIndex + 4);
            codeContext = `... (code snippet) ...\n${lines.slice(start, end).join('\n')}\n... (code snippet) ...`;
        }
    }

    try {
        const explanation = await getCodeExplanation(selectedText, codeContext);
        setExplanationPopup(prev => ({ ...prev, isLoading: false, data: explanation }));
    } catch (err) {
        setExplanationPopup(prev => ({ ...prev, isLoading: false, error: err instanceof Error ? err.message : 'An unknown error occurred.' }));
    }
  }, [selectedFileContent, explanationContext, isCtrlDown, geminiApiKey, closePopups]);

  const handleSummarizeFile = useCallback(async () => {
    if (!selectedFileContent || !selectedFilePath || !geminiApiKey) return;

    closePopups();
    setSummaryPopup({ isVisible: true, isLoading: true, data: null, error: null });

    try {
        const summary = await getFileSummary(selectedFilePath, selectedFileContent);
        setSummaryPopup({ isVisible: true, isLoading: false, data: summary, error: null });
    } catch (err) {
        setSummaryPopup({ isVisible: true, isLoading: false, data: null, error: err instanceof Error ? err.message : 'An unknown error occurred.' });
    }
  }, [selectedFileContent, selectedFilePath, geminiApiKey, closePopups]);

  const handleGoToDefinition = useCallback((token: string) => {
    if (!selectedFileContent || !selectedFilePath || !allFilePaths.length) return;

    // 1. Check for import statements containing the token
    const importRegex = /import[\s\S]*?from\s*['"](.+?)['"]/g;
    for (const match of selectedFileContent.matchAll(importRegex)) {
      const importStatement = match[0];
      const importPath = match[1];

      if (importStatement.includes(token)) {
        const targetPath = resolveImportPath(importPath, selectedFilePath, allFilePaths);
        if (targetPath) {
          handleFileSelect(targetPath);
          setScrollToLine(1);
          return;
        }
      }
    }
    
    // 2. If not an import, look for a declaration in the current file
    const lines = selectedFileContent.split('\n');
    const declarationRegex = new RegExp(`^(?:export\\s+)?(?:async\\s+)?(?:function|const|let|var|class|type|interface|enum)\\s+${token}\\b`);
    for (let i = 0; i < lines.length; i++) {
        if (declarationRegex.test(lines[i])) {
            setScrollToLine(i + 1);
            return;
        }
    }

  }, [selectedFileContent, selectedFilePath, allFilePaths, handleFileSelect]);
  
  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
        saveGeminiApiKeyToStorage(apiKeyInput.trim());
        setGeminiApiKey(apiKeyInput.trim());
        setApiKeyInput('');
    }
  };

  const handleClearApiKey = () => {
    clearGeminiApiKey();
    setGeminiApiKey(null);
  };
  
  const navigatorFiles = useMemo(() => {
    const reversed = [...visitedFileStack].reverse();
    return reversed.slice(0, 10); // Show max 10 files
  }, [visitedFileStack]);

  return (
    <div className="flex flex-col h-screen bg-gray-800 text-gray-300">
      <header className="flex-shrink-0 bg-gray-900 border-b border-gray-700 p-2 shadow-md z-30 flex items-center justify-between">
        <form onSubmit={handleFetchRepo} className="relative flex items-center flex-grow max-w-2xl mx-auto" ref={searchFormRef}>
          <GithubIcon />
          <input
            type="text"
            value={repoUrl}
            onFocus={() => setIsHistoryVisible(true)}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="e.g., https://github.com/facebook/react"
            className="flex-grow bg-gray-700 text-gray-200 placeholder-gray-400 border border-gray-600 rounded-l-md px-3 py-1.5 ml-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isTreeLoading}
            autoComplete="off"
          />
           {isHistoryVisible && searchHistory.length > 0 && (
            <SearchHistory 
              history={searchHistory}
              onSelect={handleSelectFromHistory}
              onClear={handleClearHistory}
            />
          )}
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-r-md px-4 py-1.5 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center" disabled={isTreeLoading}>
            {isTreeLoading ? ( <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>Loading...</> ) : "Load"}
          </button>
        </form>
        <div className="flex items-center ml-4">
          <button 
            onClick={() => setIsChatOpen(true)} 
            aria-label="Open Chat (Ctrl+K)" 
            disabled={!geminiApiKey} 
            title={!geminiApiKey ? "Add API key to enable chat" : "Open AI Chat (Ctrl+K)"}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChatIcon />
          </button>
          <div className="relative ml-4" ref={settingsRef}>
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} aria-label="Settings"><SettingsIcon /></button>
            {isSettingsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 py-2">
                <div className="px-3 py-1 text-sm font-semibold text-gray-400">Explanation Context</div>
                <label className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer">
                  <input type="radio" name="context" value="full" checked={explanationContext === 'full'} onChange={() => setExplanationContext('full')} className="mr-2 h-4 w-4 bg-gray-700 border-gray-500 text-blue-500 focus:ring-blue-500"/>
                  Full File (More Accurate)
                </label>
                <label className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer">
                  <input type="radio" name="context" value="partial" checked={explanationContext === 'partial'} onChange={() => setExplanationContext('partial')} className="mr-2 h-4 w-4 bg-gray-700 border-gray-500 text-blue-500 focus:ring-blue-500"/>
                  Partial Snippet (Faster)
                </label>
                <div className="border-t border-gray-700 my-2"></div>
                <div className="px-3 py-1 text-sm font-semibold text-gray-400">Chat Display Mode</div>
                <div className='px-3 py-1 text-sm flex justify-around'>
                    <label className='flex items-center cursor-pointer'><input type="radio" name="chatMode" value="drawer" checked={chatDisplayMode === 'drawer'} onChange={() => setChatDisplayMode('drawer')} className="mr-1"/> Drawer</label>
                    <label className='flex items-center cursor-pointer'><input type="radio" name="chatMode" value="docked" checked={chatDisplayMode === 'docked'} onChange={() => setChatDisplayMode('docked')} className="mr-1"/> Docked</label>
                    <label className='flex items-center cursor-pointer'><input type="radio" name="chatMode" value="modal" checked={chatDisplayMode === 'modal'} onChange={() => setChatDisplayMode('modal')} className="mr-1"/> Modal</label>
                </div>
                <div className="border-t border-gray-700 my-2"></div>
                <div className="px-3 py-1 text-sm font-semibold text-gray-400">Gemini API Key</div>
                <div className="px-3 py-2">
                  {geminiApiKey ? (
                      <div className='flex items-center justify-between'>
                          <code className='text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded'>{`${geminiApiKey.substring(0, 4)}...${geminiApiKey.slice(-4)}`}</code>
                          <button onClick={handleClearApiKey} className='text-xs bg-red-600 hover:bg-red-700 text-white font-semibold rounded px-2 py-1'>Clear</button>
                      </div>
                  ) : (
                      <div className='flex items-center space-x-2'>
                          <input 
                              type="password"
                              value={apiKeyInput}
                              onChange={e => setApiKeyInput(e.target.value)}
                              placeholder='Enter your API key'
                              className='flex-grow bg-gray-700 text-sm text-gray-200 placeholder-gray-400 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500'
                          />
                          <button onClick={handleSaveApiKey} className='text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded px-2 py-1'>Save</button>
                      </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow flex overflow-hidden">
        <aside className="w-1/4 max-w-xs min-w-[200px] bg-gray-800 border-r border-gray-700 flex flex-col">
          {repoInfo && (
            <div className="flex-shrink-0 flex items-center justify-between p-2 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Explorer</h3>
                <button 
                  onClick={() => setIsFileSearchOpen(true)} 
                  title="Search files (Ctrl+P)"
                  className="p-1 rounded hover:bg-gray-700"
                  aria-label="Search files"
                >
                  <SearchIcon />
                </button>
            </div>
          )}
          <div className="overflow-y-auto">
            {isTreeLoading && <div className="p-4 text-center">Loading file tree...</div>}
            {treeError && <div className="p-4 text-red-400">Error: {treeError}</div>}
            {!isTreeLoading && !treeError && repoInfo && <FileTree tree={fileTree} onFileSelect={handleFileSelect} selectedFilePath={selectedFilePath} />}
            {!repoInfo && !isTreeLoading && !treeError && <div className="p-4 text-gray-500">Enter a repository URL to start browsing.</div>}
          </div>
        </aside>
        
        <div className="flex-grow flex overflow-hidden">
          <section className={`relative transition-all duration-300 ease-in-out ${isChatOpen && chatDisplayMode === 'docked' ? 'w-2/3' : 'w-full'}`}>
            <EditorDisplay 
              ref={editorContainerRef}
              filePath={selectedFilePath} content={selectedFileContent} isLoading={isContentLoading} error={contentError}
              onTextSelect={handleTextSelection} onSummarize={handleSummarizeFile} isSummarizing={summaryPopup.isLoading}
              onGoToDefinition={handleGoToDefinition}
              isAiEnabled={!!geminiApiKey}
            />
            {highlightStyle && <div className="line-highlight" style={highlightStyle} />}
          </section>

          {isChatOpen && chatDisplayMode === 'docked' && (
              <div className="w-1/3 min-w-[350px] flex-shrink-0">
                  <ChatPanel
                      isOpen={isChatOpen}
                      onClose={() => setIsChatOpen(false)}
                      displayMode="docked"
                      selectedFilePath={selectedFilePath}
                      isAiEnabled={!!geminiApiKey}
                      allFilePaths={allFilePaths}
                      repoInfo={repoInfo}
                    />
              </div>
          )}
        </div>
      </main>
      
      {explanationPopup.isVisible && (
        <ExplanationPopup
            x={explanationPopup.x} y={explanationPopup.y} explanationData={explanationPopup.data}
            isLoading={explanationPopup.isLoading} error={explanationPopup.error} onClose={() => setExplanationPopup(p => ({...p, isVisible: false}))}
        />
      )}
      {summaryPopup.isVisible && (
        <SummaryPopup 
            summary={summaryPopup.data} isLoading={summaryPopup.isLoading} error={summaryPopup.error} 
            onClose={() => setSummaryPopup(p => ({...p, isVisible: false}))} 
        />
      )}
      {isFileSearchOpen && (
          <FileSearch 
              isOpen={isFileSearchOpen}
              onClose={() => setIsFileSearchOpen(false)}
              allFilePaths={allFilePaths}
              onFileSelect={(path) => {
                  handleFileSelect(path);
                  setIsFileSearchOpen(false);
              }}
          />
      )}
      {isNavigatorOpen && (
        <FileHistoryNavigator
          isOpen={isNavigatorOpen}
          files={navigatorFiles}
          selectedIndex={navigatorIndex}
        />
      )}
      {(chatDisplayMode === 'drawer' || chatDisplayMode === 'modal') && (
        <ChatPanel
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            displayMode={chatDisplayMode}
            selectedFilePath={selectedFilePath}
            isAiEnabled={!!geminiApiKey}
            allFilePaths={allFilePaths}
            repoInfo={repoInfo}
        />
      )}
    </div>
  );
}