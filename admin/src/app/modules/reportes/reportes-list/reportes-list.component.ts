import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ReportesService } from '../service/reportes.service';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reportes-list',
  templateUrl: './reportes-list.component.html',
  styleUrls: ['./reportes-list.component.scss']
})
export class ReportesListComponent {

  search: string = '';
  PROYECTOS: any[] = [];
  isLoading$: any;

  totalPages: number = 0;
  currentPage: number = 1;

  tipoReporte: string = '1';

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
    public ReporteService: ReportesService,
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
  
    this.ReporteService.SeccionSelect(user.id).subscribe({
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
    this.ReporteService.getReporte(this.tipoReporte)
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
    this.ReporteService.getReporte(this.tipoReporte)
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

  exportarExcel() {
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

  

      this.procesarExcel("inventario_tramites.xlsx", serie_id, subserie_id, s_id, ss_id, sss_id);
      return;
    }
  
    // Caso inesperado
    Swal.fire({
      icon: 'info',
      title: 'Tipo de reporte no válido para Excel',
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
    Swal.fire({
      title: 'Procesando el Excel...',
      text: 'Espere por favor',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
  
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
  
    // Log para que veas en la consola que AHORA SÍ van todos
    console.log("Enviando reporte con estos IDs:", data);
  
    this.ReporteService.exportarExcel(data)
      .subscribe({
        next: (resp: any) => {
          const blob = new Blob([resp], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombreArchivo;
          a.click();
          window.URL.revokeObjectURL(url);
          
          Swal.close();
          this.toast.success('Excel generado con éxito');
        },
        error: (err) => {
          Swal.close();
          Swal.fire('Error', 'No se pudo generar el Excel', 'error');
        }
      });
  }

}
