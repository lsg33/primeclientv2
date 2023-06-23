import kvjs from '@heyputer/kv.js';
import Redis from 'ioredis';
import safety from './safety';

const memkv = new kvjs();

const redis = safety.env.USE_REDIS ? new Redis(safety.env.REDIS_URL) : null;

class KV {
    async get(key: string): Promise<any> {
        return safety.env.USE_REDIS ? redis?.get(key) : memkv.get(key);
    }

    async set(key: string, value: any): Promise<boolean> {
        const set = safety.env.USE_REDIS ? await redis?.set(key, value) : memkv.set(key, value);
        return set === 'OK';
    }
}

export default new KV();