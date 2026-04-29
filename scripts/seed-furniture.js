const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User.model');
const Property = require('../src/models/Property.model');
const Furniture = require('../src/models/Furniture.model');
const FurnitureOrder = require('../src/models/FurnitureOrder.model');
const FurnitureChangeRequest = require('../src/models/FurnitureChangeRequest.model');

const MONGO_URI = 'mongodb://localhost:27017/immosmart-pfe';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Property.deleteMany({});
    await Furniture.deleteMany({});
    await FurnitureOrder.deleteMany({});
    await FurnitureChangeRequest.deleteMany({});
    console.log('Cleared existing data');

    // 1. Create Users
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const owner = await User.create({
      fullName: 'Mohamed Ben Ali',
      email: 'mohamed.benali@email.com',
      password: hashedPassword,
      role: 'owner',
      phone: '+216 73 461 234',
      isEmailVerified: true
    });

    const tenant = await User.create({
      fullName: 'Khalil Mansour',
      email: 'khalil.mansour@email.com',
      password: hashedPassword,
      role: 'tenant',
      phone: '+216 22 987 654',
      isEmailVerified: true
    });

    console.log('Users created');

    // 2. Create Furniture Catalog
    const furnitureItems = [
      {
        name: 'Canapé Scandinave',
        category: 'Salon',
        price: 1200,
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop',
        description: 'Canapé 3 places gris clair, style scandinave.',
        status: 'approved'
      },
      {
        name: 'Lit King Size',
        category: 'Chambre',
        price: 1800,
        image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=300&fit=crop',
        description: 'Lit double avec tête de lit capitonnée.',
        status: 'approved'
      },
      {
        name: 'Table à manger en chêne',
        category: 'Salle à manger',
        price: 950,
        image: 'https://images.unsplash.com/photo-1530018607912-eff2df114f11?w=400&h=300&fit=crop',
        description: 'Table rectangulaire pour 6 personnes.',
        status: 'approved'
      },
      {
        name: 'Cuisine équipée moderne',
        category: 'Cuisine',
        price: 4500,
        image: 'https://images.unsplash.com/photo-1556911223-05a0342fb58f?w=400&h=300&fit=crop',
        description: 'Ensemble de cuisine complet avec électroménager.',
        status: 'approved'
      }
    ];

    const createdFurniture = await Furniture.insertMany(furnitureItems);
    console.log('Furniture catalog created');

    // 3. Create Property
    const property = await Property.create({
      _id: new mongoose.Types.ObjectId('661fef1c8c8c8c8c8c8c8c8c'), // Fixed ID for consistency
      title: 'Villa Luxe S+4 Khnis',
      description: 'Somptueuse villa de standing avec piscine privée et jardin paysager. 4 chambres spacieuses, salon double hauteur, cuisine équipée dernier cri. Sécurisée.',
      city: 'Monastir',
      address: 'Zone Résidentielle, Khnis 5036',
      rent: 1500,
      deposit: 3000,
      type: 'villa',
      surface: 350,
      bedrooms: 4,
      bathrooms: 3,
      livingRooms: 2,
      equippedKitchen: true,
      balcony: true,
      parking: true,
      meuble: true,
      owner: owner._id,
      images: {
        cover: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
        kitchen: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop'
      },
      status: 'available',
      moderationStatus: 'approved',
      furnishing: {
        type: 'Meublé',
        level: 'Premium',
        estimatedTotalValue: 15000,
        items: [
          {
            name: 'Table de jardin',
            category: 'Extérieur',
            condition: 'Neuf',
            quantity: 1,
            estimatedPrice: 600,
            description: 'Table en rotin avec 4 chaises'
          }
        ]
      }
    });

    console.log('Property created');

    // 4. Create a Furniture Order (Voucher)
    const orderId = new mongoose.Types.ObjectId();
    const furnitureOrder = await FurnitureOrder.create({
      _id: orderId,
      property: property._id,
      tenant: tenant._id,
      owner: owner._id,
      items: [
        {
          furniture: createdFurniture[0]._id,
          quantity: 1,
          price: createdFurniture[0].price
        },
        {
          furniture: createdFurniture[1]._id,
          quantity: 2,
          price: createdFurniture[1].price
        }
      ],
      total: createdFurniture[0].price + (createdFurniture[1].price * 2),
      status: 'Confirmé',
      paymentMethod: 'cash'
    });

    console.log('Furniture order created');

    console.log('Seeding completed successfully!');
    console.log('Property ID:', property._id);
    console.log('Owner email:', owner.email);
    console.log('Tenant email:', tenant.email);
    console.log('Password for all users: password123');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
