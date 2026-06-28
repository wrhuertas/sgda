import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateDocumentoSessionesComponent } from '../create-documento-sessiones/create-documento-sessiones.component';
import { SeccionesService } from '../service/sessiones.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { VerDocumentoSessionesComponent } from '../ver-documento-sessiones/ver-documento-sessiones.component';

@Component({
  selector: 'app-detalle-sessiones',
  templateUrl: './detalle-sessiones.component.html',
  styleUrls: ['./detalle-sessiones.component.scss']
})
export class DetalleSessionesComponent implements OnInit {
  idSeccion!: number;
  idModulo!: number;

   documentosPaginados: any = null; // para guardar toda la paginación
   busquedaEjecutada = false;


  formularioBusqueda!: FormGroup;
  documentos: any[] = [];
  currentPage = 1;
  totalPages = 1;

  constructor(
    private route: ActivatedRoute,
    private modalService: NgbModal,
    private documentoService: SeccionesService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef, // <--- aquí
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.idSeccion = +this.route.snapshot.paramMap.get('idSeccion')!;
    this.idModulo = +this.route.snapshot.paramMap.get('idModulo')!;

    this.formularioBusqueda = this.fb.group({
      tipologia: [''],
      tema: [''],
      estanteria: [''],
      caja: ['']
    });

    // Opcional: cargar documentos inicialmente si quieres
    // this.buscar();
  }

  agregarDocumento() {
    const modalRef = this.modalService.open(CreateDocumentoSessionesComponent, { centered: true, size: 'xl' });
    modalRef.componentInstance.idSeccion = this.idSeccion;
    modalRef.componentInstance.idModulo = this.idModulo;

    modalRef.componentInstance.DocumentoCreado.subscribe((documento: any) => {
      console.log('Documento creado:', documento);
      this.buscar(); // Refrescar lista tras creación
      modalRef.close();
    });
  }



// En buscar():
buscar(page = 1): void {
  const filtros = this.formularioBusqueda.value;
  filtros['id_seccion'] = this.idSeccion;

  this.documentoService.listDocumentos(page, filtros).subscribe((resp: any) => {
    this.documentosPaginados = resp.documentos;
    this.currentPage = resp.documentos.current_page;
    this.totalPages = resp.documentos.last_page;
    this.busquedaEjecutada = true;
    this.cdr.detectChanges();

    if (this.documentosPaginados.data.length > 0) {
      this.toastr.success('Se encontraron documentos', 'Éxito');
    } else {
      this.toastr.info('No se encontraron documentos', 'Información');
    }
  }, error => {
    this.toastr.error('Error al obtener documentos', 'Error');
  });
}





  cambiarPagina(page: number): void {
    if (page > 0 && page <= this.totalPages) {
      this.buscar(page);
    }
  }


tieneFiltros(): boolean {
  const filtros = this.formularioBusqueda.value;
  return Object.values(filtros).some(valor => String(valor).trim() !== '');
}


verDocumento(documento: any): void {
  console.log('Documento que se envía al modal:', documento);
  const modalRef = this.modalService.open(VerDocumentoSessionesComponent, { centered: true, size: 'xl' });
  
  // Pasamos los datos que necesites al modal
  modalRef.componentInstance.documento = documento;

  // Si quieres manejar algún evento de cierre o actualización desde el modal:
  modalRef.result.then((result) => {
    console.log('Modal cerrado con resultado:', result);
    // Opcional: refrescar lista u otra acción
  }).catch((reason) => {
    // modal cerrado sin acción (e.g. click fuera)
  });
}


}
