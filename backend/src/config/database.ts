import mongoose from 'mongoose';
import { env } from './env.js';

let lastConnectionError: string | null = null;

export async function connectDatabase(): Promise<boolean> {
  if (!env.MONGODB_URI) {
    console.log('ℹ️ No MONGODB_URI configured. Running in memory / offline mode.');
    return false;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    lastConnectionError = null;
    console.log('✅ MongoDB connected successfully to:', mongoose.connection.name);

    // Auto-clean obsolete indexes that cause E11000 crashes (e.g. legacy internalPaymentId_1, idempotencyKey_1)
    try {
      const collections = await mongoose.connection.db?.listCollections().toArray();
      const paymentsCollectionExists = collections?.some((c) => c.name === 'payments');
      if (paymentsCollectionExists) {
        const paymentsCollection = mongoose.connection.db?.collection('payments');
        const indexes = await paymentsCollection?.indexes();
        const hasLegacyIndex = indexes?.some((idx) => idx.name === 'internalPaymentId_1');
        if (hasLegacyIndex) {
          console.log('🧹 Dropping stale legacy index internalPaymentId_1 from payments collection...');
          await paymentsCollection?.dropIndex('internalPaymentId_1');
          console.log('✅ Legacy index internalPaymentId_1 dropped successfully.');
        }
      }

      const ledgerCollectionExists = collections?.some((c) => c.name === 'financialledgerentries');
      if (ledgerCollectionExists) {
        const ledgerCollection = mongoose.connection.db?.collection('financialledgerentries');
        const indexes = await ledgerCollection?.indexes();
        const hasIdempotencyIndex = indexes?.some((idx) => idx.name === 'idempotencyKey_1');
        if (hasIdempotencyIndex) {
          console.log('🧹 Dropping stale legacy index idempotencyKey_1 from financialledgerentries collection...');
          await ledgerCollection?.dropIndex('idempotencyKey_1');
          console.log('✅ Legacy index idempotencyKey_1 dropped successfully.');
        }
      }
    } catch (cleanupErr) {
      console.warn('Non-fatal index cleanup notice:', cleanupErr);
    }

    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database connection error';
    lastConnectionError = message;
    console.warn(`⚠️ MongoDB connection to ${env.MONGODB_URI} failed (${message}).`);

    if (env.NODE_ENV !== 'production') {
      try {
        console.log('🔄 Spinning up in-memory MongoDB development server...');
        const memModule = 'mongodb-memory-server';
        const { MongoMemoryServer } = (await import(/* @vite-ignore */ memModule)) as any;
        const memServer = await MongoMemoryServer.create();
        const uri = memServer.getUri();
        await mongoose.connect(uri);
        lastConnectionError = null;
        console.log('✅ In-memory MongoDB connected successfully for development!');
        return true;
      } catch (memErr) {
        console.warn('Could not start in-memory MongoDB:', memErr);
      }
    }

    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('✅ MongoDB connection closed.');
  }
}

export function getDatabaseStatus(): { status: string; details?: any } {
  if (!env.MONGODB_URI) {
    return { status: 'disabled' };
  }

  const readyState = mongoose.connection.readyState;
  switch (readyState) {
    case 1:
      return {
        status: 'connected',
        details: {
          databaseName: mongoose.connection.name,
          host: mongoose.connection.host,
          port: mongoose.connection.port
        }
      };
    case 2:
      return { status: 'connecting' };
    case 3:
      return { status: 'disconnecting' };
    default:
      return {
        status: 'disconnected',
        details: {
          lastError: lastConnectionError
        }
      };
  }
}
