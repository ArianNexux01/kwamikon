import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Em desenvolvimento o Vite pode subir em várias portas (5173, 5174, ...)
  // se a porta padrão estiver ocupada; aceitamos qualquer porta em
  // localhost/127.0.0.1 além da origem explícita definida em produção.
  const configuredOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin === configuredOrigin || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origem não permitida por CORS.'), false);
      }
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');

  const port = config.get<number>('PORT', 3333);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Kwamikon Nexus API a correr em http://localhost:${port}/api`);
}
bootstrap();
