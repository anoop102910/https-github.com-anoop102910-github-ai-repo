import { ExplanationContextType, ChatDisplayMode } from '../types';

const SEARCH_HISTORY_KEY = 'githubRepoViewer_searchHistory';
const EXPLANATION_CONTEXT_KEY = 'githubRepoViewer_explanationContext';
const GEMINI_API_KEY = 'githubRepoViewer_geminiApiKey';
const CHAT_DISPLAY_MODE_KEY = 'githubRepoViewer_chatDisplayMode';
const MAX_HISTORY_ITEMS = 10;

// --- Search History ---

export const getSearchHistory = (): string[] => {
  try {
    const historyJson = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (historyJson) {
      const history = JSON.parse(historyJson);
      if (Array.isArray(history)) {
        return history;
      }
    }
  } catch (error) {
    console.error("Failed to parse search history from localStorage", error);
  }
  return [];
};

export const addSearchHistoryItem = (url: string): void => {
  if (!url) return;
  try {
    let history = getSearchHistory();
    // Remove existing instance of the url to move it to the top
    history = history.filter(item => item !== url);
    // Add the new url to the top
    history.unshift(url);
    // Trim the history to the max number of items
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error("Failed to save search history to localStorage", error);
  }
};

export const clearSearchHistory = (): void => {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear search history from localStorage", error);
  }
};


// --- Settings ---

export const getExplanationContext = (): ExplanationContextType | null => {
    try {
        const context = localStorage.getItem(EXPLANATION_CONTEXT_KEY);
        if (context === 'full' || context === 'partial') {
            return context;
        }
    } catch (error) {
        console.error("Failed to get explanation context from localStorage", error);
    }
    return null;
}

export const setExplanationContext = (context: ExplanationContextType): void => {
    try {
        localStorage.setItem(EXPLANATION_CONTEXT_KEY, context);
    } catch (error) {
        console.error("Failed to save explanation context to localStorage", error);
    }
}

export const getChatDisplayMode = (): ChatDisplayMode | null => {
    try {
        const mode = localStorage.getItem(CHAT_DISPLAY_MODE_KEY);
        if (mode === 'drawer' || mode === 'docked' || mode === 'modal') {
            return mode;
        }
    } catch (error) {
        console.error("Failed to get chat display mode from localStorage", error);
    }
    return null;
}

export const setChatDisplayMode = (mode: ChatDisplayMode): void => {
    try {
        localStorage.setItem(CHAT_DISPLAY_MODE_KEY, mode);
    } catch (error) {
        console.error("Failed to save chat display mode to localStorage", error);
    }
}


// --- API Key ---

export const getGeminiApiKey = (): string | null => {
    try {
        return localStorage.getItem(GEMINI_API_KEY);
    } catch (error) {
        console.error("Failed to get Gemini API key from localStorage", error);
        return null;
    }
};

export const setGeminiApiKey = (apiKey: string): void => {
    try {
        localStorage.setItem(GEMINI_API_KEY, apiKey);
    } catch (error) {
        console.error("Failed to save Gemini API key to localStorage", error);
    }
};

export const clearGeminiApiKey = (): void => {
    try {
        localStorage.removeItem(GEMINI_API_KEY);
    } catch (error) {
        console.error("Failed to clear Gemini API key from localStorage", error);
    }
};