import { DuplexMiddleware } from 'kevast/dist/Middleware';
import { Pair } from 'kevast/dist/Pair';
export declare class KevastEncrypt implements DuplexMiddleware {
    static randomString(length?: number): string;
    private password;
    constructor(password: string);
    afterGet(pair: Pair): void;
    beforeSet(pair: Pair): void;
}
