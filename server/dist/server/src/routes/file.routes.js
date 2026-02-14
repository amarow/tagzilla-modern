"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../auth");
const FileController_1 = require("../controllers/FileController");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, FileController_1.FileController.getAll);
router.get('/:id/text-content', auth_1.authenticateToken, FileController_1.FileController.getTextContent);
router.get('/:id/content', auth_1.authenticateToken, FileController_1.FileController.getContent);
router.get('/:id/zip-content', auth_1.authenticateToken, FileController_1.FileController.getZipContent);
router.get('/:id/zip-entry', auth_1.authenticateToken, FileController_1.FileController.getZipEntry);
router.post('/:id/open', auth_1.authenticateToken, FileController_1.FileController.openFile);
router.post('/:id/open-directory', auth_1.authenticateToken, FileController_1.FileController.openDirectory);
// Tags Logic
router.post('/:id/tags', auth_1.authenticateToken, FileController_1.FileController.addTag);
router.post('/bulk-tags', auth_1.authenticateToken, FileController_1.FileController.bulkAddTags);
router.delete('/bulk-tags', auth_1.authenticateToken, FileController_1.FileController.bulkRemoveTags);
router.delete('/:fileId/tags/:tagId', auth_1.authenticateToken, FileController_1.FileController.removeTag);
exports.default = router;
