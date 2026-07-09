import { DynamicModule, Module, Provider } from '@nestjs/common';

import { getJsonQueueToken } from './helpers';
import { JsonQueueImpl } from './json-queue.impl';
import { JsonQueueModuleAsyncOptions, JsonQueueModuleOptions, JsonQueueModuleProviderMap } from './types';

@Module({})
export class JsonQueueModule {
  private static createProviderMap(options: Array<JsonQueueModuleOptions | JsonQueueModuleAsyncOptions>): JsonQueueModuleProviderMap {
    const providerMap: JsonQueueModuleProviderMap = {
      imports: [],
      providers: [],
      exports: [],
    };

    for (const option of options) {
      const provide = getJsonQueueToken(option.name);
      const provider: Provider =
        'useFactory' in option
          ? {
              provide,
              inject: option.inject,
              useFactory: async (...args: unknown[]) => {
                return new JsonQueueImpl(option.name, await option.useFactory(...args));
              },
            }
          : {
              provide,
              useFactory: () => {
                return new JsonQueueImpl(option.name, option.options);
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
