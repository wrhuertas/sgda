import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { DespachoService } from '../service/despacho.service';
import { AsignarTramiteComponent } from '../asignar-tramite/asignar-tramite.component';
import { AuthService } from 'src/app/modules/auth';
import { VerDatosComponent } from '../ver-datos/ver-datos.component';
import { SeguimientoComponent } from '../seguimiento/seguimiento.component';
import { NuevoTramiteComponent } from '../nuevo-tramite/nuevo-tramite.component';
import Swal from 'sweetalert2';
import { DocumentoViewerService } from 'src/app/modules/indexacion-serie/ver-documento/documento-viewer.service';

@Component({
  selector: 'app-listar-tramite',
  templateUrl: './listar-tramite.component.html',
  styleUrls: ['./listar-tramite.component.scss']
})
export class ListarTramiteComponent {
@Output() TramitesE: EventEmitter<any> = new EventEmitter();
   search: string = '';
   tramites: any[] = [];
   isLoading$: any;

   id_empresa!: number;
   id_usuario!: number;
@Input() TRAMITE_SELECTED: any;

   nombre: string = '';
   estado: number = 1;
   totalPages: number = 0;
   currentPage: number = 1;
   areas: any[] = []; // cargar desde backend

   user: any;

   isLoading: any;

  // Modal de anexos
  showAnexosModal = false;
  tituloAnexos = '';
  // Anexos agrupados por el documento (oficio / memorándum) al que pertenecen
  gruposAnexos: { titulo: string; anexos: any[] }[] = [];

  constructor(
      
        public modalService: NgbModal,
        public DespachoService: DespachoService,
        public toast: ToastrService,
        private cdr: ChangeDetectorRef,
        public authService: AuthService,
        private documentoViewer: DocumentoViewerService,
      ) { }

    // Ver un anexo en el modal-plantilla (VerDocumentoComponent).
    // Se trae el PDF como base64 vía API para evitar problemas de CORS con /storage.
    verAnexo(a: any) {
      const ruta = (a?.ruta || '').toString().trim();
      if (!ruta) { this.toast.warning('No se encontró la ruta del anexo'); return; }

      Swal.fire({ title: 'Cargando anexo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      this.DespachoService.verAnexoBase64(ruta).subscribe({
        next: (resp: any) => {
          try { Swal.close(); } catch {}
          if (resp?.success && resp?.base64) {
            this.documentoViewer.abrirVer({ pdfBase64: resp.base64 });
          } else {
            this.toast.error(resp?.message || 'No se pudo obtener el anexo');
          }
        },
        error: (err) => {
          try { Swal.close(); } catch {}
          console.error('Error trayendo anexo:', err);
          this.toast.error('No se pudo cargar el anexo');
        }
      });
    }
  
      ngOnInit(): void {
       
         
         const user = JSON.parse(localStorage.getItem('user') || '{}');

         if (user && user.id_empresa) {
           this.id_empresa = user.id_empresa;
         } else {
           console.error('Usuario sin empresa:', user);
         }

         if (user && user.id) {
           this.id_usuario = user.id;
         } else {
           console.error('Usuario sin ID:', user);
         }

         this.isLoading$ = this.DespachoService.isLoading$;
         this.listatramites();
         this.cargarArea();
         
       }





      listatramites(page = 1) {
         if (!this.id_empresa || !this.id_usuario) return;
       
         // Opcional: limpiar la lista actual para dar feedback visual de carga
         // this.tramites = []; 
       
         this.DespachoService
           .listTramitesdespacho(this.id_empresa, this.id_usuario, page, this.search)
           .subscribe((resp: any) => {
             this.tramites = resp.data || [];
             this.totalPages = resp.total;
             this.currentPage = resp.current_page;
             
             // Si el usuario buscó algo y no hay resultados en ninguna categoría
             if (this.search && this.tramites.length === 0) {
               this.toast.info('No se encontraron trámites con esos criterios');
             }
       
             this.cdr.detectChanges();
           });
       }
      
       filtrarTramites(prioridad: string) {
         if (!this.tramites || this.tramites.length === 0) return [];
       
         return this.tramites.filter(item => {
           // Determinar categoría desde asignacion.categoria primero, luego por tipo_documento
           const categoriaAsignacion = (item.asignacion?.categoria || '').toLowerCase();
           const prioridadDoc = (item.tramite?.tipo_documento_prioridad || '').toLowerCase();
           const nombreDoc = (item.tramite?.tipo_documento_nombre || '').toLowerCase();
           const etiqueta = categoriaAsignacion || prioridadDoc || nombreDoc; // usar categoría si existe
           const p = prioridad.toLowerCase();
       
           // Nueva categoría: Rechazados por estado_registro = 3
           if (p === 'rechazados') return Number(item?.tramite?.estado_registro) === 3;

           if (p === 'urgente') return etiqueta.includes('urgente');
           if (p === 'especial') return etiqueta.includes('especial');
           
           if (p === 'normal') {
             // Es "Normal" si no contiene las otras palabras clave
             return !etiqueta.includes('urgente') && !etiqueta.includes('especial');
           }
       
           return false;
         });
       }

