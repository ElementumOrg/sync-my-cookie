import { Pair } from './Pair';
export interface MutationEvent {
    set: Pair[];
    removed: string[];
    clear: boolean;
}
export interface Storage {
    mutate: (event: MutationEvent) => Promise<void> | void;
    get: (key: string) => Promise<string | undefined> | (string | undefined);
}
