import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { RecepcionService } from '../service/recepcion.service';
import { BuscarUsuarioComponent } from '../buscar-usuario/buscar-usuario.component';
import { UsuarioEnvioMasivoComponent } from '../usuario-envio-masivo/usuario-envio-masivo.component';
import { VistaMasivaPreviaComponent } from '../vista-masiva-previa/vista-masiva-previa.component';
import { PdfService } from 'src/app/shared/services/pdf.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mover-tramites-masivo',
  templateUrl: './mover-tramites-masivo.component.html',
  styleUrls: ['./mover-tramites-masivo.component.scss']
})
export class MoverTramitesMasivoComponent {
@Output() tramiteC = new EventEmitter<void>();
@Input() tramiteDatos!: any;
@Input() id_usuario: any;
  search: string = '';
  tramites: any[] = [];
  isLoading$: any;

  id_empresa!: number;
@Input() TRAMITE_SELECTED: any;
  // Nuevas entradas: tipos enviados desde el componente de listado
  @Input() tipos_documento: any[] = [];
  @Input() tipos_tramite: any[] = [];
  @Input() selectedTramitesIds: any[] = [];

  // Opciones que usa el template (se llenan con la respuesta del servicio)
  tiposDocumentoOptions: any[] = [];
  tiposTramiteOptions: any[] = [];
  descripcion: string = '';

  // Selecciones por trámite (clave: id_tramite)
  selectedTipoDocumento: { [key: string]: any } = {};
  selectedTipoTramite: { [key: string]: any } = {};
  // Asuntos por trámite
  selectedAsunto: { [key: string]: string } = {};
  // Campo de cabecera: ciudad
  ciudad: string = '';
  
  usuarios_para: any[] = [];
  usuarios_de: any[] = [];
  usuarios_copia: any[] = [];


  nombre: string = '';
  estado: number = 1;
  totalPages: number = 0;
  currentPage: number = 1;
  areas: any[] = []; // cargar desde backend

  user: any;

  isLoading: any;

  // Modal de anexos
  showAnexosModal = false;
  anexosSeleccionados: any[] = [];
  tituloAnexos = '';

  puedeAsignar: boolean = true;
  usuario_id: number | null = null;

 private initPending: number = 0;
  private initLoadingShown: boolean = false;

    asunto: string = '';
    public contenidoCuerpo: string = '';
     numero_documento_input: string = '';
  anexosGuardados: any[] = [];
  private firmarActaEnAsignacion: boolean = false;
  // Último PDF generado en background (no se adjunta por defecto)
  lastGeneratedPdfBlob: Blob | null = null;


      private decInit() {
         this.initPending = Math.max(0, this.initPending - 1);
         if (this.initPending === 0 && this.initLoadingShown) {
           try { Swal.close(); } catch {}
           this.initLoadingShown = false;
         }
       }

  constructor(
      
        public modalService: NgbModal,
        public RecepcionService: RecepcionService,
        public toast: ToastrService,
        private cdr: ChangeDetectorRef,
        public authService: AuthService,
        private pdfService: PdfService,
      ) { }
  
  ngOnInit(): void {
      
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (user && user.id_empresa) {
          this.id_empresa = user.id_empresa;
        } else {
          console.error('Usuario sin empresa:', user);
        }

        this.isLoading$ = this.RecepcionService.isLoading$;
          setTimeout(() => {
          // Tu lógica de carga aquí
          this.listatramites();
        });

        if (this.id_empresa) {
          this.cargarTiposDocumento(this.id_empresa);
        }
        if (this.id_empresa) {
          this.cargarTiposTramite(this.id_empresa);
        }
        // Asegurar que el usuario "DE" fijo quede establecido y se genere
        // el número de memorandum (numero_documento_input) igual que en AsignarTramiteComponent
        try {
          this.setUsuarioDeFijo();
          // Intentar llenar numero_documento_input llamando a DatosLogeado con el id del usuario
          const userLocal = this.authService?.user ?? JSON.parse(localStorage.getItem('user') || '{}');
          const idForDatos = this.usuario_id ?? userLocal?.id ?? userLocal?.id_usuario ?? null;
          if (idForDatos) {
            try { this.DatosLogeado(Number(idForDatos)); } catch (e) { console.warn('DatosLogeado error', e); }
          }
        } catch (e) { console.warn('setUsuarioDeFijo erro', e); }
        

      }


