const express = require('express');
const { auth, optionalAuth } = require('../middlewares/auth.middleware');
const propertyController = require('../controllers/property.controller');

const router = express.Router();

router
  .route('/')
  .post(auth, propertyController.createProperty)
  .get(optionalAuth, propertyController.getProperties);

router
  .route('/favorites')
  .get(auth, propertyController.getFavoriteProperties);

router
  .route('/my-rentals')
  .get(auth, propertyController.getMyRentals);

router
  .route('/:propertyId/favorite')
  .post(auth, propertyController.addFavoriteProperty)
  .delete(auth, propertyController.removeFavoriteProperty);

router
  .route('/:propertyId')
  .get(propertyController.getProperty)
  .put(auth, propertyController.updateProperty)
  .delete(auth, propertyController.deleteProperty);

module.exports = router;
