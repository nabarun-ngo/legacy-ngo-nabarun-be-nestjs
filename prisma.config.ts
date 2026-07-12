import { defineConfig, env } from "prisma/config";
import "dotenv/config";
import { Configkey } from "./src/shared/config-keys";

export default defineConfig({
    schema: "prisma/",
    migrations: {
        path: "prisma/migrations",
        seed: "tsx prisma/seed.ts",
    },
    datasource: {
        url: env(Configkey.POSTGRES_URL),
    },
});