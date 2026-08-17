import type { proto } from 'baileys';

const SUFIJO_GRUPO = '@g.us';

/**
 * Baileys entrega el texto en distintos lugares según el tipo de mensaje.
 * Función pura para poder testear el desarmado sin levantar un socket.
 */
export function extraerTexto(mensaje: proto.IMessage | null | undefined): string | undefined {
  if (!mensaje) return undefined;

  const texto = mensaje.conversation ?? mensaje.extendedTextMessage?.text;

  const limpio = texto?.trim();
  if (!limpio) return undefined;

  return limpio;
}

export function esGrupo(jid: string): boolean {
  return jid.endsWith(SUFIJO_GRUPO);
}

/** Normaliza el JID descartando el sufijo de dispositivo (`:12`). */
export function normalizarJid(jid: string): string {
  return jid.replace(/:\d+(?=@)/, '');
}
