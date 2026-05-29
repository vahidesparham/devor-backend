const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const { customAlphabet } = require("nanoid");
const prisma = require("../../prisma");
const { AppError } = require("../../shared/http/response");

const makeShortId = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 8);

function sanitizeSegment(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9/_-]/g, "-")
        .replace(/\/+/g, "/")
        .replace(/\/{2,}/g, "/")
        .replace(/^\/+|\/+$/g, "")
        .replace(/\.\./g, "");
}

function sanitizeBaseName(value, fallback) {
    const safe = String(value || fallback || "file")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    return safe || fallback || "file";
}

function baseNameWithoutExt(filename) {
    const ext = path.extname(filename || "");
    const base = path.basename(filename || "image", ext).trim().toLowerCase();
    return sanitizeBaseName(base, "image");
}

function safeExtension(filename, fallbackExt) {
    const ext = String(path.extname(filename || "") || fallbackExt || "")
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, "");

    if (!ext || ext === ".") return fallbackExt || ".bin";
    return ext.startsWith(".") ? ext : `.${ext}`;
}

function buildPublicLink(type, folder, fileName) {
    const folderPart = folder ? `${folder}/` : "";
    return `/uploads/${type}/${folderPart}${fileName}`;
}

async function ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

function ensureFile(file, field) {
    if (!file) {
        throw new AppError(400, "VALIDATION_ERROR", "Validation failed", {
            errors: [{ path: field, message: `${field} file is required` }],
        });
    }
}

function ensureCode(code) {
    if (!code) {
        throw new AppError(400, "VALIDATION_ERROR", "Validation failed", {
            errors: [{ path: "code", message: "code is required" }],
        });
    }
}

async function uploadImage(payload) {
    const { file, code, folderName, skipCrop } = payload;

    ensureFile(file, "image");
    ensureCode(code);

    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
        throw new AppError(400, "VALIDATION_ERROR", "Validation failed", {
            errors: [{ path: "image", message: "Only image files are allowed" }],
        });
    }

    const config = await prisma.imageConfig.findUnique({ where: { code } });
    if (!config) {
        throw new AppError(404, "NOT_FOUND", "Image config not found");
    }

    const selectedFolder = sanitizeSegment(folderName || config.folderName);
    if (!selectedFolder) {
        throw new AppError(400, "VALIDATION_ERROR", "Validation failed", {
            errors: [{ path: "folderName", message: "folderName is invalid" }],
        });
    }

    const uploadsRoot = path.join(process.cwd(), "public", "uploads", selectedFolder);
    const thumbsRoot = path.join(uploadsRoot, "thumbnails");

    await ensureDir(uploadsRoot);
    await ensureDir(thumbsRoot);

    const basename = baseNameWithoutExt(file.originalname);
    const fileName = `${basename}-${makeShortId()}.webp`;

    const imagePath = path.join(uploadsRoot, fileName);
    const thumbnailPath = path.join(thumbsRoot, fileName);
    const metadata = await sharp(file.buffer).metadata();

    if (skipCrop) {
        await sharp(file.buffer)
            .rotate()
            .webp({ quality: 85 })
            .toFile(imagePath);

        await sharp(file.buffer)
            .rotate()
            .resize(config.thumbnailWidth, config.thumbnailHeight, {
                fit: "contain",
                withoutEnlargement: true,
                background: { r: 255, g: 255, b: 255, alpha: 0 },
            })
            .webp({ quality: 80 })
            .toFile(thumbnailPath);
    } else {
        await sharp(file.buffer)
            .rotate()
            .resize(config.width, config.height, { fit: "cover", withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(imagePath);

        await sharp(file.buffer)
            .rotate()
            .resize(config.thumbnailWidth, config.thumbnailHeight, { fit: "cover", withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(thumbnailPath);
    }

    return {
        code: config.code,
        folderName: selectedFolder,
        fileName,
        imageUrl: `/public/uploads/${selectedFolder}/${fileName}`,
        thumbnailUrl: `/public/uploads/${selectedFolder}/thumbnails/${fileName}`,
        width: skipCrop ? metadata.width || null : config.width,
        height: skipCrop ? metadata.height || null : config.height,
        thumbnailWidth: config.thumbnailWidth,
        thumbnailHeight: config.thumbnailHeight,
    };
}

async function uploadFroalaImage(payload) {
    const { file, folderName } = payload;

    ensureFile(file, "image");

    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
        throw new AppError(400, "VALIDATION_ERROR", "Validation failed", {
            errors: [{ path: "image", message: "Only image files are allowed" }],
        });
    }

    const selectedFolder = sanitizeSegment(folderName || "default");
    if (!selectedFolder) {
        throw new AppError(400, "VALIDATION_ERROR", "Validation failed", {
            errors: [{ path: "folderName", message: "folderName is invalid" }],
        });
    }

    const uploadsRoot = path.join(process.cwd(), "public", "uploads", "images", selectedFolder);
    await ensureDir(uploadsRoot);

    const basename = baseNameWithoutExt(file.originalname);
    const fileName = `${basename}-${makeShortId()}.webp`;
    const fullPath = path.join(uploadsRoot, fileName);

    await sharp(file.buffer).rotate().webp({ quality: 85 }).toFile(fullPath);

    return {
        link: buildPublicLink("images", selectedFolder, fileName),
    };
}

async function uploadFroalaVideo(payload) {
    const { file, folderName } = payload;

    ensureFile(file, "video");

    if (!file.mimetype || !file.mimetype.startsWith("video/")) {
        throw new AppError(400, "VALIDATION_ERROR", "Validation failed", {
            errors: [{ path: "video", message: "Only video files are allowed" }],
        });
    }

    const selectedFolder = sanitizeSegment(folderName || "default");
    if (!selectedFolder) {
        throw new AppError(400, "VALIDATION_ERROR", "Validation failed", {
            errors: [{ path: "folderName", message: "folderName is invalid" }],
        });
    }

    const uploadsRoot = path.join(process.cwd(), "public", "uploads", "videos", selectedFolder);
    await ensureDir(uploadsRoot);

    const ext = safeExtension(file.originalname, ".mp4");
    const basename = sanitizeBaseName(baseNameWithoutExt(file.originalname), "video");
    const fileName = `${basename}-${makeShortId()}${ext}`;
    const fullPath = path.join(uploadsRoot, fileName);

    await fs.writeFile(fullPath, file.buffer);

    return {
        link: buildPublicLink("videos", selectedFolder, fileName),
    };
}

async function uploadFroalaFile(payload) {
    const { file, folderName } = payload;

    ensureFile(file, "file");

    const selectedFolder = sanitizeSegment(folderName || "default");
    if (!selectedFolder) {
        throw new AppError(400, "VALIDATION_ERROR", "Validation failed", {
            errors: [{ path: "folderName", message: "folderName is invalid" }],
        });
    }

    const uploadsRoot = path.join(process.cwd(), "public", "uploads", "files", selectedFolder);
    await ensureDir(uploadsRoot);

    const ext = safeExtension(file.originalname, ".bin");
    const basename = sanitizeBaseName(baseNameWithoutExt(file.originalname), "file");
    const fileName = `${basename}-${makeShortId()}${ext}`;
    const fullPath = path.join(uploadsRoot, fileName);

    await fs.writeFile(fullPath, file.buffer);

    return {
        link: buildPublicLink("files", selectedFolder, fileName),
    };
}

module.exports = {
    uploadImage,
    uploadFroalaImage,
    uploadFroalaVideo,
    uploadFroalaFile,
};
