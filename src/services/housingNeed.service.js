const HousingNeed = require('../models/HousingNeed.model');
const Notification = require('../models/Notification.model');

const SYSTEM_TYPE = 'Syst\u00e8me';

const normalize = (value) => String(value || '').trim().toLowerCase();

const tokenize = (value) =>
  normalize(value)
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

const buildNeedSummary = (need) => {
  const parts = [];

  if (need.propertyType) parts.push(`type ${need.propertyType.toUpperCase()}`);
  if (need.desiredCity) parts.push(`ville ${need.desiredCity}`);
  if (need.maxBudget) parts.push(`budget max ${need.maxBudget} TND`);
  if (need.bedrooms) parts.push(`chambres ${need.bedrooms}`);
  if (need.meuble) parts.push('meuble');
  if (need.parking) parts.push('parking');

  return parts.join(', ');
};

const propertyMatchesNeed = (property, need) => {
  if (!property || !need) return false;
  if (property.status !== 'available') return false;
  if (property.moderationStatus !== 'approved') return false;

  const desiredCity = normalize(need.desiredCity);
  const department = normalize(need.department);
  const propertyText = normalize([
    property.title,
    property.description,
    property.city,
    property.address,
  ].filter(Boolean).join(' '));

  if (desiredCity && !propertyText.includes(desiredCity)) return false;
  if (department && !propertyText.includes(department)) return false;

  if (typeof need.minBudget === 'number' && !Number.isNaN(need.minBudget) && property.rent < need.minBudget) {
    return false;
  }

  if (typeof need.maxBudget === 'number' && !Number.isNaN(need.maxBudget) && property.rent > need.maxBudget) {
    return false;
  }

  if (need.propertyType && property.type !== need.propertyType) return false;

  if (need.bedrooms) {
    if (need.bedrooms === '4+') {
      if (Number(property.bedrooms || 0) < 4) return false;
    } else if (Number(property.bedrooms || 0) !== Number(need.bedrooms)) {
      return false;
    }
  }

  if (need.meuble && !property.meuble) return false;
  if (need.parking && !property.parking) return false;

  if (need.moveInDate && property.availability) {
    const propertyDate = new Date(property.availability);
    const moveInDate = new Date(need.moveInDate);
    if (!Number.isNaN(propertyDate.getTime()) && !Number.isNaN(moveInDate.getTime()) && propertyDate > moveInDate) {
      return false;
    }
  }

  const noteTokens = tokenize(need.notes);
  if (noteTokens.length > 0 && !noteTokens.some((token) => propertyText.includes(token))) {
    return false;
  }

  return true;
};

const notifyTenantForProperty = async (need, property) => {
  const alreadyNotified = (need.notifiedPropertyIds || []).some(
    (propertyId) => propertyId.toString() === property._id.toString()
  );

  if (alreadyNotified) return false;

  const summary = buildNeedSummary(need);

  await Notification.create({
    recipient: need.tenant,
    type: SYSTEM_TYPE,
    title: 'Nouveau logement correspondant disponible',
    preview: `${property.title} correspond a votre besoin logement.`,
    content: [
      `Un logement correspondant a votre besoin est maintenant disponible.`,
      `Bien: ${property.title}.`,
      `Ville: ${property.city}.`,
      `Loyer: ${property.rent} TND.`,
      summary ? `Votre besoin: ${summary}.` : '',
    ].filter(Boolean).join(' '),
  });

  need.notifiedPropertyIds = [...(need.notifiedPropertyIds || []), property._id];
  await need.save();

  return true;
};

const findMatchesForNeed = async (need, PropertyModel) => {
  const properties = await PropertyModel.find({
    status: 'available',
    moderationStatus: 'approved',
  });

  return properties.filter((property) => propertyMatchesNeed(property, need));
};

const notifyMatchesForNeed = async (need, PropertyModel) => {
  const matches = await findMatchesForNeed(need, PropertyModel);
  let notifiedMatches = 0;

  for (const property of matches) {
    const notified = await notifyTenantForProperty(need, property);
    if (notified) notifiedMatches += 1;
  }

  return {
    matches,
    notifiedMatches,
  };
};

const upsertHousingNeed = async (tenantId, payload) => {
  const normalizedPayload = {
    desiredCity: String(payload.desiredCity || '').trim(),
    department: String(payload.department || '').trim(),
    minBudget: payload.minBudget === '' || payload.minBudget === undefined ? undefined : Number(payload.minBudget),
    maxBudget: payload.maxBudget === '' || payload.maxBudget === undefined ? undefined : Number(payload.maxBudget),
    propertyType: String(payload.propertyType || '').trim(),
    bedrooms: String(payload.bedrooms || '').trim(),
    moveInDate: String(payload.moveInDate || '').trim(),
    duration: String(payload.duration || '').trim(),
    meuble: Boolean(payload.meuble),
    parking: Boolean(payload.parking),
    nearCenter: Boolean(payload.nearCenter),
    notes: String(payload.notes || '').trim(),
    isActive: true,
    notifiedPropertyIds: [],
  };

  if (!normalizedPayload.desiredCity) {
    const error = new Error('La ville souhaitee est obligatoire');
    error.statusCode = 400;
    throw error;
  }

  if (normalizedPayload.maxBudget !== undefined && Number.isNaN(normalizedPayload.maxBudget)) {
    const error = new Error('Le budget maximum est invalide');
    error.statusCode = 400;
    throw error;
  }

  if (normalizedPayload.minBudget !== undefined && Number.isNaN(normalizedPayload.minBudget)) {
    const error = new Error('Le budget minimum est invalide');
    error.statusCode = 400;
    throw error;
  }

  if (
    normalizedPayload.minBudget !== undefined &&
    normalizedPayload.maxBudget !== undefined &&
    normalizedPayload.minBudget > normalizedPayload.maxBudget
  ) {
    const error = new Error('Le budget minimum doit etre inferieur au budget maximum');
    error.statusCode = 400;
    throw error;
  }

  return HousingNeed.findOneAndUpdate(
    { tenant: tenantId },
    { $set: normalizedPayload },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

const notifyMatchingHousingNeedsForProperty = async (property) => {
  if (!propertyMatchesNeed(property, { desiredCity: property.city })) {
    return 0;
  }

  const needs = await HousingNeed.find({ isActive: true });
  let notificationCount = 0;

  for (const need of needs) {
    if (!propertyMatchesNeed(property, need)) continue;
    const notified = await notifyTenantForProperty(need, property);
    if (notified) notificationCount += 1;
  }

  return notificationCount;
};

module.exports = {
  buildNeedSummary,
  findMatchesForNeed,
  notifyMatchesForNeed,
  notifyMatchingHousingNeedsForProperty,
  propertyMatchesNeed,
  upsertHousingNeed,
};
