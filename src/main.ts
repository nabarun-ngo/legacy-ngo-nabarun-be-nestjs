import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { applyConfig,config } from "./config/app.config";
import { AppLogger } from "./shared/utilities/trace-context.util";

async function bootstrap() {
  console.time("BOOT");
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger(config.app.logLevel),
    bufferLogs: true,
  });
  console.timeEnd("BOOT");
  console.time("CONFIG");
  applyConfig(app);
  console.timeEnd("CONFIG");
  console.time("LISTEN");
  await app.listen(config.app.port, "0.0.0.0");
  console.timeEnd("LISTEN");
  console.log(
    `Application is running on: ${await app.getUrl()} - Environment: ${config.app.environment} - Port: ${config.app.port}`,
  );
  if (!config.app.isProd) {
    console.log(`Swagger documentation (UI): ${await app.getUrl()}/swagger-ui`);
    console.log(`Swagger documentation (API): ${await app.getUrl()}/api/docs`);
  }
}
bootstrap();
