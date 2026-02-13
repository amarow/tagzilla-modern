import { parentPort } from 'worker_threads';
import { fileService } from './file.service';

// Listen for messages from the main thread
if (parentPort) {
    parentPort.on('message', async (task: { filePath: string, extension: string, fileId: number }) => {
        const { filePath, extension, fileId } = task;
        try {
            const text = await fileService.extractText(filePath, extension);
            parentPort?.postMessage({ status: 'success', fileId, filePath, text });
        } catch (error: any) {
            parentPort?.postMessage({ status: 'error', fileId, filePath, error: error.message });
        }
    });
}
