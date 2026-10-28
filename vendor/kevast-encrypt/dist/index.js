"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Used by forgePbe
require('node-forge/lib/md5');
const forgePbe = require('node-forge/lib/pbe');
const forgeUtil = require('node-forge/lib/util');
const forgeCipher = require('node-forge/lib/cipher');
class KevastEncrypt {
    static randomString(length = 32) {
        let result = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < length; i++) {
            result += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return result;
    }
    constructor(password) {
        if (typeof password !== 'string') {
            throw new TypeError('Password must be a string.');
        }
        this.password = password;
    }
    afterGet(pair) {
        if (typeof pair.value === 'string') {
            const decrypted = decrypt(pair.value, this.password);
            pair.value = decrypted;
        }
    }
    beforeSet(pair) {
        const encrypted = encrypt(pair.value, this.password);
        pair.value = encrypted;
    }
}
exports.KevastEncrypt = KevastEncrypt;
// AES 128 CBC
function encrypt(plain, password) {
    const input = Buffer.from(plain);
    // AES 128
    const keySize = 16;
    const ivSize = 16;
    const derivedBytes = forgePbe.opensslDeriveBytes(password, null, keySize + ivSize);
    const buffer = forgeUtil.createBuffer(derivedBytes);
    const key = buffer.getBytes(keySize);
    const iv = buffer.getBytes(ivSize);
    const cipher = forgeCipher.createCipher('AES-CBC', key);
    cipher.start({ iv });
    cipher.update(forgeUtil.createBuffer(input, 'binary'));
    cipher.finish();
    return cipher.output.toHex();
}
function decrypt(text, password) {
    const input = Buffer.from(text, 'hex');
    const inputBuffer = forgeUtil.createBuffer(input, 'binary');
    const keySize = 16;
    const ivSize = 16;
    const derivedBytes = forgePbe.opensslDeriveBytes(password, null, keySize + ivSize);
    const buffer = forgeUtil.createBuffer(derivedBytes);
    const key = buffer.getBytes(keySize);
    const iv = buffer.getBytes(ivSize);
    const decipher = forgeCipher.createDecipher('AES-CBC', key);
    decipher.start({ iv });
    decipher.update(inputBuffer);
    const result = decipher.finish();
    return decipher.output.toString();
}
