const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { isAdmin } = require("../middlewares/admin.middleware");

router.use(authMiddleware);

router.get("/", userController.getUsers);
router.get("/:id", userController.getUser);
router.post("/", isAdmin, userController.createUser);
router.put("/user-profile", userController.updateOwnProfile);
router.put("/:id", isAdmin, userController.updateUser);
router.put("/:id/status", isAdmin, userController.toggleUserStatus);

module.exports = router;
