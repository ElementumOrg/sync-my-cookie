import { MutationEvent, Storage } from 'kevast/dist/Storage';
export declare class KevastChromeSync implements Storage {
    mutate(event: MutationEvent): Promise<void>;
    get(key: string): Promise<string | undefined>;
}
export declare class KevastChromeLocal implements Storage {
    mutate(event: MutationEvent): Promise<void>;
    get(key: string): Promise<string | undefined>;
}
