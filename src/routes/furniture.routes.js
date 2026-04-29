const express = require('express');
const router = express.Router();
const furnitureController = require('../controllers/furniture.controller');
const { auth, optionalAuth, authorize } = require('../middlewares/auth.middleware');

// Public or Tenant/Owner access
router.get('/', optionalAuth, furnitureController.getFurniture);

// Protected routes
router.get('/my-suggestions', auth, furnitureController.getOwnerPendingFurniture);
router.post('/', auth, furnitureController.addFurniture);

router.put('/:id', auth, furnitureController.updateFurniture);
router.delete('/:id', auth, furnitureController.deleteFurniture);
router.patch('/:id/status', auth, authorize('admin'), furnitureController.updateFurnitureStatus);

router.get('/property/:propertyId', auth, furnitureController.getFurnitureByProperty);
router.post('/order', auth, furnitureController.saveFurnitureOrder);
router.get('/order/:contractId', auth, furnitureController.getFurnitureOrderByContract);
router.get('/owner-orders', auth, furnitureController.getFurnitureOrdersForOwner);
router.get('/tenant-orders', auth, furnitureController.getFurnitureOrdersForTenant);

// Admin exclusive routes
router.get('/all-orders', auth, authorize('admin'), furnitureController.getAllFurnitureOrders);
router.get('/all-change-requests', auth, authorize('admin'), furnitureController.getAllChangeRequests);

// Change requests
router.post('/change-requests', auth, furnitureController.createChangeRequest);
router.get('/change-requests/:contractId', auth, furnitureController.getChangeRequestsByContract);
router.get('/owner-change-requests', auth, furnitureController.getOwnerChangeRequests);
router.put('/change-requests/:id/review', auth, authorize('owner'), furnitureController.reviewChangeRequest);
router.put('/change-requests/:id/reply', auth, furnitureController.replyToChangeRequest);

module.exports = router;
