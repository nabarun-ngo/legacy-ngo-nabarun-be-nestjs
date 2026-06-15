import { Injectable,Logger,OnApplicationBootstrap } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import {
IReportProvider,
REPORT_PROVIDER_METADATA_KEY,
} from "../../domain/reporting.interface";

@Injectable()
export class ReportRegistryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ReportRegistryService.name);
  private readonly providers = new Map<string, IReportProvider>();

  constructor(private readonly discoveryService: DiscoveryService) {}

  onApplicationBootstrap() {
    this.autoRegister();
  }

  private autoRegister() {
    this.logger.log("Starting auto-registration of report providers...");
    const providers = this.discoveryService.getProviders();
    let registeredCount = 0;

    providers.forEach((wrapper) => {
      const { instance } = wrapper;
      if (!instance || typeof instance !== "object") {
        return;
      }

      const isReportProvider = Reflect.getMetadata(
        REPORT_PROVIDER_METADATA_KEY,
        instance.constructor,
      );

      if (isReportProvider) {
        this.logger.log(
          `Discovered @ReportProvider: ${instance.constructor.name}`,
        );
        this.register(instance as IReportProvider);
        registeredCount++;
      }
    });

    this.logger.log(
      `Auto-registration complete. Successfully registered ${registeredCount} report providers.`,
    );
  }

  register(provider: IReportProvider) {
    this.logger.log(`Registering report provider: ${provider.reportCode}`);
    if (this.providers.has(provider.reportCode)) {
      this.logger.warn(
        `Report provider ${provider.reportCode} is already registered. Overwriting.`,
      );
    }
    this.providers.set(provider.reportCode, provider);
  }

  getProvider(reportCode: string): IReportProvider | undefined {
    return this.providers.get(reportCode);
  }

  getAllProviders(): IReportProvider[] {
    return Array.from(this.providers.values());
  }
}
