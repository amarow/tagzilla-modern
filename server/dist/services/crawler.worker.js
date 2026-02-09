"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const fs_1 = __importDefault(require("fs"));
const pdf = require('pdf-parse');
const mammoth_1 = __importDefault(require("mammoth"));
// Helper function to extract text (moved from crawler.ts)
async function extractText(filePath, extension) {
    try {
        if (extension === '.pdf') {
            const dataBuffer = await fs_1.default.promises.readFile(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        }
        else if (extension === '.docx') {
            const result = await mammoth_1.default.extractRawText({ path: filePath });
            return result.value;
        }
        else {
            // Default text file
            return await fs_1.default.promises.readFile(filePath, 'utf8');
        }
    }
    catch (error) {
        // Return null or specific error structure, avoiding full error object cloning issues
        return null;
    }
}
// Listen for messages from the main thread
if (worker_threads_1.parentPort) {
    worker_threads_1.parentPort.on('message', async (task) => {
        const { filePath, extension, fileId } = task;
        try {
            const text = await extractText(filePath, extension);
            worker_threads_1.parentPort?.postMessage({ status: 'success', fileId, filePath, text });
        }
        catch (error) {
            worker_threads_1.parentPort?.postMessage({ status: 'error', fileId, filePath, error: error.message });
        }
    });
}
