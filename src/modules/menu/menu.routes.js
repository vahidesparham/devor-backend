const express = require("express");
const auth = require("../../middlewares/auth");
const controller = require("./menu.controller");

const router = express.Router();

router.get("/", auth, controller.getMenu);

module.exports = router;
