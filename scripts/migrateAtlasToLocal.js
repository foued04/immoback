const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const atlasUri = process.env.ATLAS_MONGO_URI;
const localUri = process.env.MONGO_URI;

async function migrate() {
  if (!atlasUri) {
    throw new Error('ATLAS_MONGO_URI is required for migration');
  }

  if (!localUri) {
    throw new Error('MONGO_URI is required for local migration target');
  }

  const atlasConn = await mongoose.createConnection(atlasUri).asPromise();
  const localConn = await mongoose.createConnection(localUri).asPromise();

  try {
    const collections = await atlasConn.db
      .listCollections({}, { nameOnly: true })
      .toArray();

    const userCollections = collections
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith('system.'));

    if (userCollections.length === 0) {
      console.log('No Atlas collections found to migrate.');
      return;
    }

    console.log(`Found ${userCollections.length} collection(s): ${userCollections.join(', ')}`);

    for (const collectionName of userCollections) {
      const atlasCollection = atlasConn.db.collection(collectionName);
      const localCollection = localConn.db.collection(collectionName);

      const docs = await atlasCollection.find({}).toArray();
      await localCollection.deleteMany({});

      if (docs.length > 0) {
        await localCollection.insertMany(docs, { ordered: false });
      }

      console.log(`Migrated ${docs.length} document(s) from ${collectionName}`);
    }

    console.log('Atlas to local migration completed successfully.');
  } finally {
    await atlasConn.close();
    await localConn.close();
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
