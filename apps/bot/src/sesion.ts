import type { NumeroOpcion } from './menu.js';

/**
 * Cuánto dura el tema elegido. Pasado ese rato, un mensaje suelto vuelve a
 * mostrar el menú en vez de buscarlo en la última categoría.
 */
const VIGENCIA_MS = 15 * 60 * 1000;

/**
 * Red de contención para cuando el hilo de la conversación se pierde: en
 * Telegram el usuario puede cancelar la celda de respuesta y escribir suelto, y
 * WhatsApp directamente no tiene hilos. Se recuerda el último tema elegido para
 * no obligarlo a repetir el número en cada mensaje.
 *
 * Es memoria del proceso a propósito: si el bot se reinicia se pierde y no pasa
 * nada, porque el camino principal (responder al pedido) no depende de esto.
 */
const ultimaOpcion = new Map<string, { opcion: NumeroOpcion; expira: number }>();
const materiasPendientes = new Map<string, { materias: string[]; expira: number }>();

function purgar(ahora: number): void {
  for (const [jid, entrada] of ultimaOpcion) {
    if (entrada.expira <= ahora) ultimaOpcion.delete(jid);
  }
}

export function recordarOpcion(jid: string, opcion: NumeroOpcion): void {
  const ahora = Date.now();
  purgar(ahora);
  ultimaOpcion.set(jid, { opcion, expira: ahora + VIGENCIA_MS });
}

export function opcionVigente(jid: string): NumeroOpcion | null {
  const entrada = ultimaOpcion.get(jid);
  if (!entrada) return null;

  if (entrada.expira <= Date.now()) {
    ultimaOpcion.delete(jid);
    return null;
  }

  return entrada.opcion;
}

export function olvidarOpcion(jid: string): void {
  ultimaOpcion.delete(jid);
}

export function recordarMaterias(jid: string, materias: string[]): void {
  materiasPendientes.set(jid, { materias, expira: Date.now() + VIGENCIA_MS });
}

export function materiasVigentes(jid: string): string[] | null {
  const entrada = materiasPendientes.get(jid);
  if (!entrada) return null;

  if (entrada.expira <= Date.now()) {
    materiasPendientes.delete(jid);
    return null;
  }

  return entrada.materias;
}

export function olvidarMaterias(jid: string): void {
  materiasPendientes.delete(jid);
}
