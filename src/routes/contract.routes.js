const express = require('express');
const { auth } = require('../middlewares/auth.middleware');
const contractController = require('../controllers/contract.controller');

const router = express.Router();

router.post('/generate', auth, contractController.generateContract);
router.get('/request/:requestId', auth, contractController.getContract);
router.get('/:contractId', auth, contractController.getContractById);
router.put('/:contractId/sign', auth, contractController.signContract);
router.put('/:contractId/send', auth, contractController.sendToTenant);
router.put('/:contractId/send-back', auth, contractController.sendBackToOwner);
router.put('/:contractId/activate', auth, contractController.activateContract);

module.exports = router;
