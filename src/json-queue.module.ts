import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { getJsonQueueToken } from './helpers';
import { JsonQueueFactory } from './json-queue.factory';
import { JsonQueueRunner } from './json-queue.runner';
import { JsonQueueModuleAsyncOptions, JsonQueueModuleOptions, JsonQueueModuleProviderMap } from './types';

@Module({})
export class JsonQueueModule {
  private static createProviderMap(options: Array<JsonQueueModuleOptions | JsonQueueModuleAsyncOptions>): JsonQueueModuleProviderMap {
    const providerMap: JsonQueueModuleProviderMap = {
      imports: [DiscoveryModule],
      providers: [JsonQueueRunner, JsonQueueFactory],
      exports: [],
    };

    for (const option of options) {
      const provide = getJsonQueueToken(option.name);

      const provider: Provider =
        'useFactory' in option
          ? {
              provide,
              inject: [JsonQueueFactory, ...(option.inject ?? [])],
              useFactory: async (queueFactory: JsonQueueFactory, ...args: unknown[]) => {
                const queueOptions = await option.useFactory(...args);

                return queueFactory.create(option.name, queueOptions);
              },
            }
          : {
              provide,
              inject: [JsonQueueFactory],
              useFactory: (queueFactory: JsonQueueFactory) => {
                return queueFactory.create(option.name, option.options);
              },
            };

      providerMap.providers.push(provider);
      providerMap.exports.push(provide);
    }

    return providerMap;
  }

  static forRoot(options: JsonQueueModuleOptions[]): DynamicModule {
    const providerMap = this.createProviderMap(options);

    return {
      global: true,
      module: JsonQueueModule,
      ...providerMap,
    };
  }

  static forRootAsync(options: JsonQueueModuleAsyncOptions[]): DynamicModule {
    const providerMap = this.createProviderMap(options);

    return {
      global: true,
      module: JsonQueueModule,
      ...providerMap,
    };
  }

  static register(options: JsonQueueModuleOptions[]): DynamicModule {
    const providerMap = this.createProviderMap(options);

    return {
      global: false,
      module: JsonQueueModule,
      ...providerMap,
    };
  }

  static registerAsync(options: JsonQueueModuleAsyncOptions[]): DynamicModule {
    const providerMap = this.createProviderMap(options);

    return {
      global: false,
      module: JsonQueueModule,
      ...providerMap,
    };
  }
}
