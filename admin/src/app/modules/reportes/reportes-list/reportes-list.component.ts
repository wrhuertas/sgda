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

  /**
   * El inventario se arma sobre una serie, así que hay que bajar por el árbol
   * hasta llegar a ella. Devuelve el mensaje del primer paso que falta, o null
   * si la selección ya está completa.
   *
   * Una subsección puede tener series directas y además sub-subsecciones, por
   * eso la sub-subsección sólo se exige cuando en ese nivel no hay series.
   */
  private validarInventario(): string | null {
    if (!this.seccionId) {
      return 'Debe seleccionar una Sección para generar el Inventario.';
    }

    if (this.subsecciones.length === 0) {
      return 'La Sección seleccionada no tiene Subsecciones, por lo que no hay series que inventariar.';
    }

    if (!this.subseccionId) {
      return 'Debe seleccionar una Subsección.';
    }

    if (this.series.length === 0 && this.subsubsecciones.length === 0) {
      return 'La Subsección seleccionada no tiene Series Documentales.';
    }

    if (this.series.length === 0 && !this.subsubseccionId) {
      return 'Debe seleccionar una Sub-Subsección.';
    }

    if (this.series.length === 0) {
      return 'La Sub-Subsección seleccionada no tiene Series Documentales.';
    }

    if (!this.serieId) {
      return 'Debe seleccionar una Serie Documental.';
    }

    return null;
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
  
    // 3. Inventario de Trámites (requiere bajar hasta la serie)
    if (this.tipoReporte === '3') {
      const error = this.validarInventario();

      if (error) {
        Swal.fire({
          icon: 'warning',
          title: 'Falta Selección',
          text: error,
        });
        return;
      }

      this.procesarExcel(
        "inventario_tramites.xlsx",
        this.serieId,
        this.subserieId,
        this.seccionId,
        this.subseccionId,
        this.subsubseccionId
      );
      return;
    }

    // 4 y 5. Organización Posicional / Estructural (sólo requieren la Sección)
    if (this.tipoReporte === '4' || this.tipoReporte === '5') {
      const esPosicional = this.tipoReporte === '4';
      const nombreReporte = esPosicional ? 'Posicional' : 'Estructural';

      if (!this.seccionId) {
        Swal.fire({
          icon: 'warning',
          title: 'Falta Selección',
          text: `Debe seleccionar una Sección para generar la Organización ${nombreReporte}.`,
        });
        return;
      }

      const archivo = esPosicional
        ? 'organizacion_posicional.xlsx'
        : 'organizacion_estructural.xlsx';

      this.procesarExcel(archivo, null, null, this.seccionId);
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
          this.mostrarErrorExcel(err);
        }
      });
  }

  /**
   * La petición pide un blob, así que cuando el backend responde con un error
   * el cuerpo también llega como blob. Hay que leerlo para poder mostrar el
   * mensaje real (por ejemplo, que la serie elegida no tiene documentos).
   */
  private mostrarErrorExcel(err: any) {
    const cuerpo = err?.error;

    if (!(cuerpo instanceof Blob)) {
      Swal.fire('Error', cuerpo?.message || 'No se pudo generar el Excel', 'error');
      return;
    }

    cuerpo.text().then((texto: string) => {
      let mensaje = 'No se pudo generar el Excel';

      try {
        mensaje = JSON.parse(texto)?.message || mensaje;
      } catch {
        // El cuerpo no era JSON: se queda el mensaje genérico
      }

      Swal.fire('Atención', mensaje, 'warning');
    });
  }

}
