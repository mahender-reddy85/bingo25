import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function test() {
  try {
    console.log('Testing Redis connection...');
    const result = await redis.set('test', 'hello');
    console.log('Set result:', result);
    const getResult = await redis.get('test');
    console.log('Get result:', getResult);
    console.log('Redis connection successful!');
  } catch (error) {
    console.error('Redis connection failed:', error);
  }
}

test();
