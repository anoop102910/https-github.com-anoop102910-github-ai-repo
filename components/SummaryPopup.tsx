import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface SummaryPopupProps {
  summary: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  onClose: () => void;
}

const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-t-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
);

const SummaryPopup: React.FC<SummaryPopupProps> = ({ summary, isLoading, isStreaming, error, onClose }) => {
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

    const renderContent = () => {
        if (isLoading) return <LoadingSpinner />;
        if (error) return <div className="text-red-400 p-4 bg-red-900/20 rounded-md"><strong>Error:</strong> {error}</div>;
        if (summary === null) return null;

        const rawMarkup = marked.parse(summary, { gfm: true, breaks: true, async: false }) as string;
        const sanitizedMarkup = DOMPurify.sanitize(rawMarkup);
        const cursor = isStreaming ? '<span class="blinking-cursor"></span>' : '';

        return <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizedMarkup + cursor }} />;
    };
    
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 transition-opacity"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="summary-title"
        >
            <div 
                ref={popupRef}
                onClick={(e) => e.stopPropagation()}
                className="z-50 w-full max-w-2xl bg-gray-800 border border-gray-600 rounded-lg shadow-2xl text-gray-300 flex flex-col max-h-[80vh]"
            >
                <div className="flex justify-between items-center p-3 bg-gray-700/50 border-b border-gray-600 flex-shrink-0">
                    <h3 id="summary-title" className="font-semibold text-lg text-blue-400">File Summary</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">&times;</button>
                </div>

                <div className="p-5 overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default SummaryPopup;
