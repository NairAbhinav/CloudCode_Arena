const mongoose = require('mongoose');

let isConnected = false;

async function connectDB(customUri) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  let mongoUri =
    customUri ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/cloudcode_arena';

  const options = {
    autoIndex: true,
    serverSelectionTimeoutMS: 3000,
    connectTimeoutMS: 5000,
    maxPoolSize: 10
  };

  try {
    const conn = await mongoose.connect(mongoUri, options);
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.name} (${conn.connection.host})`);
    return conn.connection;
  } catch (error) {
    // If connection failed using Docker internal hostname 'mongodb', fallback to localhost/127.0.0.1
    if (mongoUri.includes('mongodb://mongodb:')) {
      const fallbackUri = mongoUri.replace('mongodb://mongodb:', 'mongodb://127.0.0.1:');
      console.log(`[MongoDB] Docker internal host unreachable from host environment, retrying with ${fallbackUri}...`);
      try {
        const conn = await mongoose.connect(fallbackUri, options);
        isConnected = true;
        console.log(`[MongoDB] Connected successfully to: ${conn.connection.name} (${conn.connection.host})`);
        return conn.connection;
      } catch (fallbackErr) {
        console.error(`[MongoDB] Fallback connection error to ${fallbackUri}:`, fallbackErr.message);
      }
    }

    console.error(`[MongoDB] Connection error to ${mongoUri}:`, error.message);
    throw error;
  }
}

async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[MongoDB] Disconnected');
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};
