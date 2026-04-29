const mongoose = require('mongoose');
const Furniture = require('../src/models/Furniture.model');
const connectDB = require('../src/config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const furnitureCatalog = [
  {
    name: "Canapé Angle Velours Royal",
    category: "Salon",
    price: 1450,
    image: "https://images.unsplash.com/photo-1550254478-ead40ccce451?w=800&h=600&fit=crop",
    description: "Un canapé d'angle majestueux en velours bleu profond, alliant confort absolu et design contemporain. Parfait pour vos soirées détente."
  },
  {
    name: "Table Basse Marbre & Or",
    category: "Salon",
    price: 580,
    image: "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=800&h=600&fit=crop",
    description: "Table basse minimaliste avec plateau en marbre de Carrare véritable et structure en acier brossé doré."
  },
  {
    name: "Meuble TV Noyer Scandinave",
    category: "Salon",
    price: 720,
    image: "https://images.unsplash.com/photo-1593085512500-5d55148d6f0d?w=800&h=600&fit=crop",
    description: "Design épuré en placage noyer massif. Plusieurs compartiments pour ranger tout votre équipement multimédia."
  },
  {
    name: "Fauteuil Relax 'Polaris'",
    category: "Salon",
    price: 890,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop",
    description: "Fauteuil ergonomique avec repose-pieds intégré, idéal pour la lecture ou une sieste improvisée."
  },
  {
    name: "Lit Suite Luxueuse King",
    category: "Chambre",
    price: 2100,
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&h=600&fit=crop",
    description: "Une pièce maîtresse pour votre chambre. Tête de lit capitonnée et matelas à mémoire de forme haute densité."
  },
  {
    name: "Armoire 'Horizon' 3 Portes",
    category: "Chambre",
    price: 1100,
    image: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&h=600&fit=crop",
    description: "Rangement optimal avec penderie intégrée et compartiments à chaussures. Finition chêne clair."
  },
  {
    name: "Table de Chevet 'Moonlight'",
    category: "Chambre",
    price: 180,
    image: "https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=800&h=600&fit=crop",
    description: "Lignes douces et rangement tiroir discret. Parfait pour poser votre lecture du soir."
  },
  {
    name: "Table à Manger 'Gourmet' 8 Places",
    category: "Salle à manger",
    price: 1250,
    image: "https://images.unsplash.com/photo-1530018607912-eff2df114f11?w=800&h=600&fit=crop",
    description: "Grande table familiale en chêne massif huilé. Idéale pour les réceptions et les moments partagés."
  },
  {
    name: "Chaises Velours (Set de 6)",
    category: "Salle à manger",
    price: 750,
    image: "https://images.unsplash.com/photo-1581428982868-e410dd047a90?w=800&h=600&fit=crop",
    description: "Chaises ultra-confortables avec pieds en métal noir. Assise moelleuse pour des repas prolongés."
  },
  {
    name: "Cuisine Premium Intégrée",
    category: "Cuisine",
    price: 5200,
    image: "https://images.unsplash.com/photo-1556911223-e4524c13c470?w=800&h=600&fit=crop",
    description: "Ensemble complet avec îlot central et plans de travail en quartz. Alliez esthétique et fonctionnalité."
  },
  {
    name: "Pack Électroménager 'Chef'",
    category: "Cuisine",
    price: 3800,
    image: "https://images.unsplash.com/photo-1556912177-3e5fa00e70b3?w=800&h=600&fit=crop",
    description: "Réfrigérateur américain, Four pyrolyse et Plaque induction haute performance."
  },
  {
    name: "Tapis Berbère Artisanal",
    category: "Décoration",
    price: 420,
    image: "https://images.unsplash.com/photo-1531835551805-16d864c8d311?w=800&h=600&fit=crop",
    description: "Tapis fait main aux motifs géométriques élégants. Apporte chaleur et authenticité à votre sol."
  },
  {
    name: "Miroir Soleil Doré",
    category: "Décoration",
    price: 210,
    image: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=800&h=600&fit=crop",
    description: "Miroir décoratif en forme de soleil. Idéal pour agrandir visuellement votre entrée ou salon."
  },
  {
    name: "Lampadaire 'Arc' Design",
    category: "Décoration",
    price: 320,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed657db991?w=800&h=600&fit=crop",
    description: "Éclairage d'ambiance ajustable avec pied en marbre lesté. Une touche de modernité pour votre coin lecture."
  },
  {
    name: "Bureau d'Angle 'Pro-Workspace'",
    category: "Bureau",
    price: 680,
    image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&h=600&fit=crop",
    description: "Espace de travail optimisé avec gestion des câbles intégrée. Parfait pour le télétravail productif."
  },
  {
    name: "Chaise Pivotante Ergonomique",
    category: "Bureau",
    price: 450,
    image: "https://images.unsplash.com/photo-1505843490701-5be5d2b13297?w=800&h=600&fit=crop",
    description: "Soutien lombaire ajustable et accoudoirs 4D. Le confort ultime pour de longues heures de travail."
  },
  {
    name: "Bibliothèque 'Pyramide'",
    category: "Bureau",
    price: 540,
    image: "https://images.unsplash.com/photo-1594620302200-9a7622d4a13c?w=800&h=600&fit=crop",
    description: "Étagères ouvertes au design asymétrique pour vos livres et objets d'art."
  }
];

const seedDB = async () => {
  try {
    await connectDB();
    await Furniture.deleteMany({});
    await Furniture.insertMany(furnitureCatalog);
    console.log("Database seeded with furniture!");
  } catch (error) {
    console.error("Error seeding furniture:", error);
  } finally {
    process.exit();
  }
};

seedDB();
