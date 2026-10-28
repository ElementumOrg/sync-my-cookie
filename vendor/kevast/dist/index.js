"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class Kevast {
    constructor(...storages) {
        this.afterGet = {
            use: (middleware) => {
                this.use({
                    afterGet: middleware,
                    beforeSet: () => { },
                });
            },
        };
        this.beforeSet = {
            use: (middleware) => {
                this.use({
                    afterGet: () => { },
                    beforeSet: middleware,
                });
            },
        };
        this.storages = storages;
        this.middlewares = [];
        this.options = {
            backwardUpdate: false,
        };
    }
    use(middleware) {
        this.middlewares.push(middleware);
        return this;
    }
    add(storage) {
        this.storages.push(storage);
        return this;
    }
    config(options) {
        Object.assign(this.options, options);
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            const event = {
                clear: true,
                removed: [],
                set: [],
            };
            const promises = this.storages.map((storage) => storage.mutate(event));
            yield Promise.all(promises);
        });
    }
    remove(key) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.bulkRemove([key]);
        });
    }
    bulkRemove(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(keys instanceof Array)) {
                throw new TypeError('Keys must be an array of string');
            }
            for (const key of keys) {
                if (typeof key !== 'string') {
                    throw new TypeError('Key must be a string');
                }
            }
            const event = {
                clear: false,
                removed: keys,
                set: [],
            };
            const promises = this.storages.map((storage) => storage.mutate(event));
            yield Promise.all(promises);
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.storages.length === 0) {
                throw new Error('There must be at least one storage');
            }
            if (typeof key !== 'string') {
                throw new TypeError('Key must be a string');
            }
            let value;
            const missStorages = [];
            for (const storage of this.storages) {
                value = yield storage.get(key);
                if (typeof value !== 'string') {
                    missStorages.push(storage);
                }
                else {
                    break;
                }
            }
            if (this.options.backwardUpdate && typeof value === 'string') {
                const event = {
                    clear: false,
                    removed: [],
                    set: [{ key, value }],
                };
                yield Promise.all(missStorages.map((storage) => storage.mutate(event)));
            }
            const pair = { key, value };
            this.middlewares.forEach((middleware) => middleware.afterGet(pair));
            return pair.value;
        });
    }
    set(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.bulkSet([{ key, value }]);
        });
    }
    bulkSet(pairs) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.storages.length === 0) {
                throw new Error('There must be at least one storage');
            }
            if (!(pairs instanceof Array)) {
                throw new TypeError('Pairs must be a array of pair');
            }
            for (const pair of pairs) {
                if (typeof pair.key !== 'string') {
                    throw TypeError('Key must be string');
                }
                if (typeof pair.value !== 'string' && pair.value !== undefined) {
                    throw TypeError('Value must be string');
                }
            }
            const set = pairs.filter((pair) => !!pair.value).map((pair) => {
                const newPair = { key: pair.key, value: pair.value };
                this.middlewares.forEach((middleware) => middleware.beforeSet(newPair));
                return newPair;
            });
            const removed = pairs.filter((pair) => !pair.value).map((pair) => pair.key);
            const event = {
                clear: false,
                removed,
                set,
            };
            const promises = this.storages.map((storage) => storage.mutate(event));
            yield Promise.all(promises);
        });
    }
}
exports.Kevast = Kevast;
