const { ok } = require("../../shared/http/response");
const { uploadImageBodySchema } = require("./upload.schemas");
const uploadService = require("./upload.service");

function toAbsoluteLink(req, link) {
    if (!link) return link;
    if (/^https?:\/\//i.test(link)) return link;

    const base = `${req.protocol}://${req.get("host")}`;
    const normalized = String(link).startsWith("/") ? link : `/${link}`;
    return `${base}${normalized}`;
}

async function uploadImage(req, res) {
    const input = uploadImageBodySchema.parse(req.body || {});
    const uploaded = await uploadService.uploadImage({
        file: req.file,
        code: input.code,
        folderName: input.folderName,
        skipCrop: input.skipCrop,
    });

    return ok(
        res,
        {
            code: "IMAGE_UPLOAD_SUCCESS",
            data: uploaded,
            meta: null,
        },
        201,
    );
}

async function uploadFroalaImage(req, res) {
    const body = req.body || {};
    const folderName = body.folderName || req.query.f;

    const result = await uploadService.uploadFroalaImage({
        file: req.file,
        folderName,
    });

    const payload = {
        link: toAbsoluteLink(req, result.link),
    };

    res.type("application/json");
    return res.status(200).send(JSON.stringify(payload));
}

async function uploadFroalaVideo(req, res) {
    const body = req.body || {};
    const folderName = body.folderName || req.query.f;

    const result = await uploadService.uploadFroalaVideo({
        file: req.file,
        folderName,
    });

    const payload = {
        link: toAbsoluteLink(req, result.link),
    };

    res.type("application/json");
    return res.status(200).send(JSON.stringify(payload));
}

async function uploadFroalaFile(req, res) {
    const body = req.body || {};
    const folderName = body.folderName || req.query.f;

    const result = await uploadService.uploadFroalaFile({
        file: req.file,
        folderName,
    });

    const payload = {
        link: toAbsoluteLink(req, result.link),
    };

    res.type("application/json");
    return res.status(200).send(JSON.stringify(payload));
}

module.exports = {
    uploadImage,
    uploadFroalaImage,
    uploadFroalaVideo,
    uploadFroalaFile,
};

