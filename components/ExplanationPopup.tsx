import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Explanation } from '../types';

interface ExplanationPopupProps {
  explanationData: Explanation | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  onClose: () => void;
}

const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-t-2 border-gray-500 border-t-blue-400 rounded-full animate-spin"></div>
    </div>
);

const ExplanationPopup: React.FC<ExplanationPopupProps> = ({ explanationData, isLoading, isStreaming, error, onClose }) => {
    const popupRef = useRef<HTMLDivElement>(null);

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);
    
    const renderMarkdown = (markdown: string, withCursor: boolean = false) => {
        // If there's no markdown and we are not supposed to show a cursor, render nothing.
        if (!markdown && !withCursor) return null;

        const raw = marked.parse(markdown || '', { gfm: true, breaks: true, async: false }) as string;
        const sanitized = DOMPurify.sanitize(raw);
        const cursor = withCursor ? '<span class="blinking-cursor"></span>' : '';
        return <div className="prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitized + cursor }} />;
    };

    const renderContent = () => {
        if (isLoading) return <LoadingSpinner />;
        if (error) return <div className="text-red-400 p-4 bg-red-900/20 rounded-md"><strong>Error:</strong> {error}</div>;
        if (!explanationData) return null;

        return (
            <>
                <div>
                    <h4 className="font-semibold text-gray-200 mb-1">Explanation</h4>
                    {renderMarkdown(explanationData.explanation)}
                </div>
                <div className="mt-4">
                    <h4 className="font-semibold text-gray-200 mb-1">Example Usage</h4>
                    {renderMarkdown(explanationData.example, isStreaming)}
                </div>
            </>
        )
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 transition-opacity"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="explanation-title"
        >
            <div 
                ref={popupRef}
                onClick={(e) => e.stopPropagation()}
                className="z-50 w-full max-w-2xl bg-gray-800 border border-gray-600 rounded-lg shadow-2xl text-gray-300 flex flex-col max-h-[80vh]"
            >
                <div className="flex justify-between items-center p-3 bg-gray-700/50 border-b border-gray-600 flex-shrink-0">
                    <h3 id="explanation-title" className="font-semibold text-lg text-blue-400">Code Explanation</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">&times;</button>
                </div>

                <div className="p-5 overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default ExplanationPopup;