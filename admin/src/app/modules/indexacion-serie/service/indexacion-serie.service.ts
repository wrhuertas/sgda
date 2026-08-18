import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from '../../auth';

@Injectable({
  providedIn: 'root'
})
export class IndexacionSerieService {

isLoading$: Observable<boolean>;
  isLoadingSubject: BehaviorSubject<boolean>;
// Dentro de la clase del servicio:
public _refreshListado = new EventEmitter<void>();
  constructor(
    private http: HttpClient,
    public authservice: AuthService
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  // ✅ Registrar una nueva indexación
   registrarDocumento(data: any): Observable<any> {
      this.isLoadingSubject.next(true);

      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });

      const URL = `${URL_SERVICIOS}/indexacioneserie`;

      return this.http.post(URL, data, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }

  // ✅ Listar indexaciones por id_modulo (ejemplo)
  listIndexaciones(idModulo: number) {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = `${URL_SERVICIOS}/indexaciones?modulo_id=${idModulo}`;
    return this.http.get(URL, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  subirArchivos(data: FormData): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
      // No pongas Content-Type, Angular lo define automáticamente para FormData
    });

    const URL = `${URL_SERVICIOS}/indexaciones/upload`; // Cambia esta ruta según tu API
    return this.http.post(URL, data, { headers });
  }

   // Servicio para obtener campos_extra (POST sin payload o con filtros)
  obtenerCamposExtraSerie(filtros: any = {}): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const url = `${URL_SERVICIOS}/indexaciones/obtenerCamposSerie`;

    return this.http.post(url, filtros, { headers });
  }


  listIndexacionesBusqueda(page = 1, filtros: any = {}) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  const url = `${URL_SERVICIOS}/indexaciones/indexbusqueda?page=${page}`;
  return this.http.post(url, filtros, { headers });
    }



    
    prueba(data: any): Observable<any> {
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });

      const URL = `${URL_SERVICIOS}/prueba`;

      return this.http.post(URL, data, { headers });
    }

    // Firmar un PDF pasando ruta relativa y id_empresa al endpoint Laravel /firmar-pdf
    firmarPdfDirecto(payload: { pdfOriginal: string; empresaId: number }) {
      const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authservice.token });
      const url = `${URL_SERVICIOS}/firmar-pdf`;
      return this.http.post(url, payload, { headers });
    }





      getProyectoById(id: number): Observable<any> {
        console.log('Enviando ID al backend:', id);
        this.isLoadingSubject.next(true);

        const headers = new HttpHeaders({
          Authorization: 'Bearer ' + this.authservice.token,
        });

        const url = `${URL_SERVICIOS}/DatosNombreSerie`;

        // Enviamos como objeto con propiedad idProyecto
        return this.http
          .post(url, { id: id }, { headers })
          .pipe(finalize(() => this.isLoadingSubject.next(false)));
      }


         getSerieById(id: number): Observable<any> {
          console.log('Enviando ID al backend:', id);
          this.isLoadingSubject.next(true);

          const headers = new HttpHeaders({
            Authorization: 'Bearer ' + this.authservice.token,
          });

          const url = `${URL_SERVICIOS}/IndexacionDatosSerie`;

          // Enviamos como objeto con propiedad idProyecto
          return this.http
            .post(url, { id: id }, { headers })
            .pipe(finalize(() => this.isLoadingSubject.next(false)));
        }


        
        archivos(data: FormData): Observable<any> {
        const headers = new HttpHeaders({
          'Authorization': 'Bearer ' + this.authservice.token
          // No pongas Content-Type, Angular lo define automáticamente para FormData
        });

        const URL = `${URL_SERVICIOS}/indexaciones/uploadSerie`; // Cambia esta ruta según tu API
        return this.http.post(URL, data, { headers });
      }

      separarPDF(nombreArchivo: string): Observable<{file: string, nombre: string}[]> {
          const headers = new HttpHeaders({
            'Authorization': 'Bearer ' + this.authservice.token
          });
          const URL = `${URL_SERVICIOS}/indexaciones/separar`; 
          return this.http.post<{file: string, nombre: string}[]>(URL, { nombreArchivo }, { headers });
        }



 buscarIndexacion(filtros: any) {

  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  const url = `${URL_SERVICIOS}/indexacion/buscar`; 
  // 👆 cambia esta ruta según tu API real

  return this.http.post(url, filtros, { headers });

}


  listarDocumentosPorSerie(payload: any) {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    // Laravel paginate() espera ?page=n en la query, no en el body
    const page = (payload && typeof payload.page !== 'undefined') ? Number(payload.page) : 1;
    const url = `${URL_SERVICIOS}/indexaciones/listar-documentos-serie?page=${isNaN(page) ? 1 : page}`;

    // Enviar el resto del payload sin 'page' en el body
    const body = { ...(payload || {}) } as any;
    if (body && typeof body.page !== 'undefined') {
      delete body.page;
    }

    return this.http.post(url, body, { headers });
  }

