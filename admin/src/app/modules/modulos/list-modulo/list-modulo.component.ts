import { ChangeDetectorRef, Component } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModulosService } from '../service/modulos.service';
import { CreateModuloComponent } from '../create-modulo/create-modulo.component';
import { EditModuloComponent } from '../edit-modulo/edit-modulo.component';
import { DeleteModuloComponent } from '../delete-modulo/delete-modulo.component';
import { SeccionesComponent } from '../../secciones/secciones.component';
import { ActivatedRoute, Router } from '@angular/router';


@Component({
  selector: 'app-list-modulo',
  templateUrl: './list-modulo.component.html',
  styleUrls: ['./list-modulo.component.scss']
})
export class ListModuloComponent {

  search: string = '';
  modulos: any[] = [];
  isLoading$: any;

  totalPages: number = 0;
  currentPage: number = 1;
   idProyecto: number = 0;

  constructor(
    public modalService: NgbModal,
    public modulosService: ModulosService,
     private router: Router,
    private route: ActivatedRoute,
     private cdr: ChangeDetectorRef
  ) { }

 


ngOnInit() {
  this.route.queryParams.subscribe(params => {
    this.idProyecto = +params['id_proyecto'] || 0;
    console.log('Proyecto recibido en la URL:', this.idProyecto); // <-- prueba

    this.listModulos(1); // Cargar módulos del proyecto
  });
}

   listModulos(page = 1) {
    this.modulosService.listModulos(page, this.search, this.idProyecto).subscribe((resp: any) => {
      console.log(resp);
      this.modulos  = resp.modulos || [];
       console.log('Modulos en componente:', this.modulos);
      this.totalPages = resp.total || 0;
      this.currentPage = page;
       this.cdr.detectChanges();
    });
  }

  loadPage($event: any) {
    this.listModulos($event);
  }

  createModulo() {
    const modalRef = this.modalService.open(CreateModuloComponent, { centered: true, size: 'xl' });
    // PASAR idProyecto al modal
   modalRef.componentInstance.idProyecto = this.idProyecto;
    modalRef.componentInstance.ModuloC.subscribe((modulo: any) => {
      this.modulos.unshift(modulo);
    });
  }

  editModulo(MODULO: any) {
    const modalRef = this.modalService.open(EditModuloComponent, { centered: true, size: 'xl' });
    modalRef.componentInstance.MODULO_SELECTED = MODULO;

    modalRef.componentInstance.ModuloE.subscribe((modulo: any) => {
      const INDEX = this.modulos.findIndex((e: any) => e.id == MODULO.id);
      if (INDEX != -1) {
        this.modulos[INDEX] = modulo;
      }
    });
  }

  deleteModulo(MODULO: any) {
    const modalRef = this.modalService.open(DeleteModuloComponent, { centered: true, size: 'md' });
    modalRef.componentInstance.MODULO_SELECTED = MODULO;

    modalRef.componentInstance.ModuloD.subscribe(() => {
      const INDEX = this.modulos.findIndex((e: any) => e.id == MODULO.id);
      if (INDEX != -1) {
        this.modulos.splice(INDEX, 1);
      }
    });
  }

  verSecciones(MODULO: any) {
  console.log('MODULO seleccionado:', MODULO);
  this.router.navigate(['modulos/list', MODULO.id, 'secciones']);
}

crearIndexacion(modulo: any) {
  this.router.navigate(['/indexacion/list'], {
    queryParams: { id_modulo: modulo.id }
  });
}






}
