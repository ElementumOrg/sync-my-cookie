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
class KevastChromeSync {
    mutate(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = [
                ...event.set.map(pair => set('sync', pair)),
                ...event.removed.map(pair => remove('sync', pair[0])),
                event.clear ? clear('sync') : Promise.resolve()
            ];
            yield Promise.all(promises);
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return get('sync', key);
        });
    }
}
exports.KevastChromeSync = KevastChromeSync;
class KevastChromeLocal {
    mutate(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = [
                ...event.set.map(pair => set('local', pair)),
                ...event.removed.map(pair => remove('local', pair[0])),
                event.clear ? clear('local') : Promise.resolve()
            ];
            yield Promise.all(promises);
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return get('local', key);
        });
    }
}
exports.KevastChromeLocal = KevastChromeLocal;
function set(mode, pair) {
    return new Promise(resolve => {
        chrome.storage[mode].set({ [pair.key]: pair.value }, resolve);
    });
}
function get(mode, key) {
    return new Promise(resolve => {
        chrome.storage[mode].get(key, result => resolve(result[key]));
    });
}
function remove(mode, key) {
    return new Promise(resolve => {
        chrome.storage[mode].remove(key, resolve);
    });
}
function clear(mode) {
    return new Promise(resolve => {
        chrome.storage[mode].clear(resolve);
    });
}
