/** Un fragmento de la base de conocimiento que se le pasa al modelo como contexto. */
export interface FragmentoContexto {
  titulo: string;
  url: string;
  contenido: string;
}

/** Un turno previo de la conversación de WhatsApp. */
export interface TurnoConversacion {
  rol: 'usuario' | 'asistente';
  contenido: string;
}

/** Todo lo que la IA necesita para responder: mensaje + contexto + contenido de la BBDD. */
export interface ConsultaIA {
  mensaje: string;
  historial: TurnoConversacion[];
  documentos: FragmentoContexto[];
}

export interface RespuestaIA {
  texto: string;
  fuentes: string[];
  modelo: string;
}

export interface ProveedorIA {
  responder(consulta: ConsultaIA): Promise<RespuestaIA>;
}