       getPrioridadBadge(item: any): { label: string; cls: string } {
         const p = String(item?.tramite?.tipo_documento_prioridad || '').toLowerCase();
         if (p.includes('urgente')) return { label: 'Urgente', cls: 'badge-light-danger' };
         if (p.includes('especial')) return { label: 'Especial', cls: 'badge-light-primary' };
         if (p.includes('normal')) return { label: 'Normal', cls: 'badge-light-success' };
         // fallback por nombre si no hay prioridad explícita
         const n = String(item?.tramite?.tipo_documento_nombre || '').toLowerCase();
         if (n.includes('urgente')) return { label: 'Urgente', cls: 'badge-light-danger' };
         if (n.includes('especial')) return { label: 'Especial', cls: 'badge-light-primary' };
         return { label: 'Normal', cls: 'badge-light-success' };
       }

       calcularDiasRestantes(item: any): number | null {
         const diasTipo = item?.tramite?.tipo_tramite_dias;
         if (diasTipo === null || diasTipo === undefined || diasTipo === '') return null;
         const totalDias = Number(diasTipo);
         if (!Number.isFinite(totalDias)) return null;

         const createdAt = item?.tramite?.created_at || item?.asignacion?.created_at;
         if (!createdAt) return null;

         const inicio = new Date(createdAt);
         if (isNaN(inicio.getTime())) return null;

         const ahora = new Date();
         const diffMs = ahora.getTime() - inicio.getTime();
         const diasTranscurridos = Math.floor(diffMs / (1000 * 60 * 60 * 24));
         return totalDias - diasTranscurridos;
       }

      calcularVigencia(item: any): { label: string; colorClass: string; bloqueado: boolean } {
        const dias = this.calcularDiasRestantes(item);
        if (dias === null) {
          return { label: '-', colorClass: 'badge-light', bloqueado: false };
        }

        if (dias >= 3) return { label: 'Vigente', colorClass: 'badge-light-success', bloqueado: false };
        if (dias >= 1) return { label: 'Próximo a Vencer', colorClass: 'badge-light-warning', bloqueado: false };
        return { label: 'Caducado', colorClass: 'badge-light-danger', bloqueado: true };
      }


       cargarArea() {
        const user = this.authService.user;

        if (!user || !user.id) {
          console.warn("No se encontró el usuario logeado");
          return;
        }

        console.log("ID USUARIO ENVIADO:", user.id);

        this.DespachoService.configArea(user.id).subscribe({
          next: (resp: any) => {
            console.log("Respuesta recibida del servidor:", resp);

            if (resp && resp.areas) {
              this.areas = resp.areas;
              console.log("Áreas asignadas correctamente:", this.areas);
            } else {
              console.error("La respuesta no contiene 'areas'", resp);
              this.areas = [];
            }

            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error("Error en la petición de Áreas:", err);
            this.toast.error('No se pudo cargar las áreas');
          }
        });
      }



      crearTramite() {
        const user = this.authService.user;
      
        // --- ABRE EL MODAL DIRECTO COMO EN TU EJEMPLO DE SEGUIMIENTO ---
        const modalRef = this.modalService.open(NuevoTramiteComponent, {
          centered: true,
          size: 'xl',
          backdrop: 'static'
        });
      
        // PASAMOS LOS DATOS QUE NECESITAS
        modalRef.componentInstance.id_usuario = user.id;
        modalRef.componentInstance.id_empresa = this.id_empresa;
      
        // Si necesitas pasar algún dato vacío o inicial para que no truene:
        modalRef.componentInstance.id_tipo_documento = null; 
        modalRef.componentInstance.nombre_tipo_documento = '';
      
        modalRef.componentInstance.tramiteC.subscribe(() => {
          this.listatramites(this.currentPage);
        });
        // -------------------------------------------------------------
      }
    
      abrirModalNuevoTramite(idTipo: any, nombreTipo: string) {
        const modalRef = this.modalService.open(NuevoTramiteComponent, {
          centered: true,
          size: 'xl',
          backdrop: 'static'
        });
    
        // Pasamos ambos datos al componente hijo
        modalRef.componentInstance.id_tipo_documento = idTipo;
        modalRef.componentInstance.nombre_tipo_documento = nombreTipo;
    
        modalRef.componentInstance.tramiteC.subscribe(() => {
          this.listatramites();
        });
      }

 

    


      verSeguimiento(tramite: any) {
      const modalRef = this.modalService.open(SeguimientoComponent, {
        centered: true,
        size: 'xl',
        backdrop: 'static'
      });

      // PASAMOS EL ID Y LOS DEMÁS DATOS
      modalRef.componentInstance.id_tramite = tramite.tramite?.id_tramite; // acceder al objeto anidado
      modalRef.componentInstance.tramiteDatos = tramite;           // todo el objeto

      modalRef.componentInstance.areas = this.areas;
      modalRef.componentInstance.tramiteC.subscribe(() => {
        this.listatramites(this.currentPage);
      });
    }





