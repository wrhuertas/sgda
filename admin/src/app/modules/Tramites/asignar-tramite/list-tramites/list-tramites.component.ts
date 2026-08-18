import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';
import { AsignarTramiteComponent } from '../asignar-tramite.component';
import { AsignartramiteService } from '../service/asignartramite.service';
import { RegistrarAsignacionComponent } from '../registrar-asignacion/registrar-asignacion.component';
import { CrearTramiteComponent } from '../crear-tramite/crear-tramite.component';
import { SeguimientoComponent } from '../seguimiento/seguimiento.component';
import { VerDatosComponent } from '../ver-datos/ver-datos.component';
import Swal from 'sweetalert2';
import { DocumentoViewerService } from 'src/app/modules/indexacion-serie/ver-documento/documento-viewer.service';

@Component({
  selector: 'app-list-tramites',
  templateUrl: './list-tramites.component.html',
  styleUrls: ['./list-tramites.component.scss']
})
export class ListTramitesComponent {

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
  userLogeado: any;

    showAnexosModal = false;
  tituloAnexos = '';
  // Anexos agrupados por el documento (oficio / memorándum) al que pertenecen
  gruposAnexos: { titulo: string; anexos: any[] }[] = [];

  constructor(

        public modalService: NgbModal,
        public AsignarTramite: AsignartramiteService,
        public toast: ToastrService,
        private cdr: ChangeDetectorRef,
        public authService: AuthService,
        private documentoViewer: DocumentoViewerService,
      ) { }
  
      ngOnInit(): void {
      
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user || !user.id) {
        console.error('Usuario no logeado');
        this.toast.error('Usuario no logeado');
        return;
    }

    // Guardamos el objeto completo
    this.userLogeado = user; 
    
    // Mantenemos tus asignaciones actuales
    this.id_empresa = user.id_empresa;
    this.id_usuario = user.id;

    console.log('Objeto completo del usuario:', this.userLogeado);
        
        if (!user || !user.id) {
          console.error('Usuario no logeado');
          this.toast.error('Usuario no logeado');
          return;
        }

        this.id_usuario = user.id; 

