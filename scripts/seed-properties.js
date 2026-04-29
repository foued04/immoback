const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User.model');
const Property = require('../src/models/Property.model');

const demoOwners = [
  {
    fullName: 'Mohamed Ben Ali',
    email: 'mohamed.benali@immosmart.tn',
    phone: '+21673461234',
  },
  {
    fullName: 'Fatima Trabelsi',
    email: 'fatima.trabelsi@immosmart.tn',
    phone: '+21673520456',
  },
  {
    fullName: 'Ahmed Karim',
    email: 'ahmed.karim@immosmart.tn',
    phone: '+21673348999',
  },
  {
    fullName: 'Leila Sassi',
    email: 'leila.sassi@immosmart.tn',
    phone: '+21673505678',
  },
];

const demoProperties = [
  {
    ownerEmail: 'mohamed.benali@immosmart.tn',
    title: 'Appartement Moderne S+2 Centre Monastir',
    description: 'Magnifique appartement S+2 renove avec finitions modernes, proche des commerces et des transports. Ideal pour un couple ou une petite famille.',
    city: 'Monastir',
    department: 'Monastir',
    address: '15 Avenue Habib Bourguiba, Monastir 5000',
    rent: 800,
    deposit: 1600,
    type: 's2',
    surface: 85,
    bedrooms: 2,
    bathrooms: 1,
    livingRooms: 1,
    equippedKitchen: true,
    balcony: true,
    parking: true,
    meuble: true,
    availability: '2026-05-01',
    status: 'available',
    moderationStatus: 'approved',
    images: {
      cover: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=900&fit=crop',
      kitchen: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=900&fit=crop',
      bathroom: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&h=900&fit=crop',
      bedroom: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&h=900&fit=crop',
      livingRoom: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=900&fit=crop',
      exterior: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=900&fit=crop',
      gallery: [],
    },
  },
  {
    ownerEmail: 'fatima.trabelsi@immosmart.tn',
    title: 'Studio S+0 Vue Mer Skanes',
    description: 'Studio lumineux avec balcon et vue mer dans la zone touristique de Skanes. Ideal pour etudiant ou jeune professionnel.',
    city: 'Monastir',
    department: 'Monastir',
    address: 'Residence Marina, Zone Touristique Skanes, Monastir 5060',
    rent: 450,
    deposit: 900,
    type: 's0',
    surface: 35,
    bedrooms: 0,
    bathrooms: 1,
    livingRooms: 1,
    equippedKitchen: true,
    balcony: true,
    parking: false,
    meuble: true,
    availability: '2026-05-10',
    status: 'available',
    moderationStatus: 'approved',
    images: {
      cover: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=900&fit=crop',
      kitchen: 'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=1200&h=900&fit=crop',
      bathroom: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=1200&h=900&fit=crop',
      bedroom: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&h=900&fit=crop',
      livingRoom: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=1200&h=900&fit=crop',
      exterior: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=900&fit=crop',
      gallery: [],
    },
  },
  {
    ownerEmail: 'ahmed.karim@immosmart.tn',
    title: 'Villa avec Piscine - Falaise Monastir',
    description: 'Villa haut standing avec piscine privee, grand jardin et espaces de vie ouverts. Convient parfaitement a une famille a la recherche de confort.',
    city: 'Monastir',
    department: 'Monastir',
    address: 'Villa 12, Residence Les Oliviers, Falaise Monastir 5000',
    rent: 3500,
    deposit: 7000,
    type: 'villa',
    surface: 350,
    bedrooms: 4,
    bathrooms: 3,
    livingRooms: 2,
    equippedKitchen: true,
    balcony: true,
    parking: true,
    meuble: true,
    availability: '2026-06-01',
    status: 'available',
    moderationStatus: 'approved',
    images: {
      cover: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&h=900&fit=crop',
      kitchen: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=900&fit=crop',
      bathroom: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&h=900&fit=crop',
      bedroom: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&h=900&fit=crop',
      livingRoom: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&h=900&fit=crop',
      exterior: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=900&fit=crop',
      gallery: [],
    },
  },
  {
    ownerEmail: 'leila.sassi@immosmart.tn',
    title: 'Appartement S+1 avec Vue Marina - Monastir',
    description: 'Superbe S+1 sur la marina de Monastir avec salon lumineux, cuisine equipee et belle vue degagee. Parfait pour une location longue duree.',
    city: 'Monastir',
    department: 'Monastir',
    address: 'Residence Cap Marina, Port de Plaisance, Monastir 5000',
    rent: 1100,
    deposit: 2200,
    type: 's1',
    surface: 90,
    bedrooms: 1,
    bathrooms: 1,
    livingRooms: 1,
    equippedKitchen: true,
    balcony: true,
    parking: true,
    meuble: true,
    availability: '2026-05-20',
    status: 'available',
    moderationStatus: 'approved',
    images: {
      cover: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&h=900&fit=crop',
      kitchen: 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=1200&h=900&fit=crop',
      bathroom: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&h=900&fit=crop',
      bedroom: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=1200&h=900&fit=crop',
      livingRoom: 'https://images.unsplash.com/photo-1598928506311-c55ece362a1e?w=1200&h=900&fit=crop',
      exterior: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&h=900&fit=crop',
      gallery: [],
    },
  },
];

async function ensureOwner(owner) {
  const hashedPassword = await bcrypt.hash('Owner123!', 10);
  let user = await User.findOne({ email: owner.email });

  if (!user) {
    user = await User.create({
      fullName: owner.fullName,
      email: owner.email,
      password: hashedPassword,
      role: 'owner',
      phone: owner.phone,
      isEmailVerified: true,
      isSuspended: false,
    });
    console.log(`Created owner: ${owner.email}`);
    return user;
  }

  user.fullName = owner.fullName;
  user.phone = owner.phone;
  user.role = 'owner';
  user.isEmailVerified = true;
  user.isSuspended = false;
  await user.save();
  console.log(`Updated owner: ${owner.email}`);
  return user;
}

async function seedProperties() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing from backend/.env');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const ownersByEmail = {};
  for (const owner of demoOwners) {
    const user = await ensureOwner(owner);
    ownersByEmail[owner.email] = user;
  }

  for (const propertyData of demoProperties) {
    const owner = ownersByEmail[propertyData.ownerEmail];
    const existingProperty = await Property.findOne({
      title: propertyData.title,
      address: propertyData.address,
    });

    if (existingProperty) {
      Object.assign(existingProperty, {
        ...propertyData,
        owner: owner._id,
      });
      await existingProperty.save();
      console.log(`Updated property: ${propertyData.title}`);
      continue;
    }

    await Property.create({
      ...propertyData,
      owner: owner._id,
    });
    console.log(`Created property: ${propertyData.title}`);
  }
}

seedProperties()
  .catch((error) => {
    console.error('Failed to seed example properties:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
