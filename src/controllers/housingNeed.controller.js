const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Property = require('../models/Property.model');
const HousingNeed = require('../models/HousingNeed.model');
const housingNeedService = require('../services/housingNeed.service');

const ensureTenant = (user) => {
  if (!user || user.role !== 'tenant') {
    throw new ApiError(403, 'Only tenants can manage housing needs');
  }
};

const getMyHousingNeed = asyncHandler(async (req, res) => {
  ensureTenant(req.user);

  const need = await HousingNeed.findOne({ tenant: req.user._id, isActive: true });
  res.send(need || null);
});

const upsertMyHousingNeed = asyncHandler(async (req, res) => {
  ensureTenant(req.user);

  const need = await housingNeedService.upsertHousingNeed(req.user._id, req.body);
  const { matches, notifiedMatches } = await housingNeedService.notifyMatchesForNeed(need, Property);

  res.status(201).send({
    need,
    matchesCount: matches.length,
    notifiedMatches,
    message: matches.length > 0
      ? 'Besoin logement enregistre. Des logements correspondants sont deja disponibles.'
      : 'Besoin logement enregistre. Vous serez notifie des qu un logement correspondant sera disponible.',
  });
});

const getAllHousingNeeds = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Seul l\'administrateur peut consulter tous les besoins logement');
  }

  const needs = await housingNeedService.getAllHousingNeeds();
  res.send(needs);
});

module.exports = {
  getMyHousingNeed,
  upsertMyHousingNeed,
  getAllHousingNeeds,
};
