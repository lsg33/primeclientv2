import kvjs from '@heyputer/kv.js';
import { Redis } from '@upstash/redis';
import safety from './safety';

const memkv = new kvjs();

const redis = safety.env.USE_REDIS ? new Redis({
    url: safety.env.REDIS_URL || 'redis://localhost:6379',
    token: safety.env.REDIS_TOKEN || 'token',
}) : null;

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