      listatramites(page = 1) {
        if (!this.id_empresa) return;
      
        // Opcional: limpiar la lista actual para dar feedback visual de carga
        // this.tramites = []; 
      
      this.RecepcionService
          .listTramites(this.id_empresa, page, this.search)
          .subscribe((resp: any) => {
            this.tramites = resp.data || [];

            // Si se pasaron IDs seleccionados desde el componente padre,
            // filtramos la lista para mostrar solo esos trámites.
            if (Array.isArray(this.selectedTramitesIds) && this.selectedTramitesIds.length > 0) {
              const idsSet = new Set(this.selectedTramitesIds.map((x: any) => Number(x)).filter((x: any) => !isNaN(x)));
              this.tramites = (this.tramites || []).filter((t: any) => idsSet.has(Number(t.id_tramite)));
              // ajustar paginación localmente para reflejar la lista filtrada
              this.totalPages = this.tramites.length;
              this.currentPage = 1;
            } else {
              this.totalPages = resp.total;
              this.currentPage = resp.current_page;
            }
            // Inicializar selecciones por trámite si el trámite trae info sobre tipos
            for (const t of this.tramites) {
              // intentamos detectar el id del tipo de documento en el propio trámite
              const docId = t.id_tipodocumento ?? t.id_tipo_documento ?? t.id_tipodocto ?? null;
              const traId = t.id_tipo_tramite ?? t.id_tipo ?? t.tipo_tramite_id ?? null;
              if (t.id_tramite) {
                this.selectedTipoDocumento[t.id_tramite] = docId ?? null;
                this.selectedTipoTramite[t.id_tramite] = traId ?? null;
                // inicializar asunto editable
                this.selectedAsunto[t.id_tramite] = t.asunto ?? '';
              }
            }
            
            // Si el usuario buscó algo y no hay resultados en ninguna categoría
            if (this.search && this.tramites.length === 0) {
              this.toast.info('No se encontraron trámites con esos criterios');
            }
      
            this.cdr.detectChanges();

            // Generar números de Memorandum en la tabla (precalcular secuencial por bloque)
            (async () => {
              try {
                if (!this.tramites || this.tramites.length === 0) return;
                // Identificador y estado del primer trámite para preservarlo estrictamente
                const firstTramiteId = this.tramites[0]?.id_tramite ?? this.tramites[0]?.id ?? null;
                const firstHadNumero = !!(
                  this.tramites[0]?.numero_memorandum ||
                  this.tramites[0]?.num_documento_interno ||
                  this.tramites[0]?.num_documento_interno_asig ||
                  (this.tramites[0]?.asignacion && this.tramites[0].asignacion.num_documento_interno)
                );
                // Obtener datos del usuario para las siglas
                const userLocal = this.authService?.user ?? JSON.parse(localStorage.getItem('user') || '{}');
                const idUser = this.usuario_id ?? userLocal?.id ?? userLocal?.id_usuario ?? null;
                let datosLog: any = null;
                if (idUser) {
                  try { datosLog = await firstValueFrom(this.RecepcionService.datosLogeado(Number(idUser))); } catch (e) { datosLog = null; }
                }

                // Obtener secuencial de inicio (intentamos una sola vez).
                // Si la API no devuelve un 'start' válido, no llamaremos por fila (evita repetir el mismo valor).
                let seqStart: number | null = null;
                try {
                  const respSec: any = await firstValueFrom(this.RecepcionService.getSecuencialMemorandumRecepcion(Number(this.id_empresa)));
                  seqStart = Number(respSec?.next ?? respSec?.secuencial ?? NaN);
                  if (isNaN(seqStart)) seqStart = null;
                } catch (e) { seqStart = null; }

                console.log('[MoverMasivo] seqStart inicial:', seqStart);

                // Si no obtuvimos seqStart, intentamos una única llamada adicional antes del bucle
                // y usamos ese valor como base (en vez de consultar por cada fila, lo que puede devolver siempre el mismo
                // 'next' y provocar números repetidos en la vista).
                if (seqStart === null) {
                  try {
                    const respFallback: any = await firstValueFrom(this.RecepcionService.getSecuencialMemorandumRecepcion(Number(this.id_empresa)));
                    const fallbackNum = Number(respFallback?.next ?? respFallback?.secuencial ?? NaN);
                    if (!isNaN(fallbackNum)) {
                      seqStart = fallbackNum;
                      console.log('[MoverMasivo] seqStart fallback obtenido:', seqStart);
                    }
                  } catch (e) {
                    // dejamos seqStart como null si falla
                    seqStart = null;
                  }
                }
                // Antes de inferir desde todas las filas, preferimos tomar el número de la PRIMERA fila
                // si existe (num_documento_interno / num_documento_interno_asig / asignacion.num_documento_interno / numero_memorandum).
                if (seqStart === null) {
                  try {
                    // Usar el mismo orden que muestra la plantilla para obtener el número de la PRIMERA fila.
                    // Plantilla: numero_memorandum || num_documento_interno_asig || asignacion.num_documento_interno || numero_documento_input
                    const firstValDirect = this.tramites && this.tramites[0] ? String(
                      this.tramites[0].numero_memorandum ||
                      this.tramites[0].num_documento_interno_asig ||
                      (this.tramites[0].asignacion && this.tramites[0].asignacion.num_documento_interno) ||
                      this.numero_documento_input ||
                      ''
                    ).trim() : '';
                    const mFirst = firstValDirect.match(/-(\d+)-M$/);
                    if (mFirst && mFirst[1]) {
                      const baseFirst = Number(mFirst[1]);
                      if (!isNaN(baseFirst)) {
                        // Guardamos el "base" (el secuencial que trae la primera fila) y
                        // lo usaremos luego para calcular seq = base + offset.
                        seqStart = baseFirst;
                        console.log('[MoverMasivo] seqStart establecido desde primera fila (base):', seqStart, 'baseFirst:', baseFirst);
                      }
                    }
                  } catch (e) { /* ignore */ }

                  // Si no obtuvimos seqStart a partir de la primera fila, inferir desde cualquier fila disponible
                  if (seqStart === null) {
                    try {
                      const parsedNums: number[] = (this.tramites || []).map((t: any) => {
                        const s = String(
                          t?.numero_memorandum ||
                          t?.num_documento_interno_asig ||
                          (t?.asignacion && t.asignacion.num_documento_interno) ||
                          t?.num_documento_interno ||
                          this.numero_documento_input ||
                          ''
                        ).trim();
                        const m = s.match(/-(\d+)-M$/);
                        if (m && m[1]) return Number(m[1]);
                        return NaN;
                      }).filter((n: number) => !isNaN(n));
                      if (parsedNums.length > 0) {
                        const maxExisting = Math.max(...parsedNums);
                        // Guardar el mayor existente como base; la asignación usará base + offset
                        seqStart = maxExisting;
                        console.log('[MoverMasivo] seqStart inferido (base) desde filas existentes:', seqStart);
                      } else {
                        // Como último recurso, iniciar en 1
                        seqStart = 1;
                        console.log('[MoverMasivo] seqStart por defecto usado:', seqStart);
                      }
                    } catch (e) {
                      seqStart = 1;
                    }
                  }
                }

                // Construir siglas
                const siglaEmp = String(datosLog?.sigla || datosLog?.sigla_empresa || '').trim();
                const siglaProyRaiz = String(datosLog?.sigla_proyecto_raiz || '').trim();
                const siglaProyActual = String(datosLog?.sigla_proyecto_actual || '').trim();
                const year = new Date().getFullYear();

                // Detectar si la primera fila ya trae un numero_memorandum y preservarlo.
                let preserveFirst = false;
                let baseSeqFromFirst: number | null = null;
                try {
                  const firstVal = this.tramites && this.tramites[0] ? String(
                    this.tramites[0].numero_memorandum ||
                    this.tramites[0].num_documento_interno ||
                    this.tramites[0].num_documento_interno_asig ||
                    (this.tramites[0].asignacion && this.tramites[0].asignacion.num_documento_interno) ||
                    ''
                  ) : null;
                  if (firstVal) {
                    const m = firstVal.match(/-(\d+)-M$/);
                    if (m && m[1]) {
                      baseSeqFromFirst = Number(m[1]);
                      if (!isNaN(baseSeqFromFirst)) {
                        preserveFirst = true;
                        // Forzar que la secuencia inicie inmediatamente después del número de la primera fila
                        seqStart = baseSeqFromFirst + 1;
                        console.log('[MoverMasivo] preservando primer numero de fila, baseSeqFromFirst:', baseSeqFromFirst, 'seqStart ajustado a:', seqStart);
                      } else {
                        baseSeqFromFirst = null;
                      }
                    }
                  }
                } catch (e) {
                  // ignore
                }

                let lastAssigned: number | null = null;
                for (let i = 0; i < this.tramites.length; i++) {
                  let seqNum: number | null = null;
                  if (seqStart !== null) {
                    // Si preservamos la primera fila, no asignamos a i===0; para i>0 usamos seqStart + (i-1)
                    if (i === 0 && preserveFirst) {
                      seqNum = null; // dejar el numero que ya trae la fila
                    } else {
                      const offset = preserveFirst ? (i - 1) : i;
                      seqNum = seqStart + offset;
                    }
                  } else {
                    // fallback per-row
                    try {
                      const respSecRow: any = await firstValueFrom(this.RecepcionService.getSecuencialMemorandumRecepcion(Number(this.id_empresa)));
                      seqNum = Number(respSecRow?.next ?? respSecRow?.secuencial ?? NaN);
                      if (isNaN(seqNum)) seqNum = null;
                    } catch (e) { seqNum = null; }
                  }

                  if (seqNum !== null) {
                    if (lastAssigned !== null && seqNum <= lastAssigned) seqNum = lastAssigned + 1;
                    lastAssigned = seqNum;
                    const sec4 = String(seqNum).padStart(4, '0');
                    const partes: string[] = [];
                    if (siglaEmp) partes.push(siglaEmp);
                    if (siglaProyRaiz) partes.push(siglaProyRaiz);
                    if (siglaProyActual) partes.push(siglaProyActual);
                    partes.push(String(year));
                    partes.push(sec4);
                    partes.push('M');
                    try {
                      // No sobrescribir un número ya existente en la fila: respetar el valor que vino de la base.
                      // También respetar si existe num_documento_interno.
                      const curId = this.tramites[i]?.id_tramite ?? this.tramites[i]?.id ?? null;
                      // Si este es el primer trámite original con número, preservarlo.
                      // En GENERAL solo asignamos el número calculado si la fila NO trae ya un numero_memorandum.
                      if (curId === firstTramiteId && firstHadNumero) {
                        console.log('[MoverMasivo] preservado primer tramite por id', curId);
                      } else if (!this.tramites[i].numero_memorandum) {
                        this.tramites[i].numero_memorandum = partes.join('-');
                        console.log('[MoverMasivo] asignado numero_memorandum para fila', i, this.tramites[i].numero_memorandum);
                      } else {
                        console.log('[MoverMasivo] fila ya trae numero_memorandum, no se sobrescribe', this.tramites[i].numero_memorandum);
                      }
                    } catch(e){ console.error('[MoverMasivo] error asignando numero_memorandum fila', i, e); }
                  }
                }
                this.cdr.detectChanges();
              } catch (e) {
                // ignore
              }
            })();
          });
      }



