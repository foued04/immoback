const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const PropertySchema = new mongoose.Schema({}, { strict: false });
const Property = mongoose.model('Property', PropertySchema);

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const lastProperty = await Property.findOne().sort({ createdAt: -1 });
    
    if (!lastProperty) {
      console.log('No properties found');
      return;
    }

    console.log('Last Property ID:', lastProperty._id);
    console.log('Title:', lastProperty.title);
    console.log('Images Object:', JSON.stringify(lastProperty.images, null, 2));
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

check();
