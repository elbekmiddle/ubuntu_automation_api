import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisPubSubService implements OnModuleDestroy {
    private readonly publisher = new Redis({
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? 6379),
    });

    private readonly subscriber = new Redis({
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? 6379),
    });

    publish(channel: string, message: unknown) {
        return this.publisher.publish(channel, JSON.stringify(message));
    }

    subscribe(channel: string, onMessage: (payload: any) => void) {
        this.subscriber.subscribe(channel);
        this.subscriber.on('message', (ch, raw) => {
            if (ch === channel) onMessage(JSON.parse(raw));
        });
    }

    onModuleDestroy() {
        this.publisher.disconnect();
        this.subscriber.disconnect();
    }
}