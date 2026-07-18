"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiController_1 = require("../controllers/aiController");
const router = (0, express_1.Router)();
router.post('/recommend', aiController_1.getRecommendations);
router.post('/chat', aiController_1.chatAssistant);
exports.default = router;
