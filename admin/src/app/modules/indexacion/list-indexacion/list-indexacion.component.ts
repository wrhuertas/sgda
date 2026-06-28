import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateIndexacionComponent } from '../create-indexacion/create-indexacion.component';
import { IndexacionService } from '../service/indexacion.service';
import { ChangeDetectorRef } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { environment } from './../../../../environments/environment';

@Component({
  selector: 'app-list-indexacion',
  templateUrl: './list-indexacion.component.html',
  styleUrls: ['./list-indexacion.component.scss'],
})
export class ListIndexacionComponent {
  idProyecto: number | null = null;
  nombreProyecto!: string;
  idModulo: number | null = null;
  isLoading: boolean = true;
  indexaciones: any[] = [];
  error: string | null = null;

  public todosLosTitulos: string = '';

  valorBusqueda: string = ''; // para el filtro de búsqueda
  documentosPaginados: any = { data: [] };
  // resultados paginados
  currentPage: number = 1;
  totalPages: number = 0;
  // Aquí guardamos los campos_extra del primer registro
  camposExtra: any = null;
  listaTitulos: string[] = []; // Aquí almacenas los títulos extraídos

  // Para enlazar los inputs:
  valoresInputs: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public modalService: NgbModal,
    public indexacionService: IndexacionService,
    private toast: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      console.log('📌 Query Params completos:', params);

      const idProyectoParam = params['idProyecto'];
      const idModuloParam = params['id_modulo'];

      this.idProyecto = idProyectoParam !== undefined ? +idProyectoParam : null;
      this.idModulo = idModuloParam !== undefined ? +idModuloParam : null;

      console.log('Proyecto recibido desde queryParams:', this.idProyecto);
      console.log('Módulo recibido desde queryParams:', this.idModulo);

      if (this.idProyecto !== null) {
        this.indexacionService.getProyectoById(this.idProyecto).subscribe(
          (resp: any) => {
            console.log('📌 Respuesta completa del backend:', resp);

            if (resp.success) {
              this.nombreProyecto = resp.data.nombre;
              this.indexaciones = resp.indexaciones || [];
              console.log('Nombre del proyecto:', this.nombreProyecto);

              this.cdr.detectChanges();

              // Llamadas dependientes de idModulo
              if (this.idModulo !== null) {
                this.listIndexaciones(this.idModulo);
                this.obtenerCamposExtra();
              }
            } else {
              console.warn('Proyecto no encontrado');
            }
          },
          (error) => {
            console.error('Error al traer el proyecto:', error);
          }
        );
      } else {
        console.warn('⚠️ idProyecto no recibido en queryParams.');
      }
    });

    this.obtenerCamposExtra();
  }

  listIndexaciones(idModulo: number) {
    this.isLoading = true;
    this.indexacionService.listIndexaciones(idModulo).subscribe({
      next: (resp: any) => {
        this.indexaciones = resp.indexaciones || [];
        // Si hay indexaciones, tomar los campos_extra del primero
        if (this.indexaciones.length > 0) {
          this.camposExtra = this.indexaciones[0].campos_extra;
        } else {
          this.camposExtra = null;
        }
      },
      error: (err) => {
        console.error('Error al cargar indexaciones', err);
        this.indexaciones = [];
        this.camposExtra = null;
      },
      complete: () => (this.isLoading = false),
    });
  }
  // list-indexacion.component.ts
