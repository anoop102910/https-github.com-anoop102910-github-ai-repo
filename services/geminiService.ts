import { GoogleGenAI, Type } from "@google/genai";
import { Explanation } from '../types';

// This will be populated by the environment automatically
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might want to disable the feature or show a message.
  // For this context, we will throw an error if the key is missing.
  console.error("API_KEY is not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const explanationSchema = {
    type: Type.OBJECT,
    properties: {
        explanation: {
            type: Type.STRING,
            description: "A concise explanation of the selected code snippet in the context of the full code.",
        },
        example: {
            type: Type.STRING,
            description: "A simple, self-contained code example demonstrating the usage of the selected item. The code should be formatted as a markdown code block.",
        },
    },
    required: ["explanation", "example"],
};

export const getCodeExplanation = async (selectedText: string, codeContext: string): Promise<Explanation> => {
    if (!API_KEY) {
        throw new Error("Gemini API key is not configured.");
    }

    const prompt = `
You are an expert programmer and a helpful coding assistant. A user has selected a piece of text from a code file and wants to understand it.

The selected text is: \`${selectedText}\`

The code context (which may be the full file or a snippet) is:
\`\`\`
${codeContext}
\`\`\`

Please provide a concise explanation of what the selected text is and its role in this specific context. Also, provide a generic, easy-to-understand code example of how it is typically used.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: explanationSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        return parsedJson as Explanation;

    } catch (error) {
        console.error("Error fetching explanation from Gemini:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to get explanation from AI: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the AI.");
    }
};

export const getFileSummary = async (fileName: string, fileContent: string): Promise<string> => {
    if (!API_KEY) {
        throw new Error("Gemini API key is not configured.");
    }
    const prompt = `
You are an expert programmer and a helpful coding assistant. Please provide a concise summary of the following code file.
Explain its main purpose, what it exports (if anything), and its key functionalities. Format the summary in clear, easy-to-read paragraphs.

File Name: \`${fileName}\`

File Content:
\`\`\`
${fileContent}
\`\`\`
`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error fetching summary from Gemini:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to get summary from AI: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the AI.");
    }
};
