import React, { useEffect, useRef } from 'react';
import { Explanation } from '../types';

interface ExplanationPopupProps {
  x: number;
  y: number;
  explanationData: Explanation | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-t-2 border-gray-500 border-t-blue-400 rounded-full animate-spin"></div>
    </div>
);

const ExplanationPopup: React.FC<ExplanationPopupProps> = ({ x, y, explanationData, isLoading, error, onClose }) => {
    const popupRef = useRef<HTMLDivElement>(null);

    // Close popup if clicked outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);
    
    // Adjust position to prevent going off-screen
    const style: React.CSSProperties = {
        top: y + 15,
        left: x,
        transform: 'translateX(-50%)',
        position: 'fixed',
    };
    
    // A simple regex to format markdown code blocks
    const formatExample = (example: string) => {
        const codeBlockRegex = /```(?:\w+\n)?([\s\S]+?)```/;
        const match = example.match(codeBlockRegex);
        if (match && match[1]) {
            return (
                <pre className="bg-gray-900 rounded-md p-3 text-sm font-mono whitespace-pre-wrap mt-2">
                    <code>{match[1].trim()}</code>
                </pre>
            );
        }
        return <p>{example}</p>;
    };

    return (
        <div 
            ref={popupRef}
            style={style}
            className="z-50 w-[450px] max-w-lg bg-gray-800 border border-gray-600 rounded-lg shadow-2xl text-gray-300 flex flex-col"
        >
            <div className="flex justify-between items-center p-3 bg-gray-700/50 border-b border-gray-600">
                <h3 className="font-semibold text-lg text-blue-400">Code Explanation</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[400px]">
                {isLoading && <LoadingSpinner />}
                {error && <div className="text-red-400">{error}</div>}
                {explanationData && !isLoading && (
                    <>
                        <div>
                            <h4 className="font-semibold text-gray-200 mb-1">Explanation</h4>
                            <p className="text-base text-gray-300 leading-relaxed">{explanationData.explanation}</p>
                        </div>
                        <div className="mt-4">
                            <h4 className="font-semibold text-gray-200 mb-1">Example Usage</h4>
                            {formatExample(explanationData.example)}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ExplanationPopup;