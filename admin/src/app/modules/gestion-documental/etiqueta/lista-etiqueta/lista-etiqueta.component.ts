import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { EtiquetaService } from '../service/etiqueta.service';
import { RutaetiquetaComponent } from '../rutaetiqueta/rutaetiqueta.component';
import { EditarEtiquetaComponent } from '../editar-etiqueta/editar-etiqueta.component';
import { GenerarEtiquetaComponent } from '../generar-etiqueta/generar-etiqueta.component';
import { GenerarBarrasComponent } from '../generar-barras/generar-barras.component';

@Component({
  selector: 'app-lista-etiqueta',
  templateUrl: './lista-etiqueta.component.html',
  styleUrls: ['./lista-etiqueta.component.scss']
})
export class ListaEtiquetaComponent implements OnInit {

  etiquetas: any[] = [];
  isLoading = false;

  search = '';
  paginaActual = 1;
  totalPaginas = 1;
  totalRegistros = 0;
  porPagina = 15;

  usuarioActual: any = null;

  constructor(
    public modalService: NgbModal,
    private etiquetaService: EtiquetaService,
    private toast: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.usuarioActual = JSON.parse(localStorage.getItem('user') || '{}');
    this.listarEtiquetas();
  }

  listarEtiquetas(page: number = 1): void {
    const idEmpresa = this.usuarioActual?.id_empresa;

    if (!idEmpresa) {
      this.toast.error('No se identificó la empresa del usuario');
      return;
    }

    this.isLoading = true;

    this.etiquetaService.listarEtiquetas({
      id_empresa: idEmpresa,
      page,
      per_page: this.porPagina,
      search: this.search
    }).subscribe({
      next: (resp: any) => {
        this.etiquetas = resp?.data || [];
        this.paginaActual = resp?.current_page || 1;
        this.totalPaginas = resp?.last_page || 1;
        this.totalRegistros = resp?.total || 0;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error listando etiquetas:', err);
        this.etiquetas = [];
        this.isLoading = false;
        this.toast.error('No se pudieron cargar las etiquetas');
        this.cdr.detectChanges();
      }
    });
  }

  buscar(): void {
    this.listarEtiquetas(1);
  }

  cambiarPagina(page: number): void {
    if (page < 1 || page > this.totalPaginas) { return; }
    this.listarEtiquetas(page);
  }

  // Abre el selector de ruta: sección -> subsección -> serie -> subserie,
  // y desde la ubicación de esa serie se genera la etiqueta.
  abrirEtiqueta(): void {
    const modalRef = this.modalService.open(RutaetiquetaComponent, {
      centered: true,
      size: 'xl',
      scrollable: true
    });

    // Al cerrar se refresca, por si se generó una etiqueta nueva
    modalRef.closed.subscribe(() => this.listarEtiquetas(this.paginaActual));
  }

  generarEtiqueta(etiqueta: any): void {
    const modalRef = this.modalService.open(GenerarEtiquetaComponent, {
      centered: true,
      size: 'xl'
    });
    modalRef.componentInstance.ETIQUETA_SELECTED = etiqueta;
  }

  generarBarras(etiqueta: any): void {
    const modalRef = this.modalService.open(GenerarBarrasComponent, {
      centered: true,
      size: 'xl'
    });
    modalRef.componentInstance.ETIQUETA_SELECTED = etiqueta;
  }

  editarEtiqueta(etiqueta: any): void {
    const modalRef = this.modalService.open(EditarEtiquetaComponent, {
      centered: true,
      size: 'xl',
      scrollable: true
    });
    modalRef.componentInstance.ETIQUETA_SELECTED = etiqueta;

    modalRef.closed.subscribe(() => this.listarEtiquetas(this.paginaActual));
  }

  eliminarEtiqueta(etiqueta: any): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Vas a eliminar la etiqueta: ${etiqueta?.ruta}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f1416c',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (!result.isConfirmed) { return; }

      this.etiquetaService.eliminarEtiqueta(etiqueta.id).subscribe({
        next: () => {
          this.toast.success('Etiqueta eliminada');
          this.listarEtiquetas(this.paginaActual);
        },
        error: () => this.toast.error('No se pudo eliminar la etiqueta')
      });
    });
  }
}
