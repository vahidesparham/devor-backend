const express = require("express");
const multer = require("multer");
const auth = require("../../middlewares/auth");
const requirePermission = require("../../middlewares/requirePermission");
const controller = require("./upload.controller");

const router = express.Router();

const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024,
    },
});

const videoUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 300 * 1024 * 1024,
    },
});

const fileUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024,
    },
});

router.post("/image", auth, requirePermission("uploads.create"), imageUpload.single("image"), controller.uploadImage);

router.post("/froala/image", imageUpload.single("image"), auth, requirePermission("uploads.create"), controller.uploadFroalaImage);
router.post("/froala/video", videoUpload.single("video"), auth, requirePermission("uploads.create"), controller.uploadFroalaVideo);
router.post("/froala/file", fileUpload.single("file"), auth, requirePermission("uploads.create"), controller.uploadFroalaFile);

module.exports = router;
