const mongoose = require('mongoose');
require('dotenv').config();

// Require models to ensure they are registered
const User = require('./src/models/User.model');
const Property = require('./src/models/Property.model');
require('./src/models/RentalRequest.model'); // Ensure registration
const RentalRequest = mongoose.model('RentalRequest');

const checkDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/immosmart';
    await mongoose.connect(mongoUri);
    
    console.log('Connected to DB');
    
    const users = await User.find();
    console.log(`\n--- USERS (${users.length}) ---`);
    users.forEach(u => console.log(`${u._id} | ${u.email} | ${u.role}`));

    const properties = await Property.find();
    console.log(`\n--- PROPERTIES (${properties.length}) ---`);
    properties.forEach(p => console.log(`${p._id} | ${p.title} | Owner: ${p.owner}`));

    const requests = await RentalRequest.find();
    console.log(`\n--- RENTAL REQUESTS (${requests.length}) ---`);
    requests.forEach(r => console.log(`${r._id} | Property: ${r.property} | Tenant: ${r.tenant} | Status: ${r.status}`));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

checkDB();
