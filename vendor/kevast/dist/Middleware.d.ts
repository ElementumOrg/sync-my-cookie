import { Pair } from './Pair';
export declare type SimplexMiddleware = (pair: Pair) => void;
export interface DuplexMiddleware {
    afterGet: SimplexMiddleware;
    beforeSet: SimplexMiddleware;
}
