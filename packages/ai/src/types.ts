/** Un fragmento de la base de conocimiento que se le pasa al modelo como contexto. */
export interface FragmentoContexto {
  titulo: string;
  url: string;
  contenido: string;
}

/** Todo lo que la IA necesita para responder: la consulta natural + contexto de la BBDD. */
export interface ConsultaIA {
  mensaje: string;
  documentos: FragmentoContexto[];
  instruccionSistema: string;
}

export interface RespuestaIA {
  texto: string;
  fuentes: string[];
  modelo: string;
}

export interface ProveedorIA {
  responder(consulta: ConsultaIA): Promise<RespuestaIA>;
}
