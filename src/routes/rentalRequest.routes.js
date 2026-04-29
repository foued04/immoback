const express = require('express');
const { auth } = require('../middlewares/auth.middleware');
const rentalRequestController = require('../controllers/rentalRequest.controller');

const router = express.Router();

router
  .route('/')
  .post(auth, rentalRequestController.createRequest)
  .get(auth, rentalRequestController.getRequests);

router
  .route('/:requestId')
  .delete(auth, rentalRequestController.deleteRequest);

router
  .route('/:requestId/status')
  .put(auth, rentalRequestController.updateRequestStatus);

module.exports = router;
