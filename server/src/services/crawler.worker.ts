import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
const pdf = require('pdf-parse');
import mammoth from 'mammoth';

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