        this.isLoading$ = this.AsignarTramite.isLoading$;
        this.listatramites();
        this.cargarArea();
        
      }





    listatramites(page = 1) {
      // 👈 AQUÍ PON EL LOG DEL USUARIO
        console.log('Usuario logeado actualmente:', {
          id: this.id_usuario,
          empresa: this.id_empresa
        });

        if (!this.id_empresa || !this.id_usuario) {
          this.toast.error('Datos del usuario incompletos');
          return;
        }

        this.AsignarTramite
          .listTramites(
            this.id_empresa,
            this.id_usuario, // 👈 NUEVO
            page,
            this.search
          )
          .subscribe({
            next: (resp: any) => {
              console.log('Respuesta TRAMITES:', resp);

              // Manejar diferentes formas de respuesta del backend de forma defensiva
              let data: any = resp?.data ?? resp;
              // Algunos endpoints devuelven { data: { data: [...] , total: ..., current_page: ... } }
              if (data && data.data && Array.isArray(data.data)) {
                data = data.data;
              }

              // Asignar listado y paginación con fallbacks
              this.tramites = Array.isArray(data) ? data : (data?.items ?? []);
              this.totalPages = resp?.total ?? resp?.last_page ?? resp?.total ?? 0;
              this.currentPage = resp?.current_page ?? resp?.page ?? page;
              this.cdr.detectChanges();
            },
            error: (err: any) => {
              console.error('Error al obtener listadetramites:', err);
              this.toast.error('No se pudo cargar la lista de trámites');
              this.tramites = [];
              this.totalPages = 0;
              this.cdr.detectChanges();
            }
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
     
             this.AsignarTramite.configArea(user.id).subscribe({
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

             const modalRef = this.modalService.open(CrearTramiteComponent, {
               centered: true,
               size: 'xl',
               backdrop: 'static'
             });

             modalRef.componentInstance.id_usuario = user?.id ?? null;

             // Cuando se crea el trámite se recarga el listado
             modalRef.componentInstance.tramiteC.subscribe(() => {
               this.listatramites();
             });
           }
         
           abrirModalNuevoTramite(idTipo: any, nombreTipo: string) {
            
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
           const modalRef = this.modalService.open(RegistrarAsignacionComponent, {
             centered: true,
             size: 'xl',
             backdrop: 'static'
           });
     
           // PASAMOS EL ID Y LOS DEMÁS DATOS
          modalRef.componentInstance.id_tramite = tramite.asignacion?.id_tramite; // acceder al objeto anidado
          modalRef.componentInstance.tramiteDatos = tramite;           // todo el objeto con asignacion, cliente, usuario_origen, etc.
          modalRef.componentInstance.asunto = tramite.tramite?.asunto || ''; // enviar asunto del trámite
          
          console.log('Asunto del trámite enviado al modal:', tramite.tramite?.asunto);
          // Enviar también el id del registro de asignación (priorizar campos comunes)
          const idAsignacion = tramite.asignacion?.id_asignacion_tramite ?? tramite.asignacion?.id_asignacion ?? tramite.asignacion?.id;
          modalRef.componentInstance.id_asignacion = idAsignacion;
          console.log('Enviando id_asignacion al modal:', idAsignacion);

          // Sin trámite, la raíz del hilo es id_asignacion_padre: hace de
          // id_tramite para que las nuevas asignaciones sigan colgando de ahí.
          // Sólo viaja cuando NO hay trámite; si hubiera, el modal debe seguir
          // comportándose como siempre.
          const sinTramite = !tramite.asignacion?.id_tramite;

          modalRef.componentInstance.id_asignacion_padre = sinTramite
            ? (tramite.asignacion?.id_asignacion_padre ?? idAsignacion)
            : null;
     
           modalRef.componentInstance.areas = this.areas;
           modalRef.componentInstance.tramiteC.subscribe(() => {
             this.listatramites(this.currentPage);
           });
         }
     
         // Abrir modal local para ver únicamente los anexos del trámite
         abrirAnexos(tramite: any) {
           const anexos = Array.isArray(tramite?.anexos) ? tramite.anexos : [];

           // Mapear anexos al formato esperado
           const anexosFormateados = anexos.map((anexo: any) => ({
             nombre_anexo: anexo.nombre_original || anexo.nombre_archivo || 'Anexo sin nombre',
             tipo_documento: anexo.extension?.toUpperCase() || 'ARCHIVO',
             ruta: anexo.ruta_archivo,
             // Los anexos que vienen del inicio del trámite no guardan tamaño,
             // en ese caso mostramos su descripción y de dónde salieron.
             descripcion: this.getDescripcionAnexo(anexo),
             tipo: 'anexo',
             id_anexo: anexo.id_anexo ?? anexo.id_anexo_tramite ?? anexo.id ?? null,
             id_documento: anexo.id_documento ?? anexo.id_documento_tramite ?? null,
             // Documento (oficio / memorándum) al que pertenece el anexo
             documento_tipo: anexo.documento_tipo || '',
             documento_numero: anexo.documento_numero || '',
             _raw: anexo
           }));

           this.gruposAnexos = this.agruparAnexosPorDocumento(anexosFormateados);
           const numeroTramite = tramite?.tramite?.numero_tramite || tramite?.asignacion?.numero_tramite || tramite?.numero_tramite || '';
           this.tituloAnexos = `Anexos del Trámite ${numeroTramite}`.trim();
           this.showAnexosModal = true;
           try { this.cdr.detectChanges(); } catch {}
         }

         // Agrupa los anexos bajo el documento al que pertenecen:
         // "Anexos de Oficio: XXX", "Anexos de Memorando: YYY"
         private agruparAnexosPorDocumento(anexos: any[]): { titulo: string; anexos: any[] }[] {
           const grupos = new Map<string, { titulo: string; anexos: any[] }>();
           const resultado: { titulo: string; anexos: any[] }[] = [];

           (anexos || []).forEach(anexo => {
             const tipo = String(anexo?.documento_tipo || '').trim();
             const numero = String(anexo?.documento_numero || '').trim();
             const clave = `${tipo}||${numero}`;

             if (!grupos.has(clave)) {
               const etiqueta = tipo ? `Anexos de ${tipo}` : 'Anexos del trámite';
               const grupo = { titulo: `${etiqueta}: ${numero || 'S/N'}`, anexos: [] as any[] };
               grupos.set(clave, grupo);
               resultado.push(grupo);
             }

             grupos.get(clave)!.anexos.push(anexo);
           });

           return resultado;
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

         // Ver un anexo en el modal-plantilla (VerDocumentoComponent).
         // Se trae el PDF como base64 vía API para evitar problemas de CORS con /storage.
         verAnexo(a: any) {
           const ruta = (a?.ruta || '').toString().trim();
           if (!ruta) { this.toast.warning('No se encontró la ruta del anexo'); return; }

           Swal.fire({ title: 'Cargando anexo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
           this.AsignarTramite.verAnexoBase64(ruta).subscribe({
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
