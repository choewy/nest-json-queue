export abstract class Producer {
  abstract add(count: number): Promise<string>;
}
