const express = require('express');
const appPublicRoutes = require('../modules/app-public/appPublic.routes');

const router = express.Router();

router.use('/', appPublicRoutes);

module.exports = router;
