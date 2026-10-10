import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

async function startServer() {
  console.log('🚀 Starting Kampus.VC API Gateway...');
  
  // Attempt database connection (gracefully non-blocking)
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`✨ Kampus.VC API running on http://localhost:${env.PORT}`);
    console.log(`📡 Health endpoint: http://localhost:${env.PORT}/api/health`);
    console.log(`🌐 Allowed frontend origin: ${env.FRONTEND_ORIGIN}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down server gracefully...`);
    server.close(async () => {
      console.log('✅ HTTP server closed.');
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('❌ Failed to start Kampus.VC server:', err);
  process.exit(1);
});
