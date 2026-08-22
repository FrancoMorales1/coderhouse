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
const carrerasPendientes = new Map<string, { carreras: string[]; expira: number }>();
const planesPendientes = new Map<string, { planes: string[]; expira: number }>();
const planActivoPorJid = new Map<string, { plan: string; expira: number }>();

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

export function recordarCarreras(jid: string, carreras: string[]): void {
  carrerasPendientes.set(jid, { carreras, expira: Date.now() + VIGENCIA_MS });
}

export function carrerasVigentes(jid: string): string[] | null {
  const entrada = carrerasPendientes.get(jid);
  if (!entrada) return null;
  if (entrada.expira <= Date.now()) {
    carrerasPendientes.delete(jid);
    return null;
  }
  return entrada.carreras;
}

export function olvidarCarreras(jid: string): void {
  carrerasPendientes.delete(jid);
}

export function recordarPlanes(jid: string, planes: string[]): void {
  planesPendientes.set(jid, { planes, expira: Date.now() + VIGENCIA_MS });
}

export function planesVigentes(jid: string): string[] | null {
  const entrada = planesPendientes.get(jid);
  if (!entrada) return null;
  if (entrada.expira <= Date.now()) {
    planesPendientes.delete(jid);
    return null;
  }
  return entrada.planes;
}

export function olvidarPlanes(jid: string): void {
  planesPendientes.delete(jid);
}

/**
 * El plan de estudios puntual (carrera + versión) que quedó elegido para esta
 * conversación, distinto de `planesVigentes` (la lista de botones ofrecidos).
 * Se usa para que una pregunta en texto libre después de elegir el plan siga
 * atada a ese plan en vez de perder de vista cuál se había elegido.
 */
export function recordarPlanActivo(jid: string, plan: string): void {
  planActivoPorJid.set(jid, { plan, expira: Date.now() + VIGENCIA_MS });
}

export function planActivoVigente(jid: string): string | null {
  const entrada = planActivoPorJid.get(jid);
  if (!entrada) return null;
  if (entrada.expira <= Date.now()) {
    planActivoPorJid.delete(jid);
    return null;
  }
  return entrada.plan;
}

export function olvidarPlanActivo(jid: string): void {
  planActivoPorJid.delete(jid);
}