// Guarda el documento editado (limpieza) como una NUEVA versión
guardarNuevaVersionDocumento(payload: { id_documento: number; paginas: Array<{ pagina: number; imagen: string }>; usuario_id?: number | null }) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });
  const url = `${URL_SERVICIOS}/indexaciones/guardar-nueva-version`;
  return this.http.post(url, payload, { headers });
}

// Datos de una empresa (se usa para saber si aplica el renombrado por contenido)
obtenerEmpresa(idEmpresa: number) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });
  return this.http.get(`${URL_SERVICIOS}/empresas/${idEmpresa}`, { headers });
}

// Descarga el PDF del expediente. Si está cifrado en el servidor, el backend
// lo descifra antes de enviarlo: aquí siempre llega un PDF utilizable.
descargarDocumento(payload: { id_documento: number; usuario_id?: number | null; password: string; intento?: number; max_intentos?: number }) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });
  const url = `${URL_SERVICIOS}/documentos/descargar`;
  return this.http.post(url, payload, { headers, responseType: 'blob' });
}

// Inserta una hoja (imagen o PDF) en una página concreta del documento.
// Devuelve una NUEVA versión con la hoja ya incorporada.
insertarPaginaDocumento(payload: { id_documento: number; posicion: number; archivo: File; paginas?: string; disposicion?: string; usuario_id?: number | null }) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
    // No pongas Content-Type, Angular lo define automáticamente para FormData
  });

  const formData = new FormData();
  formData.append('id_documento', String(payload.id_documento));
  formData.append('posicion', String(payload.posicion));
  formData.append('archivo', payload.archivo);
  if (payload.paginas) { formData.append('paginas', payload.paginas); }
  if (payload.disposicion) { formData.append('disposicion', payload.disposicion); }
  if (payload.usuario_id) { formData.append('usuario_id', String(payload.usuario_id)); }

  const url = `${URL_SERVICIOS}/indexaciones/insertar-pagina`;
  return this.http.post(url, formData, { headers });
}

// Lista las versiones (V1, V2, V3...) de un documento
versionesDocumento(idDocumento: number, idEmpresa: any = null) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });
  const url = `${URL_SERVICIOS}/indexaciones/versiones-documento`;

  // Usuario logeado (necesario para la auditoría de la consulta de versiones)
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return this.http.post(url, {
    id_documento: idDocumento,
    usuario_id: user?.id ?? null,
    id_empresa: idEmpresa ?? user?.id_empresa ?? null
  }, { headers });
}

listarDocumentosOCRPorSerie(payload: any) {

  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  const url = `${URL_SERVICIOS}/indexaciones/listardocumentosparaOCR`;

  return this.http.post(url, payload, { headers });

}



listarAnexos(idDocumento: any) {
  const url = `${URL_SERVICIOS}/indexaciones/listar-anexos/${idDocumento}`;
  const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authservice.token });
  return this.http.get(url, { headers });
}

// Trae un anexo (PDF) como base64 a través de la API (evita CORS de /storage)
verAnexoBase64(ruta: string) {
  const url = `${URL_SERVICIOS}/anexos/ver-base64`;
  const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authservice.token });
  return this.http.post(url, { ruta }, { headers });
}





