import { SetMetadata } from "@nestjs/common";

export const USE_API_KEY = "useApiKey";
export const UseApiKey = () => SetMetadata(USE_API_KEY, true);
