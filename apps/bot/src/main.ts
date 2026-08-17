import { crearProveedorGemini } from '@fi/ai';
import { createLogger, env } from '@fi/core';
import { cerrarConexion } from '@fi/db';
import { crearClienteWhatsapp, type MensajeEntrante } from '@fi/whatsapp';

import { buscarHorarios, guardarTurno, obtenerConversacion, obtenerHistorial } from './contexto.js';
import { formatearRespuesta, MENSAJE_ERROR } from './respuesta.js';
import { iniciarScraping } from './scraping.js';

const log = createLogger('bot');

const ia = crearProveedorGemini();

const MENSAJE_RATE_LIMIT =
  'Estás enviando muchos mensajes seguidos. Esperá un momento y volvé a consultar.';

// Ventana deslizante en memoria: jid -> timestamps de mensajes recientes.
const marcasPorJid = new Map<string, number[]>();

function excedeLimite(jid: string): boolean {
  const ahora = Date.now();
  const ventanaMs = env.RATE_LIMIT_WINDOW_S * 1000;
  const marcas = (marcasPorJid.get(jid) ?? []).filter((t) => ahora - t < ventanaMs);

  if (marcas.length >= env.RATE_LIMIT_MAX) {
    marcasPorJid.set(jid, marcas);
    return true;
  }

  marcas.push(ahora);
  marcasPorJid.set(jid, marcas);
  return false;
}

/**
 * El corazón del bot: mensaje + contexto + horarios de la BBDD -> IA -> respuesta.
 */
async function responder(mensaje: MensajeEntrante): Promise<string> {
  if (excedeLimite(mensaje.jid)) {
    log.warn({ jid: mensaje.jid }, 'Rate limit alcanzado');
    return MENSAJE_RATE_LIMIT;
  }
  const conversacionId = await obtenerConversacion(mensaje.jid, mensaje.nombre);

  const [documentos, historial] = await Promise.all([
    buscarHorarios(mensaje.texto),
    obtenerHistorial(conversacionId),
  ]);

  await guardarTurno(conversacionId, 'usuario', mensaje.texto);

  const respuesta = await ia.responder({ mensaje: mensaje.texto, historial, documentos });
  const texto = formatearRespuesta(respuesta);

  await guardarTurno(conversacionId, 'asistente', texto);

  log.info(
    { jid: mensaje.jid, contexto: documentos.length, turnos: historial.length },
    'Consulta respondida',
  );

  return texto;
}

const whatsapp = crearClienteWhatsapp({
  onMensaje: async (mensaje) => {
    try {
      return await responder(mensaje);
    } catch (error) {
      log.error({ err: error, jid: mensaje.jid }, 'No se pudo responder');
      return MENSAJE_ERROR;
    }
  },
});

const scraping = await iniciarScraping();

async function apagar(senal: string): Promise<void> {
  log.info({ senal }, 'Apagando el bot');
  try {
    await whatsapp.desconectar();
    await scraping.worker.close();
    await scraping.cola.close();
    await cerrarConexion();
  } catch (error) {
    log.error({ err: error }, 'Error durante el apagado');
  } finally {
    process.exit(0);
  }
}

for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(senal, () => void apagar(senal));
}

log.info({ entorno: env.NODE_ENV, modelo: env.GEMINI_MODEL }, 'Iniciando bot de la FI - UNMdP');
await whatsapp.conectar();
