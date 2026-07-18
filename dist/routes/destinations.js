"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const destinationController_1 = require("../controllers/destinationController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', destinationController_1.getDestinations);
router.get('/:id', destinationController_1.getDestinationById);
router.post('/', auth_1.authenticateToken, destinationController_1.addDestination);
router.delete('/:id', auth_1.authenticateToken, destinationController_1.deleteDestination);
router.post('/:id/reviews', destinationController_1.addReview); // Public/private reviews, let's keep it public/accessible
exports.default = router;
