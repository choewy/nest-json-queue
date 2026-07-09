import { Abstract, DynamicModule, ForwardReference, InjectionToken, OptionalFactoryDependency, Provider } from '@nestjs/common';

export type JsonQueueOptions = {
  basePath?: string;
  maxAttempts?: number;
  processingTimeout?: number;
  lockTimeout?: number;
  lockRetryDelay?: number;
  completedLimit?: number;
  failedLimit?: number;
};

export type JsonQueueModuleOptions = {
  name: string;
  options: JsonQueueOptions;
};

export type JsonQueueModuleAsyncOptions = {
  name: string;
  inject?: (InjectionToken | OptionalFactoryDependency)[];
  useFactory(...args: unknown[]): JsonQueueOptions | Promise<JsonQueueOptions>;
};

export type JsonQueueModuleProviderMap = {
  imports: any[];
  providers: Provider[];
  exports: (string | symbol | Provider | Abstract<unknown> | DynamicModule | ForwardReference<unknown>)[];
};