subirDocumentosSerie(formData: FormData) {

  const url = `${URL_SERVICIOS}/indexaciones/subir-documento-serie`;

  // ✅ SOLO AUTORIZACIÓN, SIN CONTENT-TYPE
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  return this.http.post(url, formData, {
    headers: headers,
    reportProgress: true,
    observe: 'events'
  });

}




subirExcelMasivo(file: File) {
  const url = `${URL_SERVICIOS}/indexaciones/subir-excel-serie`;

  const formData = new FormData();
  formData.append('file', file); // El nombre 'file' debe coincidir con $request->file('file') en Laravel

  // Usuario logeado (necesario para la auditoría de la indexación por Excel)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user?.id) { formData.append('usuario_id', String(user.id)); }

  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  return this.http.post(url, formData, {
    headers: headers,
    reportProgress: true,
    observe: 'events'
  });
}




obtenerDocumentoPorId(payload: any) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  const url = `${URL_SERVICIOS}/documentos/obtener-documento`;

  // ⚠️ CRUCIAL: Agregar responseType 'blob'
  return this.http.post(url, payload, { 
    headers, 
    responseType: 'blob' 
  });
}


obtenerDocumentoFirmadoPorId(payload: { idDocumento: number; idEmpresa: number; idSerieSubserie: number | null }) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  const url = `${URL_SERVICIOS}/documentos/obtenerdocumentofirmado`;
  return this.http.post(url, payload, { headers });
}

  // Convierte un PDF en imágenes (base64) usando el endpoint /enviarPDF
  convertirPdfAImagenes(archivoUrl: string) {
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authservice.token });
    const url = `${URL_SERVICIOS}/enviarPDF`;
    return this.http.post(url, { archivo_url: archivoUrl }, { headers });
  }

  // Nuevo: obtener imagen de anexo desde controlador de Asignacion (módulo Tramites)
  obtenerAnexoImagen(payload: { id_anexo?: number; ruta?: string; page?: number }) {
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authservice.token });
    const url = `${URL_SERVICIOS}/asignacion/obtener-anexo-imagen`;
    return this.http.post(url, payload, { headers });
  }


getCamposByDocumento(idDocumento: number) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  return this.http.get(`${URL_SERVICIOS}/indexacion/campos/documento/${idDocumento}`, { headers });
}