crearIndexacion() {
  const modalRef = this.modalService.open(CreateIndexacionComponent, {
    centered: true,
    size: 'xl',
     windowClass: 'modal-xxl-custom'
  });

  // ✅ Enviamos datos generales al modal
  modalRef.componentInstance.idProyecto = this.idProyecto;
  modalRef.componentInstance.nombreProyecto = this.nombreProyecto;

  // ✅ Si hay al menos una indexación, le mandamos su id
  if (this.indexaciones && this.indexaciones.length > 0) {
    modalRef.componentInstance.idIndexacion = this.indexaciones[0].id_indexacion;
    console.log('Enviando idIndexacion al modal:', this.indexaciones[0].id_indexacion);
  } else {
    modalRef.componentInstance.idIndexacion = null;
    console.warn('No hay indexaciones todavía, creando una nueva');
  }

  // Refrescar después de cerrar/guardar
  modalRef.componentInstance.IndexacionC.subscribe(() => this.obtenerCamposExtra());
  modalRef.closed.subscribe(() => this.obtenerCamposExtra());
}


  abrirModalAgregar() {
    console.log('Abrir modal para agregar indexación');
    // Aquí luego puedes abrir un modal o navegar a otro componente
  }

  obtenerCamposExtra() {
    console.log('🔎 ID del proyecto recibido:', this.idProyecto);
    if (this.idProyecto === null) {
      console.error('idProyecto es null');
      return;
    }

    this.isLoading = true;
    this.error = null;

    // Enviamos idProyecto en lugar de idModulo
    this.indexacionService
      .obtenerCamposExtra({ idProyecto: this.idProyecto })
      .subscribe({
        next: (resp: any) => {
          console.log('✅ RESPUESTA COMPLETA:', resp);
          if (!resp || !resp.campos_extra) {
            console.warn('❌ campos_extra no está presente en la respuesta');
          } else {
            console.log('📦 campos_extra recibido:', resp.campos_extra);
          }

          const registros = resp.campos_extra || [];

          if (registros.length > 0) {
            const titulos = registros.map((campo: any) => campo.titulo);
            this.todosLosTitulos = titulos.join(', ');
            this.listaTitulos = titulos;
            this.valoresInputs = new Array(this.listaTitulos.length).fill('');
            console.log('📝 Títulos extraídos:', this.todosLosTitulos);
          } else {
            console.warn('⚠️ registros está vacío, no hay títulos');
            this.todosLosTitulos = '';
            this.listaTitulos = [];
            this.valoresInputs = [];
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ Error al obtener campos_extra:', err);
          this.todosLosTitulos = '';
          this.listaTitulos = [];
          this.valoresInputs = [];
        },
        complete: () => {
          console.log('✅ Llamada a obtenerCamposExtra completada.');
          this.isLoading = false;
        },
      });
  }

  buscarIndexaciones(page = 1): void {
    // Concatenar todos los valores de inputs separados por espacio
    const campo_valor = this.valoresInputs
      .filter((v) => v && v.trim() !== '')
      .join(' ');

    const filtros = {
      id_modulo: this.idModulo,
      id_proyecto: this.idProyecto, // 👉 ahora se envía también el idProyecto
      campo_valor: campo_valor || null, // Enviar null si no hay nada
    };

    this.indexacionService.listIndexacionesBusqueda(page, filtros).subscribe({
      next: (resp: any) => {
        this.documentosPaginados = resp.documentos || { data: [] };
        this.cdr.detectChanges();
        this.currentPage = this.documentosPaginados.current_page;
        this.totalPages = this.documentosPaginados.last_page;

        if (this.documentosPaginados.data.length > 0) {
          this.toast.success('Se encontraron documentos', 'Éxito');
        } else {
          this.toast.info('No se encontraron documentos', 'Información');
        }
      },
      error: (err) => {
        this.toast.error('Error al obtener documentos', 'Error');
      },
    });
  }

  URL_BACKEND: string = environment.URL_BACKEND;

  getArchivoUrl(documento: any): string | null {
    if (!documento.archivo_url) return null;
    try {
      const archivos = JSON.parse(documento.archivo_url);
      if (archivos.length > 0) {
        let ruta = archivos[0].replace(/^public\//, ''); // quitar "public/"
        // Codificar caracteres especiales
        ruta = ruta.split('/').map(encodeURIComponent).join('/');
        return `${this.URL_BACKEND}${ruta}`;
      }
      return null;
    } catch {
      return null;
    }
  }
}
