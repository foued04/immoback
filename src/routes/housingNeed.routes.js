const express = require('express');
const { auth } = require('../middlewares/auth.middleware');
const housingNeedController = require('../controllers/housingNeed.controller');

const router = express.Router();

router.get('/me', auth, housingNeedController.getMyHousingNeed);
router.post('/me', auth, housingNeedController.upsertMyHousingNeed);
router.get('/all', auth, housingNeedController.getAllHousingNeeds);

module.exports = router;
