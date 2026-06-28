import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { RespaldoService } from '../service/respaldo.service';

@Component({
  selector: 'app-listado-respaldo',
  templateUrl: './listado-respaldo.component.html',
  styleUrls: ['./listado-respaldo.component.scss']
})
export class ListadoRespaldoComponent {
  
  search: string = '';
  PROYECTOS: any[] = [];
  isLoading$: any;

  totalPages: number = 0;
  currentPage: number = 1;

  tipoReporte: string = '';

// Variables de selección
seccionId: any = '';
subseccionId: any = '';
subsubseccionId: any = '';
serieId: any = '';
subserieId: any = '';
subseries: any[] = [];

// Listas filtradas
subsecciones: any[] = [];
subsubsecciones: any[] = [];
series: any[] = [];

  subseccionSeleccionada!: number;
  serieSeleccionada!: number;
  subserieSeleccionada!: number;

  usuarioActual: any = null;

  @Input() proyecto: any;
  authService: any;
  areas: any;

  secciones: any[] = [];
  seccionSeleccionada: any = '';

  constructor(
    public modalService: NgbModal,
    public ReslapdoService: RespaldoService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toast: ToastrService
  ) { }

  ngOnInit() {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.usuarioActual = JSON.parse(userData);
      // Llamamos a cargarSeccion DESPUÉS de asegurarnos que tenemos al usuario
      this.cargarSeccion();
    }
  }


  cargarSeccion() {
    // Usamos el usuario que ya cargamos desde localStorage en ngOnInit
    const user = this.usuarioActual;
  
    if (!user || !user.id) {
      console.warn("No se encontró el ID del usuario para cargar secciones");
      return;
    }
  
    this.ReslapdoService.SeccionSelect(user.id).subscribe({
      next: (resp: any) => {
        // Validamos que venga 'secciones' o 'proyectos' desde Laravel
        if (resp && resp.secciones) {
          this.secciones = resp.secciones;
        } else if (resp && resp.proyectos) {
          this.secciones = resp.proyectos;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error cargando secciones", err);
      }
    });
  }

  onSeccionChange() {
    const sel = this.secciones.find(s => s.id_proyecto == this.seccionId);
    this.subsecciones = sel ? sel.subsecciones : [];
    
    // Limpieza en cascada hacia abajo
    this.subseccionId = '';
    this.subsubseccionId = '';
    this.serieId = '';
    this.subserieId = '';
    
    this.subsubsecciones = [];
    this.series = [];
    this.subseries = [];
  }
  
  onSubseccionChange() {
    const sel = this.subsecciones.find(s => s.id_proyecto == this.subseccionId);
    this.subsubsecciones = sel ? sel.subsecciones : [];
    this.series = sel ? sel.series : []; 
    
    // Limpieza en cascada
    this.subsubseccionId = '';
    this.serieId = '';
    this.subserieId = '';
    
    this.subseries = [];
  }
  
  onSubSubseccionChange() {
    const sel = this.subsubsecciones.find(s => s.id_proyecto == this.subsubseccionId);
    this.series = sel ? sel.series : [];
    
    // Limpieza en cascada
    this.serieId = '';
    this.subserieId = '';
    
    this.subseries = [];
  }

  onSerieChange() {
    const sel = this.series.find(s => s.id_serie == this.serieId);
    this.subseries = sel ? (sel.hijos || sel.hijos_recursivos || []) : [];
    
    // Limpieza del último nivel
    this.subserieId = '';
  }

  getPDF() {
    this.ReslapdoService.getReporte(this.tipoReporte)
      .subscribe(resp => {
        console.log(resp);
      });
  }

  exportarPDF() {
    Swal.fire({
      title: 'Procesando PDF...',
      text: 'Espere por favor',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // Aquí puedes llamar a tu servicio PDF
    this.ReslapdoService.getReporte(this.tipoReporte)
      .subscribe({
        next: (resp: any) => {
          // Lógica de descarga PDF (si aplica)
          Swal.close();
          console.log("PDF generado:", resp);
        },
        error: (err) => {
          Swal.close();
          Swal.fire('Error', 'No se pudo generar el PDF', 'error');
          console.error(err);
        }
      });
  }

  exportarRespaldo() {
    // 1. Cuadro de Clasificación
    if (this.tipoReporte === '1') {
      this.procesarExcel("cuadro_clasificacion.xlsx");
      return;
    }
  
    // 2. Tabla de Plazos
    if (this.tipoReporte === '2') {
      this.procesarExcel("tabla_plazos.xlsx");
      return;
    }
  
    // 3. Inventario de Trámites (Validación de Serie Obligatoria)
    if (this.tipoReporte === '3') {
      // Mantenemos los IDs individuales tal cual están en el combo
      const s_id = this.seccionId;
      const ss_id = this.subseccionId;
      const sss_id = this.subsubseccionId;
      const serie_id = this.serieId;
      const subserie_id = this.subserieId;

      // Validación de seguridad
      if (!s_id) {
        Swal.fire({
          icon: 'warning',
          title: 'Falta Selección',
          text: 'Debe seleccionar al menos una Sección para generar el Inventario.',
        });
        return;
      }

  

      // Generar respaldo de archivos en formato ZIP
      this.procesarExcel("backup_archivos.zip", serie_id, subserie_id, s_id, ss_id, sss_id);
      return;
    }
  
    // Caso inesperado
    Swal.fire({
      icon: 'info',
      title: 'Tipo de reporte no válido',
    });
  }
  
  private procesarExcel(
    nombreArchivo: string, 
    idSerie: any = null, 
    idSubserie: any = null, 
    idSec: any = null, 
    idSubsec: any = null, 
    idSubsubsec: any = null
  ) {
    // Construcción del objeto de datos REAL
    const data = {
      tipoReporte: this.tipoReporte,
      id_empresa: this.usuarioActual?.id_empresa,
      usuario_id: this.usuarioActual?.id,
      
      // Aquí mandamos cada nivel por su propio carril
      id_serie: idSerie,
      id_subserie: idSubserie,
      id_seccion: idSec,
      id_subseccion: idSubsec,
      id_subsubseccion: idSubsubsec
    };
  
    // 1) Intentar obtener preview de tamaño
    Swal.fire({ title: 'Calculando tamaño...', text: 'Espere por favor', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    this.ReslapdoService.getRespaldoArchivosPreview(data).subscribe({
      next: (info: any) => {
        Swal.close();
        const size = info?.size_human || 'desconocido';
        const count = info?.files_count != null ? info.files_count : undefined;
        const extra = count !== undefined ? `<br/>Archivos incluidos: <strong>${count}</strong>` : '';
        Swal.fire({
          title: 'Confirmar Descarga',
          html: `El ZIP pesa aproximadamente: <strong>${size}</strong>${extra}.<br/>¿Desea iniciar la descarga?`,
          showCancelButton: true,
          confirmButtonText: 'Descargar',
          cancelButtonText: 'Cancelar'
        }).then((dl) => {
          if (!dl.isConfirmed) return;
          this.descargarZipArchivos(data, nombreArchivo);
        });
      },
      error: () => {
        Swal.close();
        // Fallback sin tamaño
        Swal.fire({
          title: 'Confirmar Descarga',
          text: '¿Está seguro de descargar el respaldo de archivos?',
          showCancelButton: true,
          confirmButtonText: 'Descargar',
          cancelButtonText: 'Cancelar'
        }).then((dl) => {
          if (!dl.isConfirmed) return;
          this.descargarZipArchivos(data, nombreArchivo);
        });
      }
    });
  }

  private descargarZipArchivos(data: any, nombreArchivo: string) {
    Swal.fire({ title: 'Generando ZIP...', text: 'Preparando descarga...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    this.ReslapdoService.exportarRespaldo(data).subscribe({
      next: (resp: any) => {
        const blob = new Blob([resp], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        window.URL.revokeObjectURL(url);
        Swal.close();
        this.toast.success('Respaldo de archivos generado con éxito');
      },
      error: () => {
        Swal.close();
        Swal.fire('Error', 'No se pudo generar la descarga', 'error');
      }
    });
  }


  // Añade esto dentro de export class ListadoRespaldoComponent { ... }

  generarRespaldoBD() {
    // 1) Elegir modo: con datos o solo estructura
    Swal.fire({
      title: 'Respaldo de Base de Datos',
      html: `
        <div class="text-start">
          <p class="mb-2">Seleccione el tipo de respaldo que desea generar:</p>
          <div class="form-check">
            <input class="form-check-input" type="radio" name="mode" id="modeFull" value="full" checked>
            <label class="form-check-label" for="modeFull">Con datos (completo)</label>
          </div>
          <div class="form-check">
            <input class="form-check-input" type="radio" name="mode" id="modeSchema" value="schema">
            <label class="form-check-label" for="modeSchema">Solo estructura (vacía)</label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const modeEl = (document.querySelector('input[name="mode"]:checked') as HTMLInputElement);
        return modeEl ? modeEl.value : 'full';
      }
    }).then((res) => {
      if (!res.isConfirmed) return;
      const mode = res.value as 'full'|'schema';

      // 2) Previsualizar tamaño
      Swal.fire({ title: 'Calculando tamaño...', text: 'Espere por favor', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      this.ReslapdoService.getRespaldoBDPreview(mode).subscribe({
        next: (info: any) => {
          Swal.close();
          const size = info?.size_human || 'desconocido';
          Swal.fire({
            title: 'Tamaño Estimado',
            html: `<p class="mb-1">El archivo SQL pesa aproximadamente: <strong>${size}</strong></p><p>¿Desea iniciar la descarga?</p>`,
            showCancelButton: true,
            confirmButtonText: 'Descargar',
            cancelButtonText: 'Cancelar'
          }).then((dl) => {
            if (!dl.isConfirmed) return;
            // 3) Descargar
            Swal.fire({ title: 'Generando Respaldo...', text: 'Preparando descarga...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            this.ReslapdoService.descargarRespaldoBD(mode).subscribe({
              next: (resp: any) => {
                const blob = new Blob([resp], { type: 'application/sql' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = info?.suggested_name || `respaldo_sistema_${new Date().getTime()}.sql`;
                a.click();
                window.URL.revokeObjectURL(url);
                Swal.close();
                this.toast.success('Respaldo de base de datos generado con éxito');
              },
              error: () => {
                Swal.close();
                Swal.fire('Error', 'No se pudo generar el respaldo de la base de datos', 'error');
              }
            });
          });
        },
        error: () => {
          Swal.close();
          Swal.fire('Error', 'No se pudo calcular el tamaño del respaldo', 'error');
        }
      });
    });
  }

}
