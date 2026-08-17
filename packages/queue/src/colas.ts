import { createLogger } from '@fi/core';
import { Queue, Worker, type Job, type Processor, type WorkerOptions } from 'bullmq';

import { conexion } from './conexion.js';

const log = createLogger('queue');

export const NOMBRES_COLA = {
  scraping: 'scraping',
  respuestas: 'respuestas',
} as const;

export type NombreCola = (typeof NOMBRES_COLA)[keyof typeof NOMBRES_COLA];

/** Trabajo de scraping: refrescar los horarios de cursadas desde MRBS. */
export interface JobScraping {
  dias?: number;
  area?: number;
}

/** Trabajo de respuesta: una consulta de WhatsApp pendiente de contestar. */
export interface JobRespuesta {
  jid: string;
  mensaje: string;
  nombre?: string;
}

export interface PayloadCola {
  scraping: JobScraping;
  respuestas: JobRespuesta;
}

const opcionesPorDefecto = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 3_600, count: 100 },
  removeOnFail: { age: 24 * 3_600 },
} as const;

export function crearCola<N extends NombreCola>(nombre: N): Queue<PayloadCola[N]> {
  return new Queue<PayloadCola[N]>(nombre, {
    connection: conexion,
    defaultJobOptions: opcionesPorDefecto,
  });
}

export function crearWorker<N extends NombreCola>(
  nombre: N,
  processor: Processor<PayloadCola[N]>,
  opciones: Partial<WorkerOptions> = {},
): Worker<PayloadCola[N]> {
  const worker = new Worker<PayloadCola[N]>(nombre, processor, {
    connection: conexion,
    concurrency: 5,
    ...opciones,
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    log.error({ err: error, cola: nombre, jobId: job?.id }, 'Job fallido');
  });

  worker.on('completed', (job: Job) => {
    log.debug({ cola: nombre, jobId: job.id }, 'Job completado');
  });

  return worker;
}
