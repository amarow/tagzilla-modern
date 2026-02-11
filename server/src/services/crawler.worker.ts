import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import AdmZip from 'adm-zip';

// Helper function to extract text (moved from crawler.ts)
async function extractText(filePath: string, extension: string): Promise<string | null> {
    try {
        if (extension === '.pdf') {
            const dataBuffer = await fs.promises.readFile(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        } else if (extension === '.docx') {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        } else if (extension === '.odt') {
            const zip = new AdmZip(filePath);
            const contentXml = zip.readAsText('content.xml');
            if (!contentXml) return null;
            
            // Basic Formatting Preservation
            let formatted = contentXml;
            
            // Paragraphs -> Newlines
            formatted = formatted.replace(/<text:p[^>]*>/g, '\n\n');
            
            // Headings -> Markdown headers based on level
            formatted = formatted.replace(/<text:h[^>]*text:outline-level="1"[^>]*>/g, '\n\n# ');
            formatted = formatted.replace(/<text:h[^>]*text:outline-level="2"[^>]*>/g, '\n\n## ');
            formatted = formatted.replace(/<text:h[^>]*text:outline-level="3"[^>]*>/g, '\n\n### ');
            // Fallback for headings without explicit level or higher levels
            formatted = formatted.replace(/<text:h[^>]*>/g, '\n\n# ');
            
            // Tab -> spaces
            formatted = formatted.replace(/<text:tab\/>/g, '    ');
            
            // Line break -> newline
            formatted = formatted.replace(/<text:line-break\/>/g, '\n');

            // Strip all other tags
            return formatted.replace(/<[^>]+>/g, '').trim();
        } else {
            // Default text file
            return await fs.promises.readFile(filePath, 'utf8');
        }
    } catch (error: any) {
        // Return null or specific error structure, avoiding full error object cloning issues
        return null;
    }
}

// Listen for messages from the main thread
if (parentPort) {
    parentPort.on('message', async (task: { filePath: string, extension: string, fileId: number }) => {
        const { filePath, extension, fileId } = task;
        try {
            const text = await extractText(filePath, extension);
            parentPort?.postMessage({ status: 'success', fileId, filePath, text });
        } catch (error: any) {
            parentPort?.postMessage({ status: 'error', fileId, filePath, error: error.message });
        }
    });
}
