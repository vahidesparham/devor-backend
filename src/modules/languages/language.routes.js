const express = require("express");
const auth = require("../../middlewares/auth");
const requirePermission = require("../../middlewares/requirePermission");
const validate = require("../../middlewares/validate");
const controller = require("./language.controller");
const {
  createLanguageSchema,
  updateLanguageSchema,
  idParamSchema,
  listLanguagesQuerySchema
} = require("./language.schemas");

const router = express.Router();

router.get("/", auth, requirePermission("languages.read"), validate(listLanguagesQuerySchema, "query"), controller.listLanguages);
router.get("/:id", auth, requirePermission("languages.read"), validate(idParamSchema, "params"), controller.getLanguageById);
router.post("/", auth, requirePermission("languages.create"), validate(createLanguageSchema), controller.createLanguage);
router.patch("/:id", auth, requirePermission("languages.update"), validate(idParamSchema, "params"), validate(updateLanguageSchema), controller.updateLanguage);
router.delete("/:id", auth, requirePermission("languages.delete"), validate(idParamSchema, "params"), controller.deleteLanguage);

module.exports = router;
