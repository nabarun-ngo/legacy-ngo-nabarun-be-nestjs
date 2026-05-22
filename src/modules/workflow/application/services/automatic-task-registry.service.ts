import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { AUTOMATIC_TASK_HANDLER_METADATA_KEY, IAutomaticTaskHandler } from '../automatic-task-handlers/automatic-task-handler.interface';

@Injectable()
export class AutomaticTaskRegistryService implements OnApplicationBootstrap {
    private readonly logger = new Logger(AutomaticTaskRegistryService.name);
    private readonly handlers = new Map<string, IAutomaticTaskHandler>();

    constructor(private readonly discoveryService: DiscoveryService) { }

    onApplicationBootstrap() {
        this.autoRegister();
    }

    private autoRegister() {
        this.logger.log('Starting auto-registration of workflow task handlers...');
        const providers = this.discoveryService.getProviders();
        let registeredCount = 0;

        providers.forEach((wrapper) => {
            const { instance } = wrapper;
            if (!instance || typeof instance !== 'object') {
                return;
            }

            const handlerName = Reflect.getMetadata(
                AUTOMATIC_TASK_HANDLER_METADATA_KEY,
                instance.constructor,
            );

            if (handlerName) {
                this.logger.log(`Discovered @AutomaticTaskHandler: ${handlerName} (${instance.constructor.name})`);
                this.register(instance as IAutomaticTaskHandler, handlerName);
                registeredCount++;
            }
        });

        this.logger.log(`Auto-registration complete. Successfully registered ${registeredCount} task handlers.`);
    }

    private register(handler: IAutomaticTaskHandler, handlerName: string) {
        if (this.handlers.has(handlerName)) {
            this.logger.warn(`Task handler ${handlerName} is already registered. Overwriting.`);
        }
        this.handlers.set(handlerName, handler);
    }

    getHandler(handlerName: string): IAutomaticTaskHandler | undefined {
        return this.handlers.get(handlerName);
    }

    getAllHandlers(): IAutomaticTaskHandler[] {
        return Array.from(this.handlers.values());
    }
}
