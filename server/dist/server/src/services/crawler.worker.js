"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const file_service_1 = require("./file.service");
// Listen for messages from the main thread
if (worker_threads_1.parentPort) {
    worker_threads_1.parentPort.on('message', async (task) => {
        const { filePath, extension, fileId } = task;
        try {
            const text = await file_service_1.fileService.extractText(filePath, extension);
            worker_threads_1.parentPort?.postMessage({ status: 'success', fileId, filePath, text });
        }
        catch (error) {
            worker_threads_1.parentPort?.postMessage({ status: 'error', fileId, filePath, error: error.message });
        }
    });
}