  async enviarTramites() {
      // Validaciones previas: primero verificar que cada trámite tenga
      // tipo de documento y tipo de trámite seleccionado.
      if (!Array.isArray(this.tramites) || this.tramites.length === 0) {
        this.toast.error('No hay trámites para enviar');
        return;
      }

      const faltantesTipo: string[] = [];
      for (const t of this.tramites) {
        const id = t?.id_tramite ?? t?.id ?? null;
        // Si el trámite no tiene selection por id, consideramos que falta
        const selDoc = id ? this.selectedTipoDocumento[id] : null;
        const selTra = id ? this.selectedTipoTramite[id] : null;
        if (!selDoc || !selTra) {
          const label = String(t?.numero_tramite || id || 'N/A');
          faltantesTipo.push(label);
        }
      }

      if (faltantesTipo.length > 0) {
        // Mostrar aviso específico y no continuar
        const listHtml = `<p>Los siguientes trámites no tienen Tipo de Documento y/o Tipo de Trámite seleccionados:</p><p><b>${faltantesTipo.join(', ')}</b></p>`;
        Swal.fire({
          icon: 'warning',
          title: 'Faltan selecciones',
          html: listHtml,
          confirmButtonText: 'Entendido'
        });
        return;
      }

      // Segunda validación: verificar que exista al menos un destinatario "PARA"
      if (!Array.isArray(this.usuarios_para) || this.usuarios_para.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Falta destinatario',
          text: 'Debe seleccionar al menos un usuario en "PARA" antes de enviar los trámites.',
          confirmButtonText: 'Entendido'
        });
        return;
      }

      // Si pasa validaciones, mostrar mensaje sobre firma (solo mensaje por ahora)
      const user = this.authService?.user ?? JSON.parse(localStorage.getItem('user') || '{}');
      let tieneFirma = false;
      try {
        if (user && (user.id || user.id_usuario)) {
          const id = user.id ?? user.id_usuario;
          const resp: any = await firstValueFrom(this.RecepcionService.validarFirma(Number(id)));
          // La API puede devolver { vigente: true } u otro campo; asumimos 'vigente'
          tieneFirma = !!resp?.vigente || !!resp?.tiene_firma;
        }
      } catch (e) {
        console.warn('No fue posible validar la firma en envío masivo:', e);
        tieneFirma = false;
      }

      // Confirmar la asignación primero
      const confirmAsignacion = await Swal.fire({
        title: 'Confirmar asignación',
        html: 'Se asignará los trámites. ¿Desea continuar?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });

      if (!confirmAsignacion.isConfirmed) {
        // El usuario canceló la operación
        return;
      }

      // Si el usuario tiene firma disponible, preguntamos si desea usarla para firmar el acta
      this.firmarActaEnAsignacion = false;
      if (tieneFirma) {
        const confirmarFirmar = await Swal.fire({
          title: 'Firmar actas',
          html: 'Usted tiene firma electrónica vigente. ¿Desea firmar esta acta?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí, firmar',
          cancelButtonText: 'No, continuar sin firmar'
        });

        if (confirmarFirmar.isConfirmed) {
          this.firmarActaEnAsignacion = true;
        } else {
          this.firmarActaEnAsignacion = false;
        }
      } else {
        // No hay firma disponible; continuamos sin firmar (usuario ya confirmó asignación)
        this.firmarActaEnAsignacion = false;
      }

      // Preparar datos para generar número de Memorandum igual que AsignarTramiteComponent
      let datosLogeadoResp: any = null;
      try {
        const userForData = this.authService?.user ?? JSON.parse(localStorage.getItem('user') || '{}');
        const idUserForData = userForData?.id ?? userForData?.id_usuario ?? null;
        if (idUserForData) {
          try { datosLogeadoResp = await firstValueFrom(this.RecepcionService.datosLogeado(Number(idUserForData))); } catch (e) { datosLogeadoResp = null; }
        }
      } catch (e) { datosLogeadoResp = null; }

      // Inicializar variables de secuencial. Reservaremos un bloque más abajo cuando sepamos la cantidad a enviar.
      let seqStart: number | null = null;
      // Último secuencial asignado localmente para evitar repeticiones
      let lastAssignedSeq: number | null = null;
      // Indicador si preservamos el primer número (y su secuencial base)
      let preserveFirstGlobal: boolean = false;
      let baseSeqFromFirstGlobal: number | null = null;

      // Generar PDF en background a partir del cuerpo (sin abrir modal)
        try {
          const dataForPdf: any = { cuerpo: this.contenidoCuerpo || '' };
          const blob = await this.pdfService.createPdfBlobFromData(dataForPdf, {});
          this.lastGeneratedPdfBlob = blob;
          console.log('[MoverMasivo] PDF generado en background, tamaño:', blob.size);
        } catch (e) {
          console.warn('[MoverMasivo] No se pudo generar PDF en background:', e);
        }

      // Enviar uno por uno usando la misma función del backend (/recepcion/asignartramite)
      const resultados: { id: any, success: boolean, message?: string }[] = [];

      // Determinar lista de trámites a enviar: si se pasaron selectedTramitesIds usamos esos, sino todos los cargados
      const lista = (Array.isArray(this.selectedTramitesIds) && this.selectedTramitesIds.length > 0)
        ? this.tramites.filter(t => this.selectedTramitesIds.includes(t.id_tramite || t.id))
        : this.tramites;

      // Reservar secuenciales atómicamente para evitar que cambien mientras procesa el lote
      try {
        const idEmpresaForSec = this.id_empresa ?? (datosLogeadoResp?.id_empresa ?? null);
        if (idEmpresaForSec && Array.isArray(lista) && lista.length > 0) {
          // Registrar primer trámite de la lista para preservarlo si vino con número
          const firstListaId = lista[0]?.id_tramite ?? lista[0]?.id ?? null;
          const firstListaHadNumero = !!(
            lista[0]?.numero_memorandum ||
            lista[0]?.num_documento_interno ||
            lista[0]?.num_documento_interno_asig ||
            (lista[0]?.asignacion && lista[0].asignacion.num_documento_interno)
          );
          // Detectar si queremos preservar el primer número y extraer su secuencial base
          const firstVal = lista[0] ? String(
            lista[0].numero_memorandum ||
            lista[0].num_documento_interno ||
            lista[0].num_documento_interno_asig ||
            (lista[0].asignacion && lista[0].asignacion.num_documento_interno) ||
            ''
          ) : null;
          let baseSeqFromFirst: number | null = null;
          if (firstVal) {
            const m = firstVal.match(/-(\d+)-M$/);
            if (m && m[1]) baseSeqFromFirst = Number(m[1]);
          }

          const preserveFirst = baseSeqFromFirst !== null;
          // Exponer a ámbito superior para uso en el loop
          preserveFirstGlobal = preserveFirst;
          baseSeqFromFirstGlobal = baseSeqFromFirst;
          const reserveCount = preserveFirst ? Math.max(0, lista.length - 1) : lista.length;

          try {
            const respReserve: any = reserveCount > 0 ? await firstValueFrom(this.RecepcionService.reservarSecuencialesMemorandum(Number(idEmpresaForSec), reserveCount)) : null;
            // La API devuelve 'start' que es el primer número reservado (1..)
            seqStart = respReserve ? Number(respReserve?.start ?? NaN) : null;
            if (seqStart !== null && isNaN(seqStart)) seqStart = null;
            console.log('[MoverMasivo] secuenciales reservados, start:', seqStart, 'cantidad:', reserveCount, 'resp:', respReserve);

            // Asignar números calculados a cada fila para mantener la vista consistente
            if (reserveCount > 0 && (seqStart !== null || baseSeqFromFirst !== null)) {
              for (let i = 0; i < lista.length; i++) {
                // preservamos la primera fila si corresponde
                if (i === 0 && preserveFirst) continue;
                const reservedIndex = preserveFirst ? (i - 1) : i;
                let seqNum: number;
                if (baseSeqFromFirst !== null) {
                  seqNum = baseSeqFromFirst + reservedIndex + 1;
                } else if (seqStart !== null) {
                  seqNum = seqStart + reservedIndex;
                } else {
                  continue;
                }

                const sec4 = String(seqNum).padStart(4, '0');
                const partes: string[] = [];
                const datos = datosLogeadoResp || {};
                const siglaEmp = String(datos?.sigla || datos?.sigla_empresa || '').trim();
                const siglaProyRaiz = String(datos?.sigla_proyecto_raiz || '').trim();
                const siglaProyActual = String(datos?.sigla_proyecto_actual || '').trim();
                const year = new Date().getFullYear();
                if (siglaEmp) partes.push(siglaEmp);
                if (siglaProyRaiz) partes.push(siglaProyRaiz);
                if (siglaProyActual) partes.push(siglaProyActual);
                partes.push(String(year));
                partes.push(sec4);
                partes.push('M');
                    try {
                      // No sobrescribir si la fila ya trae un numero_memorandum o num_documento_interno (preservar lo que viene de la BD)
                      const curId = lista[i]?.id_tramite ?? lista[i]?.id ?? null;
                      if (curId === firstListaId && firstListaHadNumero) {
                        console.log('[MoverMasivo] preservado primer elemento de lista por id', curId);
                      } else if (!lista[i].numero_memorandum) {
                        lista[i].numero_memorandum = partes.join('-');
                      } else {
                        console.log('[MoverMasivo] lista fila ya trae numero_memorandum, no se sobrescribe', lista[i].numero_memorandum);
                      }
                    } catch (e) { console.error('[MoverMasivo] error asignando numero_memorandum lista', i, e); }
              }
              this.cdr.detectChanges();
            }
          } catch (e) {
            console.warn('[MoverMasivo] No fue posible reservar secuenciales:', e);
            seqStart = null;
          }
        }
      } catch (e) {
        seqStart = null;
      }

      // Mostrar loader de progreso
      Swal.fire({
        title: 'Enviando trámites',
        html: 'Procesando 0 / ' + lista.length,
        didOpen: () => { Swal.showLoading(); },
        allowOutsideClick: false,
        showConfirmButton: false
      });
       // Identificadores del primer elemento en la lista para preservarlo en el envío
       const firstListaIdGlobal = lista[0]?.id_tramite ?? lista[0]?.id ?? null;
       const firstListaHadNumeroGlobal = !!(
         lista[0]?.numero_memorandum ||
         lista[0]?.num_documento_interno ||
         lista[0]?.num_documento_interno_asig ||
         (lista[0]?.asignacion && lista[0].asignacion.num_documento_interno)
       );
       let contador = 0;
       for (let idx = 0; idx < lista.length; idx++) {
        const t = lista[idx];
        contador++;
        try {
          // Actualizar texto del loader
          try {
            const htmlContainer = Swal.getHtmlContainer();
            if (htmlContainer) {
              const targetDiv = htmlContainer.querySelector('div');
              if (targetDiv) {
                try { (targetDiv as HTMLElement).innerHTML = `Procesando ${contador} / ${lista.length}`; } catch {}
              }
            }
          } catch {}

          const formData = new FormData();
          const idTram = t?.id_tramite ?? t?.id ?? null;
          if (!idTram) {
            resultados.push({ id: null, success: false, message: 'Trámite sin id' });
            continue;
          }

          // Generar número de Memorandum para este trámite (incrementando secuencial localmente)
          let numeroMemorandumForThis: string | null = null;
          try {
            const idEmpresaForSec = this.id_empresa ?? (datosLogeadoResp?.id_empresa ?? null);
            if (idEmpresaForSec) {
              // determinar secuencial actual: si seqStart está definido usamos seqStart+(contador-1)
              let seqActualNum: number | null = null;
               if (seqStart !== null) {
                 const reservedIndex = preserveFirstGlobal ? (idx - 1) : idx;
                 if (reservedIndex >= 0) {
                   seqActualNum = seqStart + reservedIndex;
                 } else {
                   seqActualNum = null;
                 }
               } else {
                // fallback: intentar obtener individualmente
                try {
                  const respSec: any = await firstValueFrom(this.RecepcionService.getSecuencialMemorandumRecepcion(Number(idEmpresaForSec)));
                  seqActualNum = Number(respSec?.next ?? respSec?.secuencial ?? NaN);
                  if (isNaN(seqActualNum)) seqActualNum = null;
                } catch (e) {
                  seqActualNum = null;
                }
              }

              // Evitar repeticiones locales: si el secuencial calculado es <= lastAssignedSeq,
              // incrementamos para asegurarnos un valor único y creciente
                if (seqActualNum !== null) {
                  if (lastAssignedSeq !== null && seqActualNum <= lastAssignedSeq) {
                    seqActualNum = lastAssignedSeq + 1;
                  }
                  lastAssignedSeq = seqActualNum;
                }

                if (seqActualNum !== null) {
                  const sec4 = String(seqActualNum).padStart(4, '0');
                  const siglaEmp = String(datosLogeadoResp?.sigla || datosLogeadoResp?.sigla_empresa || '').trim();
                  const siglaProyRaiz = String(datosLogeadoResp?.sigla_proyecto_raiz || '').trim();
                  const siglaProyActual = String(datosLogeadoResp?.sigla_proyecto_actual || '').trim();
                  const year = new Date().getFullYear();
                  const partes: string[] = [];
                  if (siglaEmp) partes.push(siglaEmp);
                  if (siglaProyRaiz) partes.push(siglaProyRaiz);
                  if (siglaProyActual) partes.push(siglaProyActual);
                  partes.push(String(year));
                  partes.push(sec4);
                  partes.push('M');
                const numeroMemorandum = partes.join('-');
                // Guardar localmente para usar como nombre de archivo PDF y para asignación
                numeroMemorandumForThis = numeroMemorandum;
                // También asignarlo a la fila para que se muestre en la tabla
                 try {
                   // No sobrescribir si el trámite ya trae un número desde la BD
                   // Además, si este trámite es el primero de la lista y ya tenía número, lo preservamos.
                      if (idTram === firstListaIdGlobal && firstListaHadNumeroGlobal) {
                        console.log('[MoverMasivo] enviarTramites - preservado primer tramite en lista', idTram);
                      } else if (!(t as any).numero_memorandum) {
                        // Solo asignar si la fila NO trae ya un numero_memorandum (queremos enviar lo que esté en la tabla)
                        (t as any).numero_memorandum = numeroMemorandum;
                        console.log('[MoverMasivo] enviarTramites asignado numero_memorandum:', numeroMemorandum, 'para tramite', idTram, 'contador', contador);
                      } else {
                        console.log('[MoverMasivo] enviarTramites - preservado numero existente en tabla para tramite', idTram, (t as any).numero_memorandum);
                      }
                  } catch (e) { console.error('[MoverMasivo] enviarTramites - error asignando numero_memorandum', idTram, e); }
              }
            }
          } catch (e) {
            // ignore
          }

          formData.append('id_tramite', String(idTram));
          formData.append('accion', 'DERIVAR');
          formData.append('descripcion', this.descripcion || '');

          const userLocal = this.authService?.user ?? JSON.parse(localStorage.getItem('user') || '{}');
          const idUsuario = userLocal?.id ?? userLocal?.id_usuario ?? null;
          if (idUsuario) formData.append('id_usuario_origen', String(idUsuario));

          // Destino: usamos el primer usuario PARA si existe
          const destino = this.usuarios_para?.[0]?.id ?? null;
          if (destino) formData.append('id_usuario_destino', String(destino));

           // Indicar al backend si el usuario decidió firmar el acta en esta asignación
           formData.append('firmar_acta', this.firmarActaEnAsignacion ? '1' : '0');
           if (this.firmarActaEnAsignacion && idUsuario) formData.append('id_usuario_firma', String(idUsuario));

          // Destinatarios
          (this.usuarios_de || []).forEach((u: any) => formData.append('de[]', String(u.id)));
          (this.usuarios_para || []).forEach((u: any) => formData.append('para[]', String(u.id)));
          (this.usuarios_copia || []).forEach((u: any) => formData.append('copia[]', String(u.id)));

          // Metadatos por trámite (usar selección si existe, sino el valor del trámite)
          const tipoDoc = this.selectedTipoDocumento?.[idTram] ?? t.id_tipo_documento ?? t.id_tipodocumento ?? null;
          const tipoTra = this.selectedTipoTramite?.[idTram] ?? t.id_tipo_tramite ?? t.id_tipo ?? null;
          const asuntoPara = this.selectedAsunto?.[idTram] ?? this.asunto ?? t.asunto ?? t.asunto_tramite ?? '';
          const numDoc = this.numero_documento_input || t.num_documento_interno || '';

           if (tipoDoc) formData.append('id_tipo_documento', String(tipoDoc));
           if (tipoTra) formData.append('id_tipo_tramite', String(tipoTra));
           if (asuntoPara) formData.append('asunto', String(asuntoPara));
           // Determinar el número final a enviar: priorizar el memorandum calculado por trámite
            // Priorizar el valor que ya figura en la tabla (No. Memorandum) si existe.
            const finalNumDoc = (t && t.numero_memorandum && String(t.numero_memorandum).trim())
              ? String(t.numero_memorandum).trim()
              : ((numeroMemorandumForThis && String(numeroMemorandumForThis).trim()) ? String(numeroMemorandumForThis) : (numDoc ? String(numDoc) : ''));
            if (finalNumDoc) formData.append('num_documento_interno', finalNumDoc);
           // Cuerpo: construir contenido por trámite (usar contenidoCuerpo global si está)
           try {
             const cuenta = Number(t.anexos_count ?? (Array.isArray(t.anexos_nombres) ? t.anexos_nombres.length : 0));
             const documentosTxt = cuenta === 1 ? '1 documento' : `${cuenta} documentos`;
             const cliente = String(t.cliente || t.cliente_nombre || t.nombre || '').trim();
              const asuntoT = String((this.selectedAsunto && this.selectedAsunto[idTram]) || this.asunto || t.asunto || t.asunto_tramite || '').trim();

             let cuerpoHtml = '';
             if (this.contenidoCuerpo && this.contenidoCuerpo.trim() !== '') {
               // Si el usuario proporcionó un cuerpo global, lo usamos tal cual
               cuerpoHtml = this.contenidoCuerpo;
             } else {
               // Construir cuerpo formal similar a VistaMasivaPreviaComponent
               const texto = `Me permito entregar el documento original más ${documentosTxt} referente al Trámite Nº ${t.numero_tramite || t.num_documento_interno || ''} ${cliente ? cliente : ''}${asuntoT ? ' - ' + asuntoT : ''}, para su respectiva gestión.`;
               cuerpoHtml = `<p>De mi consideración:</p><p>${texto}</p><p>Con sentimientos de distinguida consideración.</p>`;
             }

             // Enviar siempre el campo cuerpo_documento (como HTML)
             formData.append('cuerpo_documento', String(cuerpoHtml));

             // Generar el PDF específico para este trámite y adjuntarlo
             try {
                 const dataPdf: any = {
                   tramite: t,
                   cuerpo: cuerpoHtml,
                   para: this.usuarios_para,
                   de: this.usuarios_de,
                   copia: this.usuarios_copia,
                   asunto: asuntoT,
                   ciudad: this.ciudad,
                   tipo_documento_nombre: tipoDoc,
                   num_documento_interno: finalNumDoc,
                   anexos_nombres: Array.isArray(t.anexos_nombres) ? t.anexos_nombres : (t.anexos ? t.anexos.map((a:any)=>a.nombre_anexo) : []),
                   anexos_count: cuenta
                 };
                 const pdfBlob = await this.pdfService.createPdfBlobFromData(dataPdf, {});
                this.lastGeneratedPdfBlob = pdfBlob;
                // Usar num_documento_interno como nombre de archivo si está disponible,
                // sino usar el numeroMemorandum calculado anteriormente.
                // Preferir el número que ya está en la tabla para el nombre del archivo
                const filenameBase = (t && t.numero_memorandum && String(t.numero_memorandum).trim()) || (numDoc && String(numDoc).trim()) || numeroMemorandumForThis || 'memorandum';
                // Sanitizar el nombre básico
                let safeBase = String(filenameBase).replace(/[^a-zA-Z0-9-_\.]/g, '_');
                // Asegurar prefijo ACTA_ si el nombre no contiene la palabra 'acta' (case-insensitive)
                try {
                  if (!/acta/i.test(String(filenameBase))) {
                    safeBase = `ACTA_${safeBase}`;
                  }
                } catch (e) {
                  // en caso de error en la comprobación, no bloquear el envío
                }
                const filename = `${safeBase}.pdf`;
                // Enviar el PDF como 'archivos[]' para mantener compatibilidad con el backend
                formData.append('archivos[]', pdfBlob, filename);
               console.log('[MoverMasivo] PDF por trámite generado y adjuntado:', filename, 'tamaño:', pdfBlob.size);
              } catch (e) {
                console.warn('[MoverMasivo] error generando PDF por trámite:', e);
                // aunque falle la generación, ya hemos añadido cuerpo_documento
              }
           } catch (e) {
             // En caso de error inesperado, asegurarnos de enviar algo en cuerpo_documento
             try { formData.append('cuerpo_documento', String(this.contenidoCuerpo || t.cuerpo_documento || '')); } catch {}
           }

          // Validación: asegurarnos que el FormData contiene un archivo cuyo nombre incluya 'acta'
          try {
            const archivosForm: any[] = (formData.getAll && typeof formData.getAll === 'function') ? formData.getAll('archivos[]') : [];
            // También revisar 'archivo_pdf' por compatibilidad
            if ((!archivosForm || archivosForm.length === 0) && formData.get('archivo_pdf')) {
              archivosForm.push(formData.get('archivo_pdf'));
            }

            let hasActa = false;
            for (const af of archivosForm) {
              try {
                if (af && typeof af.name === 'string' && /acta/i.test(af.name)) { hasActa = true; break; }
              } catch (e) { /* ignore */ }
            }

            if (!hasActa) {
              // Intentar ver si podemos arreglar el nombre (si hay un archivo sin prefijo)
              if (Array.isArray(archivosForm) && archivosForm.length > 0) {
                const f0 = archivosForm[0];
                try {
                  const originalName = String(f0.name || '').trim();
                  const safe = originalName.replace(/[^a-zA-Z0-9-_\.]/g, '_');
                  const forcedName = `ACTA_${safe}`;
                  // Si es un Blob/File, reappend con nombre forzada
                  formData.delete('archivos[]');
                  formData.append('archivos[]', f0, forcedName);
                  console.warn('[MoverMasivo] archivo sin ACTA_ detectado, se renombró a:', forcedName);
                  hasActa = true;
                } catch (e) {
                  console.error('[MoverMasivo] no se pudo forzar nombre ACTA_ al archivo:', e);
                }
              }
            }

            if (!hasActa) {
              console.error('[MoverMasivo] envío cancelado: no se detectó archivo con "ACTA_" en el nombre para tramite', idTram);
              resultados.push({ id: idTram, success: false, message: 'Archivo de acta ausente o sin prefijo ACTA_' });
              // continuar con el siguiente trámite sin llamar al servicio
              continue;
            }
          } catch (e) {
            console.warn('[MoverMasivo] error validando nombre de archivo acta:', e);
          }

          // Llamada a la misma función del servicio
          await firstValueFrom(this.RecepcionService.asginartramite(formData));
          resultados.push({ id: idTram, success: true });
        } catch (err: any) {
          console.error('Error enviando tramite', t, err);
          resultados.push({ id: t?.id_tramite ?? t?.id ?? null, success: false, message: err?.message || 'Error' });
          // continuar con el siguiente trámite en lugar de abortar
        }
      }

      try { Swal.close(); } catch {}

      // Mostrar resumen
      const exitos = resultados.filter(r => r.success).length;
      const fallos = resultados.length - exitos;
      this.toast.success(`Envío completado: ${exitos} éxitos, ${fallos} fallos`);

      // Mostrar Swal resumen (envío masivo)
      try {
        await Swal.fire({
          title: 'Envío masivo',
          html: `<p>Envío masivo finalizado.</p><p><strong>${exitos}</strong> trámites enviados correctamente.<br/><strong>${fallos}</strong> con errores.</p>`,
          icon: 'success',
          confirmButtonText: 'Aceptar',
          allowOutsideClick: false
        });
      } catch (e) {
        // ignorar
      }

      // Emitir evento para que el padre refresque
      try { this.tramiteC.emit(); } catch {}

      // Cerrar el modal actual y asegurarnos que el usuario vea el listado
      try { this.modalService.dismissAll(); } catch (e) { console.warn('No se pudo cerrar el modal automáticamente', e); }
    }




    verDetalle(tramite: any) {
      this.setUsuarioDeFijo();

      // Normalizar usuarios para enviar solo los campos necesarios a la vista previa
      const normalizeUsuarios = (arr: any[] | undefined) => (Array.isArray(arr) ? arr : []).map(u => ({
        id: u?.id ?? null,
        sigla: String(u?.sigla || u?.sigla_usuario || '').trim(),
        nombre: String(u?.nombre || u?.nombres || u?.nombre_completo?.split(' ')?.[0] || '').trim(),
        apellido: String(u?.apellido || u?.apellidos || (u?.nombre_completo ? u.nombre_completo.split(' ').slice(1).join(' ') : '') || '').trim(),
        nombre_completo: String(u?.nombre_completo || `${u?.nombre || ''} ${u?.apellido || ''}`.trim()).trim(),
        titulo: String(u?.titulo || u?.titulo_usuario || u?.cargo || u?.puesto || '').trim(),
        puesto: String(u?.puesto || u?.area || u?.seccion || u?.subseccion || '').trim(),
        seccion: String(u?.subseccion || u?.area || u?.seccion || '').trim()
      }));

      // Determinar asunto a enviar: priorizar el asunto personalizado por trámite
      const asuntoPorTramite = tramite && tramite.id_tramite ? (this.selectedAsunto[tramite.id_tramite] ?? null) : null;
      const asuntoEnviar = asuntoPorTramite ?? this.asunto ?? tramite?.asunto ?? '';

      const prepareAndOpen = () => {
        const modalRef = this.modalService.open(VistaMasivaPreviaComponent, {
          centered: true,
          size: 'xl',
          backdrop: 'static'
        });

          const dataToSend: any = {
          asunto: asuntoEnviar,
          cuerpo: this.contenidoCuerpo,
          para: normalizeUsuarios(this.usuarios_para),
          de: normalizeUsuarios(this.usuarios_de),
          copia: normalizeUsuarios(this.usuarios_copia),
          // Pasar el trámite específico (el que se clickeó)
          tramite: tramite,
          // Preferir el número de memorandum calculado para la fila (numero_memorandum),
          // si no existe usar los campos previos
          num_documento_interno: tramite?.numero_memorandum || this.numero_documento_input || tramite?.num_documento_interno || this.tramiteDatos?.num_documento_interno,
          tipo_documento_nombre: tramite?.tipo_documento_nombre ?? this.tramiteDatos?.tipo_documento_nombre,
          ciudad: this.ciudad,
          // Usar anexos del propio trámite si existen, si no usar anexosGuardados como fallback
          anexos_nombres: [
            ...(((tramite?.anexos && Array.isArray(tramite.anexos) ? tramite.anexos : this.anexosGuardados) || [])
              .map((ax: any) => String(ax?.nombre_anexo || ax?.nombre || '').trim())
              .filter((n: string) => !!n))
          ],
          anexos_count: Array.isArray(tramite?.anexos) ? tramite.anexos.length : (Array.isArray(this.anexosGuardados) ? this.anexosGuardados.length : 0)
        };

        console.log('[MoverTramitesMasivo] data para vista previa:', dataToSend);
        modalRef.componentInstance.data = dataToSend;
      };

      // Obtener id real del usuario (soporta id / id_usuario)
      const userLocal = JSON.parse(localStorage.getItem('user') || '{}');
      const idUsuario = this.usuario_id ?? userLocal?.id ?? userLocal?.id_usuario ?? null;

      if (idUsuario) {
        // Enriquecer la fila 'DE' con los datos que el servicio devuelva antes de abrir la vista previa
        this.RecepcionService.datosLogeado(Number(idUsuario)).subscribe({
          next: (resp: any) => {
            console.log('DatosLogeado (verDetalle) respuesta:', resp);
            if (Array.isArray(this.usuarios_de) && this.usuarios_de.length > 0 && resp) {
              const de = this.usuarios_de[0];
              if (resp.titulo_usuario) de.titulo = resp.titulo_usuario;
              if (resp.sigla_usuario) de.sigla = resp.sigla_usuario;
              if (resp.proyecto_actual) de.puesto = resp.proyecto_actual;
              if (resp.sigla_proyecto_actual) de.seccion = resp.sigla_proyecto_actual;
              // otros campos opcionales
              if (resp.nombre_completo) de.nombre_completo = resp.nombre_completo;
            }
            this.cdr.detectChanges();
            prepareAndOpen();
          },
          error: (err) => {
            console.error('Error obteniendo DatosLogeado en verDetalle:', err);
            prepareAndOpen();
          }
        });
      } else {
        prepareAndOpen();
      }
    }










  /**
   * Devuelve el tiempo del trámite tomando la prioridad:
   * 1) tramite.dias
   * 2) tramite.info_tipo?.dias
   * 3) tramite.tiempo_tramite
   * 4) '0 días' por defecto
   */
  getTiempo(tramite: any): string {
    // Priorizar el tipo de trámite seleccionado por el usuario (si existe)
    try {
      const selTipoId = this.selectedTipoTramite?.[tramite?.id_tramite];
      if (selTipoId !== undefined && selTipoId !== null) {
        const tipo = (this.tiposTramiteOptions || []).find((x: any) => String(x.id_tipo_tramite) === String(selTipoId));
        const tiempoTipo = tipo?.tiempo_tramite ?? tipo?.tiempo ?? tipo?.dias;
        if (tiempoTipo !== undefined && tiempoTipo !== null && tiempoTipo !== '') {
          const n = Number(tiempoTipo);
          if (!isNaN(n)) return `${n} días`;
          return String(tiempoTipo);
        }
      }
    } catch (e) {
      // no bloquear la vista en caso de error inesperado
      console.error('Error al calcular tiempo desde tipo seleccionado', e);
    }

    // Devuelve el tiempo del trámite tomando la prioridad:
    // 1) tramite.dias
    // 2) tramite.info_tipo?.dias
    // 3) tramite.tiempo_tramite
    // 4) '0 días' por defecto
    const dias = tramite?.dias;
    const infoDias = tramite?.info_tipo?.dias;
    const tiempo = tramite?.tiempo_tramite;

    if (dias !== undefined && dias !== null && dias !== '') {
      return `${dias} días`;
    }
    if (infoDias !== undefined && infoDias !== null && infoDias !== '') {
      return `${infoDias} días`;
    }
    if (tiempo !== undefined && tiempo !== null && tiempo !== '') {
      const n = Number(tiempo);
      if (!isNaN(n)) return `${n} días`;
      return String(tiempo);
    }
    return '0 días';
  }

  /** Devuelve la clase CSS del badge según los días */
  getBadgeClass(tramite: any): string {
    // Determinar un valor numérico de días si es posible
    const parseDias = (v: any) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      if (!isNaN(n)) return n;
      if (typeof v === 'string') {
        const m = v.match(/(\d+)/);
        if (m) return Number(m[1]);
      }
      return null;
    };

    // 1) Si hay un tipo de trámite seleccionado para este trámite, usar su tiempo
    try {
      const selTipoId = this.selectedTipoTramite?.[tramite?.id_tramite];
      if (selTipoId !== undefined && selTipoId !== null) {
        const tipo = (this.tiposTramiteOptions || []).find((x: any) => String(x.id_tipo_tramite) === String(selTipoId));
        const tiempoTipo = tipo?.tiempo_tramite ?? tipo?.tiempo ?? tipo?.dias;
        const parsed = parseDias(tiempoTipo);
        if (parsed !== null) {
          if (parsed <= 0) return 'badge-light-danger';
          return 'badge-light-success';
        }
      }
    } catch (e) {
      console.error('Error calculando badge por tipo seleccionado', e);
    }

    // 2) Fallback: usar campos del propio trámite
    const dias = parseDias(tramite?.dias);
    const infoDias = parseDias(tramite?.info_type?.dias || tramite?.info_tipo?.dias);
    const tiempoDias = parseDias(tramite?.tiempo_tramite);

    const value = dias ?? infoDias ?? tiempoDias;

    // Si no hay información numérica, usar amarillo (advertencia)
    if (value === null) return 'badge-light-warning';

    // Si es cero o menor -> rojo
    if (value <= 0) return 'badge-light-danger';

    // Si tiene días positivos -> verde
    return 'badge-light-success';
  }



  cargarTiposDocumento(idEmpresa: number) {
    console.log('Iniciando carga de tipos de documento para empresa:', idEmpresa);

    this.RecepcionService.configTipoDocumento(idEmpresa).subscribe({
      next: (resp: any) => {
        console.log('Respuesta exitosa [Tipos Documento]:', resp);
        // La API puede devolver { data: [...] } o { tipo_documentos: [...] } o el arreglo directo
        let raw: any = resp?.data ?? resp?.tipo_documentos ?? resp ?? [];
        if (!Array.isArray(raw) && typeof raw === 'object') {
          // intentar extraer el primer arreglo que haya en la respuesta
          const firstArr = Object.values(raw).find(v => Array.isArray(v));
          raw = firstArr ?? [];
        }
        // Normalizar nombres de campo: algunos endpoints usan id_tipodocumento
        this.tipos_documento = (raw || []).map((it: any) => ({ ...it, id_tipo_documento: it.id_tipo_documento ?? it.id_tipodocumento ?? it.id_tipodoc }));
        this.tiposDocumentoOptions = this.tipos_documento;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar tipos de documento:', err);
      }
    });
  }

  cargarTiposTramite(idEmpresa: number) {
    console.log('Iniciando carga de tipos de trámite para empresa:', idEmpresa);

    this.RecepcionService.configTipoTramite(idEmpresa).subscribe({
      next: (resp: any) => {
        console.log('Respuesta exitosa [Tipos Trámite]:', resp);
        let raw: any = resp?.data ?? resp?.tipo_tramites ?? resp ?? [];
        if (!Array.isArray(raw) && typeof raw === 'object') {
          const firstArr = Object.values(raw).find(v => Array.isArray(v));
          raw = firstArr ?? [];
        }
        this.tipos_tramite = (raw || []).map((it: any) => ({ ...it, id_tipo_tramite: it.id_tipo_tramite ?? it.id_tipo ?? it.id }));
        this.tiposTramiteOptions = this.tipos_tramite;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar tipos de trámite:', err);
      }
    });
  }

  // Handlers para selects en la tabla
  onTipoDocumentoChange(tramite: any, value: any) {
    const v = value === '' || value === null || value === undefined ? null : (isNaN(Number(value)) ? value : Number(value));
    this.selectedTipoDocumento[tramite.id_tramite] = v;
  }

  onTipoTramiteChange(tramite: any, value: any) {
    const v = value === '' || value === null || value === undefined ? null : (isNaN(Number(value)) ? value : Number(value));
    this.selectedTipoTramite[tramite.id_tramite] = v;
  }

  // Aplica la selección del select de cabecera a toda la columna (todos los trámites cargados)
  applyHeaderTipoDocumento(value: any) {
    const v = value === '' || value === null || value === undefined ? null : (isNaN(Number(value)) ? value : Number(value));
    for (const t of this.tramites) {
      if (t && t.id_tramite) {
        this.selectedTipoDocumento[t.id_tramite] = v;
      }
    }
  }

  applyHeaderTipoTramite(value: any) {
    const v = value === '' || value === null || value === undefined ? null : (isNaN(Number(value)) ? value : Number(value));
    for (const t of this.tramites) {
      if (t && t.id_tramite) {
        this.selectedTipoTramite[t.id_tramite] = v;
      }
    }
  }

  applyHeaderAsunto(value: string) {
    const v = value == null ? '' : String(value);
    for (const t of this.tramites) {
      if (t && t.id_tramite) {
        this.selectedAsunto[t.id_tramite] = v;
      }
    }
  }

  onAsuntoInput(tramite: any, value: string) {
    if (!tramite || !tramite.id_tramite) return;
    this.selectedAsunto[tramite.id_tramite] = value;
  }

  // (No header filters — header selects are sólo visuales según solicitud)


  procesarUsuariosSeleccionados(usuarios: any[]) {
    this.usuarios_para = usuarios.filter(u => u.rol_envio === 'PARA');
    this.usuarios_de = usuarios.filter(u => u.rol_envio === 'DE');
    this.usuarios_copia = usuarios.filter(u => u.rol_envio === 'COPIA');

    this.setUsuarioDeFijo();
    this.cdr.detectChanges();
    try {
      const names = (arr: any[]) => (arr || []).map(x => x?.nombre_completo || x?.id).join(', ');
      console.log('[Recepcion/AsignarTramite] En tabla ASIGNAR -> PARA:', this.usuarios_para.length, `[${names(this.usuarios_para)}]`,
        '| DE:', this.usuarios_de.length, `[${names(this.usuarios_de)}]`,
        '| COPIA:', this.usuarios_copia.length, `[${names(this.usuarios_copia)}]`);
    } catch {}
  }



    BuscarUsuario() {
    console.log("Intentando abrir el buscador...");
    
    const modalRef = this.modalService.open(UsuarioEnvioMasivoComponent, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });
  
    modalRef.componentInstance.id_usuario = this.id_usuario;
    modalRef.componentInstance.id_empresa = this.id_empresa;
  
    // Pasar la lista actual del modal para edición/reemplazo
    const listaInicial = [
      ...this.usuarios_de.map(u => ({ ...u, rol_envio: 'DE' })),
      ...this.usuarios_para.map(u => ({ ...u, rol_envio: 'PARA' })),
      ...this.usuarios_copia.map(u => ({ ...u, rol_envio: 'COPIA' })),
    ];
    modalRef.componentInstance.personasIniciales = listaInicial;
  
    modalRef.componentInstance.usuariosAsignados.subscribe((usuarios: any[]) => {
      try {
        const cntPara = Array.isArray(usuarios) ? usuarios.filter(u => u.rol_envio === 'PARA').length : 0;
        const cntDe = Array.isArray(usuarios) ? usuarios.filter(u => u.rol_envio === 'DE').length : 0;
        const cntCopia = Array.isArray(usuarios) ? usuarios.filter(u => u.rol_envio === 'COPIA').length : 0;
        console.log('[Recepcion/AsignarTramite] usuariosAsignados recibido -> PARA:', cntPara, 'DE:', cntDe, 'COPIA:', cntCopia);
      } catch {}
      if (usuarios && usuarios.length > 0) {
        this.procesarUsuariosSeleccionados(usuarios);
        // Si hay al menos un PARA seleccionado, permitimos asignar aunque la regla de conteo lo bloquee
        if (this.usuarios_para.length > 0) {
          this.puedeAsignar = true;
        }
        console.log('[Recepcion/AsignarTramite] usuarios_para.length después de procesar:', this.usuarios_para.length);
        modalRef.close();
      }
    });
  }



    private setUsuarioDeFijo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    // Aceptar distintas formas del id que puede traer el objeto user (id o id_usuario)
    const id = this.usuario_id ?? user?.id ?? user?.id_usuario ?? null;
    if (!id) return;

    // Si ya existen destinatarios "DE" (por ejemplo venidos desde BuscarUsuario),
    // no sobrescribimos la lista completa. En su lugar, marcamos al usuario logueado
    // como rol fijo 'DE' si ya está presente o dejamos la lista tal cual.
    if (Array.isArray(this.usuarios_de) && this.usuarios_de.length > 0) {
      const idx = this.usuarios_de.findIndex(u => Number(u.id) === Number(id));
      if (idx >= 0) {
        this.usuarios_de[idx].rol_envio = 'DE';
        this.usuarios_de[idx].lockedRole = true;
        this.usuarios_de[idx].tiene_firma = !!user?.archivo_firma;
        // Intentar enriquecer la fila DE con datos adicionales desde el servicio
        try { this.DatosLogeado(Number(id)); } catch (e) { console.error('Error llamando DatosLogeado', e); }
      }
      this.cdr.detectChanges();
      return;
    }

    const nombre = String(
      user?.nombre_completo ||
        user?.full_name ||
        `${user?.name ?? ''} ${user?.surname ?? ''}`.trim() ||
        `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim() ||
        `${user?.nombres ?? ''} ${user?.apellidos ?? ''}`.trim()
    ).trim() || 'Usuario';

    // Incluir variantes del título y del proyecto que pueden venir con nombres distintos
    const titulo = String(
      user?.titulo || user?.titulo_usuario || user?.title || user?.cargo || user?.puesto || ''
    ).trim();
    const subseccion = String(
      user?.subseccion ||
        user?.subseccion_nombre ||
        user?.area_nombre ||
        user?.nombre_area ||
        user?.departamento ||
        user?.seccion ||
        ''
    ).trim() || '';

    // Proyecto actual (algunos objetos usan proyecto_actual / proyecto / proyecto_actual_nombre)
    const proyectoActual = String(user?.proyecto_actual || user?.proyecto || '').trim();
    const siglaProyecto = String(user?.sigla_proyecto_actual || user?.sigla_proyecto || '').trim();

    const entry: any = {
      id,
      nombre_completo: nombre,
      email: user?.email ?? '',
      sigla: String(user?.sigla || user?.sigla_usuario || '').trim(),
      titulo: titulo || null,
      empresa: String(user?.empresa || user?.empresa_nombre || '').trim(),
      // Para que la vista previa muestre el proyecto en la línea de extras,
      // colocamos proyectoActual en el campo 'puesto' (formatLista lo usará).
      puesto: proyectoActual || null,
      seccion: siglaProyecto || null,
      proyecto: proyectoActual || null,
      subseccion: subseccion,
      id_proyecto: user?.id_proyecto ?? null,
      rol_envio: 'DE',
      lockedRole: true,
      tiene_firma: !!user?.archivo_firma,
    };

    this.usuarios_de = [entry];
    // Enriquecer con datos adicionales que el servicio pueda devolver (siglas, títulos, proyectos)
    try { this.DatosLogeado(Number(id)); } catch (e) { console.error('Error llamando DatosLogeado', e); }

    const idEmpresa = this.id_empresa ?? user?.id_empresa ?? null;
    if (!entry.empresa && idEmpresa) {
      this.RecepcionService.cargarempresaid(Number(idEmpresa)).subscribe({
        next: (empresaResp: any) => {
          entry.empresa = empresaResp?.nombre_empresa || entry.empresa || 'Sin Empresa';
          this.cdr.detectChanges();
        },
        error: () => this.cdr.detectChanges()
      });
    }
  }

  


     DatosLogeado(id_usuario: number): void {
  try {
    console.log('validarFirma - id_usuario (enviando al servicio):', id_usuario);
    this.RecepcionService.datosLogeado(id_usuario).subscribe({
      next: (resp: any) => {
        console.log('Logeado:', resp);
        // Enriquecer la fila DE si existe
        if (Array.isArray(this.usuarios_de) && this.usuarios_de.length > 0 && resp) {
          const de = this.usuarios_de[0];
          // Mapear campos si existen en respuesta
          if (typeof resp.tiene_firma !== 'undefined') de.tiene_firma = !!resp.tiene_firma;
          if (resp.titulo_usuario) de.titulo = resp.titulo_usuario;
          // Usamos 'area' y 'subseccion' que la tabla ya muestra
          if (resp.proyecto_actual) de.area = resp.proyecto_actual; // sección actual
          if (resp.nombre_proyecto_raiz) de.subseccion = resp.nombre_proyecto_raiz; // subsección/raíz
          if (resp.empresa) de.institucion = resp.empresa;
          // Sigla opcional del usuario
          if (resp.sigla_usuario) de.sigla = resp.sigla_usuario;

          // Autogenerar Número de Documento con: SIGLA_EMPRESA-SIGLA_PROYECTO_RAIZ-SIGLA_PROYECTO_ACTUAL-AÑO-####-M
          const siglaEmp = String(resp.sigla || resp.sigla_empresa || '').trim();
          const siglaProyRaiz = String(resp.sigla_proyecto_raiz || '').trim();
          const siglaProyActual = String(resp.sigla_proyecto_actual || '').trim();
          const year = new Date().getFullYear();
          const idEmp = this.id_empresa ?? resp.id_empresa ?? null;

          // Armamos el PREFIJO (todo menos el secuencial y el "-M")
          // Ejemplo resultante: "GADM-COG-2026" o "GADM-FIN-2026"
          const partesPrefijo: string[] = [];
          if (siglaEmp) partesPrefijo.push(siglaEmp);
          if (siglaProyRaiz) partesPrefijo.push(siglaProyRaiz);
          if (siglaProyActual) partesPrefijo.push(siglaProyActual);
          partesPrefijo.push(String(year));
          const prefijo = partesPrefijo.join('-');

          if (idEmp && prefijo) {
            this.RecepcionService.getSecuencialMemorandumRecepcion(Number(idEmp), prefijo).subscribe({
              next: (r: any) => {
                const sec4 = String(r?.secuencial || '0001').padStart(4, '0');
                this.numero_documento_input = `${prefijo}-${sec4}-M`;
                this.cdr.detectChanges();
              },
              error: (err) => {
                console.error('getSecuencialMemorandumRecepcion - error:', err);
                this.numero_documento_input = `${prefijo}-0001-M`;
                this.cdr.detectChanges();
              }
            });
          } else {
            // Si falta id_empresa o prefijo, generamos con secuencial por defecto
            this.numero_documento_input = `${prefijo || 'SIN-PREFIJO'}-0001-M`;
            this.cdr.detectChanges();
          }
        }
      },
      error: (err) => {
        console.error('validarFirma - error servicio:', err);
      },
      complete: () => this.decInit()
    });
  } catch (e) {
    console.error('DatosLogeado - error:', e);
    this.decInit();
  }
}






}