    asignarTramite(tramite: any) {
      const modalRef = this.modalService.open(AsignarTramiteComponent, {
        centered: true,
        size: 'xl',
        backdrop: 'static'
      });

      // PASAMOS EL ID Y LOS DEMÁS DATOS
      modalRef.componentInstance.id_tramite = tramite.asignacion?.id_tramite; // acceder al objeto anidado
      modalRef.componentInstance.tramiteDatos = tramite;           // todo el objeto con asignacion, cliente, usuario_origen, etc.
      modalRef.componentInstance.asunto = tramite.tramite?.asunto || ''; // enviar asunto del trámite
      
      console.log('Asunto del trámite enviado al modal:', tramite.tramite?.asunto);

      modalRef.componentInstance.areas = this.areas;
      modalRef.componentInstance.tramiteC.subscribe(() => {
        this.listatramites(this.currentPage);
      });
    }

    // Abrir modal local para ver únicamente los anexos del trámite
    abrirAnexos(tramite: any) {
      const anexos = Array.isArray(tramite?.anexos) ? tramite.anexos : [];

      // Mapear anexos al formato esperado. Conservamos ids útiles para firmar (id_anexo / id_documento)
      const anexosFormateados = anexos.map((anexo: any) => ({
        nombre_anexo: anexo.nombre_original || anexo.nombre_archivo || 'Anexo sin nombre',
        tipo_documento: anexo.extension?.toUpperCase() || 'ARCHIVO',
        ruta: anexo.ruta_archivo,
        // Los anexos que vienen del inicio del trámite no guardan tamaño,
        // en ese caso mostramos su descripción y de dónde salieron.
        descripcion: this.getDescripcionAnexo(anexo),
        tipo: 'anexo',
        // ids que el modal de vista/firmado pueda necesitar
        id_anexo: anexo.id_anexo ?? anexo.id_anexo_tramite ?? anexo.id ?? null,
        id_documento: anexo.id_documento ?? anexo.id_documento_tramite ?? tramite.asignacion?.id_documento ?? null,
        // Documento (oficio / memorándum) al que pertenece el anexo
        documento_tipo: anexo.documento_tipo || '',
        documento_numero: anexo.documento_numero || '',
        // mantener referencia al objeto original por si se necesita más info
        _raw: anexo
      }));

      this.gruposAnexos = this.agruparAnexosPorDocumento(anexosFormateados);
      const numeroTramite = tramite?.tramite?.numero_tramite || tramite?.asignacion?.numero_tramite || '';
      this.tituloAnexos = `Anexos del Trámite ${numeroTramite}`.trim();
      this.showAnexosModal = true;
      try { this.cdr.detectChanges(); } catch {}
    }

    // Agrupa los anexos bajo el documento al que pertenecen:
    // "Anexos de Oficio: XXX", "Anexos de Memorando: YYY"
    private agruparAnexosPorDocumento(anexos: any[]): { titulo: string; anexos: any[] }[] {
      const grupos = new Map<string, { titulo: string; anexos: any[] }>();

      (anexos || []).forEach(anexo => {
        const tipo = String(anexo?.documento_tipo || '').trim();
        const numero = String(anexo?.documento_numero || '').trim();
        const clave = `${tipo}||${numero}`;

        if (!grupos.has(clave)) {
          const etiqueta = tipo ? `Anexos de ${tipo}` : 'Anexos del trámite';
          grupos.set(clave, {
            titulo: `${etiqueta}: ${numero || 'S/N'}`,
            anexos: []
          });
        }

        grupos.get(clave)!.anexos.push(anexo);
      });

      return Array.from(grupos.values());
    }

    // Descripción del anexo: tamaño cuando existe, si no la descripción guardada
    private getDescripcionAnexo(anexo: any): string {
      const tamanio = Number(anexo?.tamanio);
      if (Number.isFinite(tamanio) && tamanio > 0) {
        return `Tamaño: ${(tamanio / 1024).toFixed(2)} KB`;
      }

      const descripcion = String(anexo?.descripcion || '').trim();
      if (descripcion) return descripcion;

      return anexo?.origen === 'tramite' ? 'Anexo del trámite' : '';
    }

    cerrarAnexos() {
      this.showAnexosModal = false;
      this.gruposAnexos = [];
      this.tituloAnexos = '';
      try { this.cdr.detectChanges(); } catch {}
    }



  verMasDatos(tramite: any) {
      const modalRef = this.modalService.open(VerDatosComponent, {
        centered: true,
        size: 'xl',
        backdrop: 'static'
      });

      // PASAMOS EL ID Y LOS DEMÁS DATOS
      modalRef.componentInstance.id_tramite = tramite.tramite?.id_tramite; // acceder al objeto anidado
      modalRef.componentInstance.tramiteDatos = tramite;           // todo el objeto

      modalRef.componentInstance.areas = this.areas;
      modalRef.componentInstance.tramiteC.subscribe(() => {
        this.listatramites(this.currentPage);
      });
    }






    loadPage($event: any) {
      this.listatramites($event);
    }
}