// En indexacion-serie.service.ts

  obtenerDocumentoUrl(payload: { 
    idDocumento: number; 
    idEmpresa: number; 
    idSerieSubserie: number | null;
    page?: number; // 👈 Añade esto con el signo '?' para que sea opcional
  }) {
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });
  const url = `${URL_SERVICIOS}/documentos/obtener-documento-url`;
  return this.http.post(url, payload, { headers });
}



  guardarIndexacion(data: FormData): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
      // No pongas Content-Type, Angular lo define automáticamente para FormData
    });

    const URL = `${URL_SERVICIOS}/guardarCamposIndexados`; // Cambia esta ruta según tu API
    return this.http.post(URL, data, { headers });
  }

  // Actualiza de forma permanente una página del documento con una imagen base64 ya procesada
  actualizarPaginaDocumento(payload: {
    idDocumento: number;
    idEmpresa: number;
    idSerieSubserie: number | null;
    page: number; // 0-based
    imagenBase64: string; // data:image/png;base64,....
  }) {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const url = `${URL_SERVICIOS}/documentos/paginas/actualizar`;
    // Front enviará PUT como en el flujo original
    return this.http.put(url, payload, { headers });
  }

  // Generar link firmado temporal para compartir
  generarLinkCompartir(payload: { idDocumento: number; minutos?: number; usuario_id?: any; id_empresa?: any }) {
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authservice.token });
    const url = `${URL_SERVICIOS}/compartir/generar`;
    return this.http.post(url, payload, { headers });
  }

  // Trasladar documentos en lote (ids)
  trasladarDocumentos(payload: { ids: number[]; destino?: any; ubicacion?: any }) {
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authservice.token });
    const URL = `${URL_SERVICIOS}/rutadocumento/trasladar-documentos`;

    // Usuario logeado (necesario para la auditoría del traslado)
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    return this.http.post(URL, { ...payload, usuario_id: user?.id ?? null }, { headers });
  }

  // Auditoría simple (sin auth): registrar acción/tiempo
  registrarAuditoriaDocumental(payload: {
    id_documento: number;
    id_usuario: number;
    accion: string; // 'INDEXACION' | 'REVISION' | 'FIRMA'
    detalles_eventos?: string | null;
    fecha_inicio: string; // ISO
    fecha_fin: string; // ISO
    segundos_trabajados: number;
  }) {
    const url = `${URL_SERVICIOS}/documentos/registrar-auditoria-documental`;
    return this.http.post(url, payload);
  }

  // Guardar separadores de un documento
  guardarSeparadoresDocumento(payload: {
    id_documento: number;
    id_empresa: number | null;
    id_serie_subserie: number | null;
    separadores: Array<{
      nombre: string;
      pagina_inicio: number;
      pagina_fin: number;
      color?: string | null;
    }>;
  }) {
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authservice.token });
    const url = `${URL_SERVICIOS}/documentos/separadores/guardar`;
    return this.http.post(url, payload, { headers });
  }





  getDocumentoById(idDocumento: number) {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    return this.http.get(`${URL_SERVICIOS}/datosDocumentos/${idDocumento}`, { headers });
  }
  guardarDatosDocumentales(data: any) {
    const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
        // No pongas Content-Type, Angular lo define automáticamente para FormData
      });

      const URL = `${URL_SERVICIOS}/guardarCamposAdicionales`; // Cambia esta ruta según tu API
      return this.http.post(URL, data, { headers });
  }

  permisosUsuario(ID_USER: string) {
      this.isLoadingSubject.next(true);
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
      const URL = URL_SERVICIOS + "/users/permisos-documentales/" + ID_USER;
      return this.http.post(URL, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }



    firmarDocumento(formData: FormData) {
      const url = `${URL_SERVICIOS}/indexaciones/firmar-documento`;
    
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
    
      return this.http.post(url, formData, {
        headers: headers,
        reportProgress: true,
        observe: 'events'
      });
    }
    


    indexacionOCR(payload: any) {

      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
    
      const url = `${URL_SERVICIOS}/indexaciones/indexacionOCR`;
    
      return this.http.post(url, payload, { headers });
    
    }




    indexacionOCRIA(payload: any) {

      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
    
      const url = `${URL_SERVICIOS}/indexaciones/indexacionOCRIA`;
    
      return this.http.post(url, payload, { headers });
    
    }




    // En IndexacionSerieService
    eliminarDocumento(id: number, usuario_id: number): Observable<any> {
      this.isLoadingSubject.next(true);

      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });

      const URL = `${URL_SERVICIOS}/documento/eliminar/${id}`;

      return this.http.put(URL, { usuario_id }, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }


        // En IndexacionSerieService
        eliminarDocumentoMasivo(id: number): Observable<any> {
          this.isLoadingSubject.next(true);
          
          const headers = new HttpHeaders({
            'Authorization': 'Bearer ' + this.authservice.token
          });
    
          // Ajusta la URL según tu ruta de API en Laravel
          const URL = `${URL_SERVICIOS}/documento/eliminarMasivo/${id}`;
    
          return this.http.put(URL, { headers }).pipe(
            finalize(() => this.isLoadingSubject.next(false))
          );
        }


    listarDatosDocumento(payload: { id_documento: number }) {
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
    
      const url = `${URL_SERVICIOS}/indexaciones/listardatosdocumento`;
    
      // El payload que recibe ahora es solo { id_documento: 46 }
      return this.http.post(url, payload, { headers });
    }

    

    subirAnexosExpediente(formData: FormData) {
      const url = `${URL_SERVICIOS}/indexaciones/subiranexosexpediente`;
    
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });
    
      return this.http.post(url, formData, {
        headers: headers,
        reportProgress: true, // Esto permite avisar al componente cuánto va cargando
        observe: 'events'     // Esto permite recibir los eventos de progreso y no solo la respuesta final
      });
    }


      deleteAnexo(id: number): Observable<any> {
      this.isLoadingSubject.next(true);
      
      const headers = new HttpHeaders({
        'Authorization': 'Bearer ' + this.authservice.token
      });

      // Ajusta la URL según tu ruta de API en Laravel
      const URL = `${URL_SERVICIOS}/anexos/eliminaranexo/${id}`;

      // Usuario logeado (necesario para la auditoría de la eliminación)
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      return this.http.put(URL, { usuario_id: user?.id ?? null }, { headers }).pipe(
        finalize(() => this.isLoadingSubject.next(false))
      );
    }





    
   // Servicio para obtener campos_extra (POST sin payload o con filtros)
  obtenerDatosGenerales(filtros: any = {}): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    // Asegúrate de que apunte al endpoint correcto de tu backend (ej: /datos-generales)
    const url = `${URL_SERVICIOS}/indexaciones/datos-generales`;

    return this.http.post(url, filtros, { headers });
  }







