
import React, { useState, useEffect, useRef, FormEvent, useMemo } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getGeminiApiKey } from '../services/localStorageService';
import { fetchFileContent } from '../services/githubService';
import { Message, RepoInfo, ChatDisplayMode } from '../types';
import FileSearch from './FileSearch';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFilePath: string | null;
  isAiEnabled: boolean;
  allFilePaths: string[];
  repoInfo: RepoInfo | null;
  displayMode: ChatDisplayMode;
  defaultBranch: string;
}

const AddIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
);

const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose, selectedFilePath, isAiEnabled, allFilePaths, repoInfo, displayMode, defaultBranch }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatInstance = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [contextFiles, setContextFiles] = useState<Set<string>>(new Set());
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);
  
  // Automatically add the currently viewed file to the chat context
  useEffect(() => {
    if (selectedFilePath) {
      setContextFiles(prev => {
        const newSet = new Set(prev);
        newSet.add(selectedFilePath);
        return newSet;
      });
    }
  }, [selectedFilePath]);
  
  const contextFilesArray = useMemo(() => Array.from(contextFiles), [contextFiles]);

  // Re-initialize the entire chat session when context changes
  useEffect(() => {
    if (!isOpen || !isAiEnabled || !repoInfo) {
      chatInstance.current = null;
      if (!isAiEnabled && isOpen) {
        setMessages([{ role: 'system-info', text: 'Please set your Gemini API key in the settings to enable chat.' }]);
      }
      return;
    }

    const initializeChat = async () => {
      setIsLoading(true);
      setMessages([]); // Clear old messages

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        setMessages([{ role: 'system-info', text: 'API key not found.' }]);
        setIsLoading(false);
        return;
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        let baseSystemInstruction = `You are a helpful and friendly AI assistant integrated into a GitHub repository explorer. Your primary role is to answer user questions about the code. When a user asks a question, it might be in the context of a specific file or set of files they have provided. Keep your answers concise, accurate, and easy to understand. Use markdown for code examples and formatting when it improves clarity.`;
        
        let initialPrompt = 'Hello! How can I help you explore this repository?';

        if (contextFilesArray.length > 0) {
            if (!defaultBranch) {
                setMessages([{ role: 'system-info', text: `Could not load file context because the repository appears to be empty or has no default branch.` }]);
                setIsLoading(false);
                return;
            }
            setMessages([{ role: 'system-info', text: `Loading context from ${contextFilesArray.length} file(s)...` }]);
            const contentPromises = contextFilesArray.map(path => 
                fetchFileContent(repoInfo.owner, repoInfo.repo, defaultBranch, path)
                    .then(content => `--- START OF FILE: ${path} ---\n${content}\n--- END OF FILE: ${path} ---`)
                    .catch(() => `--- Could not load file: ${path} ---`)
            );
            const contents = await Promise.all(contentPromises);
            const contextText = contents.join('\n\n');
            
            baseSystemInstruction += ` The user has provided the following file(s) as context for this conversation. Base your answers on them. CONTEXT:\n${contextText}`;
            initialPrompt = `I've loaded ${contextFilesArray.length} file(s) into our context. What would you like to know about them?`;
        }

        chatInstance.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction: baseSystemInstruction }
        });

        setMessages([{ role: 'system-info', text: initialPrompt }]);

      } catch (error) {
        console.error("Failed to initialize Gemini chat:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        setMessages([{ role: 'system-info', text: `Error: Failed to initialize AI chat. ${errorMessage}` }]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
    // Using JSON.stringify to get a stable dependency for the array
  }, [isOpen, isAiEnabled, repoInfo, defaultBranch, JSON.stringify(contextFilesArray)]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !chatInstance.current) return;

    const userMessage: Message = { role: 'user', text: input };
    const currentInput = input;
    
    setMessages(prev => [...prev, userMessage, { role: 'model', text: '' }]);
    setInput('');
    setIsLoading(true);

    try {
      const stream = await chatInstance.current.sendMessageStream({ message: currentInput });
      
      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk.text;
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { role: 'model', text: fullText };
            return newMessages;
        });
      }

    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      const errorMessageText = `Sorry, I encountered an error. ${error instanceof Error ? error.message : 'Please try again.'}`;
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'model', text: errorMessageText };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderMessageText = (text: string, isStreaming: boolean) => {
    const rawMarkup = marked.parse(text, { gfm: true, breaks: true, async: false });
    // Type assertion because marked types are not perfect with async: false
    const sanitizedMarkup = DOMPurify.sanitize(rawMarkup as string);
    const cursor = isStreaming ? '<span class="blinking-cursor"></span>' : '';
    return <div dangerouslySetInnerHTML={{ __html: sanitizedMarkup + cursor }} />;
  };

  const removeContextFile = (pathToRemove: string) => {
    setContextFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(pathToRemove);
        return newSet;
    });
  };

  const handleFileContextSelect = (path: string) => {
    setContextFiles(prev => new Set(prev).add(path));
    setIsFileSearchOpen(false);
  }

  const chatContent = (
    <>
      <header className="flex items-center justify-between p-3 border-b border-gray-700 flex-shrink-0">
        <h2 id="chat-panel-title" className="font-semibold text-lg text-blue-400">AI Assistant</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close Chat">&times;</button>
      </header>
      
      <div className="p-3 border-b border-gray-700 flex-shrink-0">
          <div className="font-semibold text-sm text-gray-400 mb-2">Context Files:</div>
          <div className="flex flex-wrap gap-2 items-center">
              {contextFilesArray.map(path => (
                  <div key={path} className="flex items-center bg-gray-700 rounded-full px-2 py-0.5 text-xs">
                      <span className="truncate max-w-xs" title={path}>{path}</span>
                      <button onClick={() => removeContextFile(path)} className="ml-1.5 text-gray-400 hover:text-white">&times;</button>
                  </div>
              ))}
              <button 
                  onClick={() => setIsFileSearchOpen(true)}
                  className="flex items-center text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full px-2 py-0.5"
              >
                  <AddIcon /> Add File
              </button>
          </div>
      </div>

      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'system-info' ? (
              <div className="text-center text-sm text-gray-500 py-2 w-full">{msg.text}</div>
            ) : (
              <div className={`max-w-sm lg:max-w-md px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                  <div className="prose prose-sm prose-invert max-w-none">{renderMessageText(msg.text, isLoading && msg.role === 'model' && index === messages.length -1)}</div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <footer className="p-3 border-t border-gray-700 flex-shrink-0">
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isAiEnabled ? "Ask about the code..." : "API key required"}
            className="flex-grow bg-gray-700 text-gray-200 placeholder-gray-400 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || !isAiEnabled}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md p-2 disabled:bg-gray-500 disabled:cursor-not-allowed"
            disabled={isLoading || !input.trim() || !isAiEnabled}
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </footer>
    </>
  );

  if (!isOpen) return null;

  return (
    <>
      {displayMode === 'drawer' && (
        <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
            <div className={`fixed top-0 right-0 h-full w-full max-w-lg bg-gray-800 border-l border-gray-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} role="dialog">
                {chatContent}
            </div>
        </>
      )}
      {displayMode === 'docked' && (
        <div className="h-full bg-gray-800 border-l border-gray-700 flex flex-col" role="complementary">
            {chatContent}
        </div>
      )}
      {displayMode === 'modal' && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl h-[80vh] bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 flex flex-col" role="dialog">
                {chatContent}
            </div>
        </div>
      )}

      {isFileSearchOpen && (
          <FileSearch 
              isOpen={isFileSearchOpen}
              onClose={() => setIsFileSearchOpen(false)}
              allFilePaths={allFilePaths}
              onFileSelect={handleFileContextSelect}
          />
      )}
    </>
  );
};

export default ChatPanel;
