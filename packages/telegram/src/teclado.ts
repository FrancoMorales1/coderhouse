import { InlineKeyboard } from 'grammy';

import type { RespuestaSalida } from '@fi/core';

/** Telegram rechaza el placeholder si pasa de 64 caracteres. */
const MAX_PLACEHOLDER = 64;

interface ForceReply {
  force_reply: true;
  input_field_placeholder?: string;
}

export type MarcadoDeRespuesta = InlineKeyboard | ForceReply;

/**
 * Traduce la intención de interfaz de una respuesta al `reply_markup` de
 * Telegram.
 *
 * Los dos casos son excluyentes a propósito: la API no admite teclado y
 * `force_reply` en el mismo mensaje. Los botones ganan porque son el menú, y el
 * pedido de texto llega en el mensaje siguiente.
 */
export function marcadoDeRespuesta(salida: RespuestaSalida): MarcadoDeRespuesta | undefined {
  if (salida.opciones && salida.opciones.length > 0) {
    const teclado = new InlineKeyboard();
    for (const opcion of salida.opciones) teclado.text(opcion.etiqueta, opcion.id).row();
    return teclado;
  }

  if (salida.pedirTexto) {
    return {
      force_reply: true,
      input_field_placeholder: salida.pedirTexto.placeholder.slice(0, MAX_PLACEHOLDER),
    };
  }

  return undefined;
}