registrarEdificio(payload: { nombre: string; id_empresa: number | null; usuario_registro: number | null }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/registrar-edificio`;

    // En POST/PUT el tercer parámetro son las opciones (headers)
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
   }

  // Actualizar edificio existente
  actualizarEdificio(payload: { id_edificio: number | null; nombre: string; usuario_registro: number | null }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/actualizar-edificio`;

    return this.http.put(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  registrarSala(payload: { id_edificio: number | null; nombre: string; cantidad_estanterias: number | null; usuario_registro: number | null }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    // ➔ CORREGIDO: Cambiada la URL para que apunte al endpoint de la sala
    const URL = `${URL_SERVICIOS}/rutadocumento/registrar-sala`;

    // En POST/PUT el tercer parámetro son las opciones (headers)
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
   }

  // Actualizar sala existente
  actualizarSala(payload: { id_sala: number | null; nombre: string; cantidad_estanterias: number | null; usuario_registro: number | null }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/actualizar-sala`;

    return this.http.put(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  registrarEstanteria(payload: { sala_id: number | null; cantidad_filas: number | null; usuario_registro: number | null; nombre?: string | null }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    // ➔ CORREGIDO: URL apuntando al endpoint correcto de estanterías
    const URL = `${URL_SERVICIOS}/rutadocumento/registrar-estanteria`;

    // Retornamos la petición POST con el payload corregido
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Actualizar nombre u otros datos de una estantería existente
  actualizarEstanteria(payload: { id_estanteria?: number | null; nombre?: string | null; usuario_registro?: number | null }): Observable<any> {
    // Algunos backends no exponen un endpoint PUT para actualizar estantería.
    // Para compatibilidad, re-utilizamos el endpoint POST de registrar-estanteria
    // enviando el id_estanteria cuando exista (el backend debe reconocerlo como update).
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/actualizar-estanteria`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }



  
  cantidadEstanteriaAqui(payload: { id_sala: number | null }): Observable<any> {
  this.isLoadingSubject.next(true);

  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  // ➔ CORREGIDO: Apunta al endpoint correcto de la estantería
  const URL = `${URL_SERVICIOS}/rutadocumento/cantidad-estanteria`;

  // Retornamos la petición POST enviando solo el id_sala
  return this.http.post(URL, payload, { headers }).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
}


  // Lista estanterías desde BD por sala (no en memoria)
  listarEstanteriasPorSala(payload: { id_sala: number | null }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/listar-estanterias`;

    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  desactivarEstanteria(payload: { id_estanteria: number; usuario_registro: number | null }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/desactivar-estanteria`;

    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Listar filas por estantería
  listarFilasPorEstanteria(payload: { id_estanteria: number | null }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/listar-filas`;

    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Registrar/actualizar cantidad de filas para una estantería
  registrarFilas(payload: { estanteria_id: number | null; cantidad: number | null; usuario_registro: number | null }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/registrar-filas`;

    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Actualizar cantidad de cajas de una fila
  actualizarFila(payload: { id_fila: number; cantidad_cajas: number; usuario_registro: number | null }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/actualizar-fila`;

    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Cajas
  listarCajasPorFila(payload: { id_fila: number }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/listar-cajas`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  registrarCajas(payload: { fila_id: number; cantidad: number; usuario_registro: number | null }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/registrar-cajas`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  actualizarCaja(payload: { id_caja: number; cantidad_carpetas: number; usuario_registro: number | null }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/actualizar-caja`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Carpetas
  listarCarpetasPorCaja(payload: { id_caja: number }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/listar-carpetas`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  registrarCarpetas(payload: { caja_id: number; cantidad: number; usuario_registro: number | null }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/registrar-carpetas`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  actualizarCarpeta(payload: { id_carpeta: number; numero_carpeta?: number; numero_documentos?: number; estado?: number }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/actualizar-carpeta`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Listado de lugares (Edificio/Sala) por Serie
  listarLugaresPorSerie(payload: { id_serie: number }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/listar-lugares-serie`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Eliminar una relación de lugar (ahora por id_lugar) de una serie
  // Payload esperado: { id_lugar: number, id_serie?: number }
  eliminarLugarDeSerie(payload: { id_lugar: number; id_serie?: number } | any): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/eliminar-lugar-serie`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Listar edificios por empresa
  listarEdificiosPorEmpresa(payload: { id_empresa: number }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/listar-edificios-empresa`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Listar salas por edificio
  listarSalasPorEdificio(payload: { id_edificio: number }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/listar-salas-por-edificio`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }



     // Servicio para obtener campos_extra (POST sin payload o con filtros)
  // Deprecado: conservar solo si alguien lo usa internamente
  obtenerDatosRutaBasica(filtros: any = {}): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    // Asegúrate de que apunte al endpoint correcto de tu backend (ej: /datos-generales)
    const url = `${URL_SERVICIOS}/indexaciones/datos-ruta`;

    return this.http.post(url, filtros, { headers });
  }

  // Obtener datos de ruta jerárquica (Serie -> Edificios -> Salas -> Estanterías -> Filas -> Cajas -> Carpetas)
  obtenerDatosRuta(payload: { idSerie: number | null; id_serie_subserie?: number | null; id_usuario?: number | null; id_empresa?: number | null; id_edificio?: number | null; id_sala?: number | null; id_lugar?: number | null }): Observable<any> {
    this.isLoadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });

    const URL = `${URL_SERVICIOS}/rutadocumento/obtener-datos-ruta`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }


  
       getRutaByEdificio(id: number): Observable<any> {
         console.log('Enviando ID al backend:', id);
         this.isLoadingSubject.next(true);

         const headers = new HttpHeaders({
           Authorization: 'Bearer ' + this.authservice.token,
         });

         const url = `${URL_SERVICIOS}/DatosRutaEdificio`;

         // Enviamos como objeto con propiedad idProyecto
         return this.http
           .post(url, { id: id }, { headers })
           .pipe(finalize(() => this.isLoadingSubject.next(false)));
       }

  // Validar si una ruta (edificio + sala + serie + empresa) ya existe
  validarRutaExistente(payload: { id_edificio: number; id_sala: number; id_serie: number; id_empresa: number }): Observable<any> {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = `${URL_SERVICIOS}/rutadocumento/validar-ruta`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Guardar ruta completa
  guardarRutaCompleta(payload: { id_edificio: number; id_sala?: number; id_serie: number; id_empresa: number; usuario_id: number }): Observable<any> {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = `${URL_SERVICIOS}/rutadocumento/guardar-ruta-completa`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // Obtener detalles de un lugar por ID
  obtenerDetallesLugar(payload: { id_lugar: number }): Observable<any> {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.authservice.token
    });
    const URL = `${URL_SERVICIOS}/rutadocumento/obtener-lugar`;
    return this.http.post(URL, payload, { headers }).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }
}
