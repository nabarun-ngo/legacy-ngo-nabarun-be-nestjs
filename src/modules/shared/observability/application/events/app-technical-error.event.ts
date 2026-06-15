import { ErrorResponse } from "src/shared/models/response-model";

export class AppTechnicalError {
  constructor(public error: ErrorResponse | Error) {}
}
