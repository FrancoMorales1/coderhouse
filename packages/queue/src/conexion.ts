import { env } from '@fi/core';
import { Redis } from 'ioredis';

/**
 * BullMQ exige `maxRetriesPerRequest: null`: los workers usan comandos
 * bloqueantes y ioredis no debe cortarlos por su cuenta.
 */
export function crearConexionRedis(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export const conexion: Redis = crearConexionRedis();
