const User = require('../models/User.model');
const Property = require('../models/Property.model');
const RentalRequest = require('../models/RentalRequest.model');
const HousingNeed = require('../models/HousingNeed.model');
const Notification = require('../models/Notification.model');
const Message = require('../models/Message.model');
const Conversation = require('../models/Conversation.model');
const Contract = require('../models/Contract.model');
const FurnitureChangeRequest = require('../models/FurnitureChangeRequest.model');
const FurnitureOrder = require('../models/FurnitureOrder.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const getMonthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (date) =>
  date.toLocaleString('en-US', { month: 'short' });

const getRecentMonthBuckets = (count = 6) => {
  const now = new Date();
  const buckets = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: getMonthKey(date),
      month: getMonthLabel(date),
    });
  }

  return buckets;
};

/**
 * Get all users with filters
 * GET /api/users
 */
const getUsers = asyncHandler(async (req, res) => {
  const { role, search, status } = req.query;
  
  const query = {};
  
  if (role && role !== 'all') {
    query.role = role;
  }
  
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(query).select('-password').sort({ createdAt: -1 });

  // Enrich users with stats (properties for owners, requests for tenants)
  const enrichedUsers = await Promise.all(users.map(async (user) => {
    const userData = user.toObject();
    
    if (user.role === 'owner') {
      userData.propertyCount = await Property.countDocuments({ owner: user._id });
    } else if (user.role === 'tenant') {
      userData.requestCount = await RentalRequest.countDocuments({ tenant: user._id });
    }
    
    return userData;
  }));

  res.send(enrichedUsers);
});

/**
 * Get admin dashboard stats
 * GET /api/users/stats
 */
const getAdminStats = asyncHandler(async (req, res) => {
  const [users, properties, rentalRequests] = await Promise.all([
    User.find({}).select('role createdAt'),
    Property.find({}).select('type status createdAt title rent images owner').populate('owner', 'fullName'),
    RentalRequest.find({}).select('createdAt status'),
  ]);

  const totalUsers = users.length;
  const owners = users.filter((user) => user.role === 'owner').length;
  const tenants = users.filter((user) => user.role === 'tenant').length;
  const totalProperties = properties.length;
  const rentedProperties = properties.filter((property) => property.status === 'rented').length;
  const availableProperties = properties.filter((property) => property.status === 'available').length;
  const occupancyRate = totalProperties > 0 ? Math.round((rentedProperties / totalProperties) * 100) : 0;

  const recentMonths = getRecentMonthBuckets(6);
  const usersByMonth = users.reduce((acc, user) => {
    const key = getMonthKey(user.createdAt);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const propertiesByMonth = properties.reduce((acc, property) => {
    const key = getMonthKey(property.createdAt);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  let userRunningTotal = 0;
  let propertyRunningTotal = 0;
  const growth = recentMonths.map(({ key, month }) => {
    userRunningTotal += usersByMonth[key] || 0;
    propertyRunningTotal += propertiesByMonth[key] || 0;
    return {
      month,
      users: userRunningTotal,
      properties: propertyRunningTotal,
    };
  });

  const propertyTypeCounts = properties.reduce((acc, property) => {
    let key = property.type;
    if (['s1', 's2', 's3', 's4'].includes(key)) key = 'Appartement';
    else if (key === 's0') key = 'Studio';
    else if (key === 'villa') key = 'Villa';
    else key = 'Autre';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const propertyTypeData = [
    { name: 'Appartement', value: propertyTypeCounts.Appartement || 0, color: '#2EC4C7' },
    { name: 'Villa', value: propertyTypeCounts.Villa || 0, color: '#F27D72' },
    { name: 'Studio', value: propertyTypeCounts.Studio || 0, color: '#63D8DA' },
    { name: 'Autre', value: propertyTypeCounts.Autre || 0, color: '#158C96' },
  ].filter((item) => item.value > 0);

  const userRoleData = [
    { name: 'Propriétaires', value: owners, color: '#158C96' },
    { name: 'Locataires', value: tenants, color: '#2EC4C7' },
  ];

  const requestsThisWeek = rentalRequests.filter((request) => {
    const requestDate = new Date(request.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return requestDate >= weekAgo;
  }).length;

  const pendingProperties = properties
    .filter((property) => property.moderationStatus === 'pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4)
    .map((property) => ({
      id: property._id,
      title: property.title,
      rent: property.rent,
      images: property.images,
      ownerName: property.owner?.fullName || 'N/A',
    }));

  res.send({
    totals: {
      totalUsers,
      owners,
      tenants,
      totalProperties,
      rentedProperties,
      availableProperties,
      occupancyRate,
      requestsThisWeek,
    },
    growth,
    propertyTypeData,
    userRoleData,
    pendingProperties,
  });
});

/**
 * Update user (status, role, etc)
 * PATCH /api/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.send(user);
});

/**
 * Delete user
 * DELETE /api/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId);
  
  if (!user) {
    throw new ApiError(404, 'Utilisateur non trouvé');
  }

  // Prevent admin from deleting themselves if they want
  if (req.user._id.toString() === userId) {
    throw new ApiError(400, 'Vous ne pouvez pas supprimer votre propre compte administrateur depuis cette interface');
  }

  console.log(`Performing permanent hard delete for user: ${userId} (${user.role})`);

  try {
    // 1. If owner, delete all their properties
    if (user.role === 'owner') {
      const userProperties = await Property.find({ owner: userId });
      const propertyIds = userProperties.map(p => p._id);
      
      // Delete properties
      await Property.deleteMany({ owner: userId });
      
      // Delete rental requests related to those properties
      await RentalRequest.deleteMany({ property: { $in: propertyIds } });
      
      // Delete contracts related to those properties
      await Contract.deleteMany({ property: { $in: propertyIds } });
    }

    // 2. If tenant, delete their rental requests
    if (user.role === 'tenant') {
      await RentalRequest.deleteMany({ tenant: userId });
      await Contract.deleteMany({ tenant: userId });
    }

    // 3. Delete common user-linked data
    await Promise.all([
      HousingNeed.deleteMany({ user: userId }),
      Notification.deleteMany({ user: userId }),
      Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] }),
      Conversation.deleteMany({ participants: userId }),
      FurnitureChangeRequest.deleteMany({ $or: [{ requester: userId }, { owner: userId }] }),
      FurnitureOrder.deleteMany({ tenant: userId })
    ]);

    // 4. Finally, delete the user record permanently
    await User.findByIdAndDelete(userId);

    res.send({ 
      message: 'Utilisateur et toutes ses données associées ont été supprimés définitivement du système',
      deletedId: userId
    });
  } catch (error) {
    console.error('Error during hard delete:', error);
    throw new ApiError(500, 'Une erreur est survenue lors de la suppression permanente des données');
  }
});

module.exports = {
  getUsers,
  getAdminStats,
  updateUser,
  deleteUser
};
