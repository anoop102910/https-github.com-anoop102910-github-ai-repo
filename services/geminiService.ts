import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from './localStorageService';

const getAiClient = (): GoogleGenAI => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        throw new Error("Gemini API key is not configured. Please add it in the settings.");
    }
    return new GoogleGenAI({ apiKey });
};

export async function* getCodeExplanation(selectedText: string, codeContext: string): AsyncGenerator<string> {
    try {
        const ai = getAiClient();
        const prompt = `
You are an expert programmer and a helpful coding assistant. A user has selected a piece of text from a code file and wants to understand it.

The selected text is: \`${selectedText}\`

The code context (which may be the full file or a snippet) is:
\`\`\`
${codeContext}
\`\`\`

Please provide a concise explanation of what the selected text is and its role in this specific context.
Then, provide a generic, easy-to-understand code example of how it is typically used.

Format your response as Markdown with the following structure:
- A heading '## Explanation' followed by the explanation.
- A heading '## Example' followed by a markdown code block for the example.
`;

        const response = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        
        for await (const chunk of response) {
            yield chunk.text;
        }

    } catch (error) {
        console.error("Error fetching explanation from Gemini:", error);
        if (error instanceof Error) {
            if (error.message.includes("not configured")) {
                throw error;
            }
            throw new Error(`Failed to get explanation from AI: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the AI.");
    }
};

export async function* getFileSummary(fileName: string, fileContent: string): AsyncGenerator<string> {
    try {
        const ai = getAiClient();
        const prompt = `
You are an expert programmer and a helpful coding assistant. Please provide a concise summary of the following code file.
Explain its main purpose, what it exports (if anything), and its key functionalities. Format the summary in clear, easy-to-read markdown.

File Name: \`${fileName}\`

File Content:
\`\`\`
${fileContent}
\`\`\`
`;
        const response = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        
        for await (const chunk of response) {
            yield chunk.text;
        }
    } catch (error) {
        console.error("Error fetching summary from Gemini:", error);
        if (error instanceof Error) {
            if (error.message.includes("not configured")) {
                throw error;
            }
            throw new Error(`Failed to get summary from AI: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the AI.");
    }
};
