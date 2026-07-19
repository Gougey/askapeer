import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.enableCors({ origin: true }); // dev: the web app calls the API cross-origin
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0'); // bind all interfaces (container/Fly)
  console.log(`Askapeer API listening on http://localhost:${port} (health: /health)`);
}

void bootstrap();
