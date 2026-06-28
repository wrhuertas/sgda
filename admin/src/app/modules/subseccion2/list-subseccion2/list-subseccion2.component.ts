import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { Subseccion2Service } from '../service/subseccion2.service';
import { CreateSubseccion2Component } from '../create-subseccion2/create-subseccion2.component';

@Component({
  selector: 'app-list-subseccion2',
  templateUrl: './list-subseccion2.component.html',
  styleUrls: ['./list-subseccion2.component.scss']
})
export class ListSubseccion2Component {
  idSubseccion!: number;
  nombreProyecto!: string;
  search: string = '';
  SUBSECCIONES: any[] = [];
  totalPages: number = 0;
  currentPage: number = 1;
 isLoading$: any;

 nombreSubseccion!: string;

  constructor(
    private route: ActivatedRoute,
    private subseccion2Service: Subseccion2Service,
    private cdr: ChangeDetectorRef,
     public modalService: NgbModal,
     private router: Router
  ) {}

 ngOnInit(): void {

    if (this.nombreSubseccion) {
    console.log('Nombre SubSección recibido en el modal:', this.nombreSubseccion);
  }

  this.route.queryParams.subscribe(params => {
    this.idSubseccion = Number(params['idSubseccion']);  // convierte a número
    console.log('📥 Sub Seccion recibido:', this.idSubseccion);

    if (this.idSubseccion) {
      this.loadSubsecciones2();

      this.subseccion2Service.getSubSeccio1nById(this.idSubseccion).subscribe(
        (data: any) => {
           console.log('Nombre del proyecto:', data.nombre);
          this.nombreProyecto = data.nombre; 
          this.cdr.detectChanges();
        },
        (error) => {
          console.error('❌ Error al traer el proyecto:', error);
        }
      );
    }
  });
}


loadSubsecciones2(page: number = 1) {
  this.subseccion2Service.listSubsecciones2(this.idSubseccion, page, this.search)
    .subscribe((res: any) => {
      console.log('Respuesta completa del API:', res);

      // Dependiendo de cómo venga tu API
      // Si tu respuesta trae directamente un objeto del proyecto padre:
      const padre = res.data || res; // res.data si tu API lo envía así
      const subs = padre.subsecciones || [];

      console.log('Subsecciones originales:', subs);

      this.SUBSECCIONES = this.flattenSubsecciones(subs);

      console.log('Subsecciones aplanadas:', this.SUBSECCIONES);

      this.totalPages = res.total || this.SUBSECCIONES.length;
      this.currentPage = page;
    });
}

// Función para aplanar recursivamente
flattenSubsecciones(subs: any[]): any[] {
  let result: any[] = [];
  if (!subs || subs.length === 0) return result;

  subs.forEach(sub => {
    result.push(sub);
    if (sub.subsecciones && sub.subsecciones.length > 0) {
      result = result.concat(this.flattenSubsecciones(sub.subsecciones));
    }
  });

  return result;
}





   // ✅ Abrir modal de Crear SubSeccion1
 createSubSeccion2() {
  if (!this.idSubseccion || !this.nombreProyecto) return;

  console.log('ID:', this.idSubseccion);
  console.log('Nombre:', this.nombreProyecto);

  const modalRef = this.modalService.open(CreateSubseccion2Component, {
    centered: true,
    size: 'lg'
  });

  modalRef.componentInstance.idSubseccion = this.idSubseccion;
  modalRef.componentInstance.nombreSubseccion = this.nombreProyecto;

  modalRef.componentInstance.SubseccionC?.subscribe(() => {
    this.loadSubsecciones2();
  });
}






  
    editSubseccion(SUB: any) {
     
   
    }
  
  
    deleteSubseccion(SUB: any) {
     
    }



    
    

    verDocumentacion(SUB: any) {
      
      }

    crearSerie(SUB: any) {
      
      }

      createSunSunseccion3(id_subseccion1: number) {
      this.router.navigate(['/subseccion/list'], {
        queryParams: { idSubseccion: id_subseccion1 }
      });
}
}
