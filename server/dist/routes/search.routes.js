"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../auth");
const SearchController_1 = require("../controllers/SearchController");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, SearchController_1.SearchController.search);
exports.default = router;
