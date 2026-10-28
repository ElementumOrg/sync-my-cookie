import { DuplexMiddleware, SimplexMiddleware } from './Middleware';
import { Pair } from './Pair';
import { Storage } from './Storage';
interface Options {
    backwardUpdate?: boolean;
}
export declare class Kevast {
    afterGet: {
        use: (middleware: SimplexMiddleware) => void;
    };
    beforeSet: {
        use: (middleware: SimplexMiddleware) => void;
    };
    private storages;
    private middlewares;
    private options;
    constructor(...storages: Storage[]);
    use(middleware: DuplexMiddleware): Kevast;
    add(storage: Storage): Kevast;
    config(options: Options): void;
    clear(): Promise<void>;
    remove(key: string): Promise<void>;
    bulkRemove(keys: string[]): Promise<void>;
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string | undefined): Promise<void>;
    bulkSet(pairs: Pair[]): Promise<void>;
}
export {};
