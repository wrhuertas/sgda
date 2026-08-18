import { ChangeDetectorRef, Component } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateRolesComponent } from 'src/app/modules/roles/create-roles/create-roles.component';
import { DeleteRolesComponent } from 'src/app/modules/roles/delete-roles/delete-roles.component';
import { EditRolesComponent } from 'src/app/modules/roles/edit-roles/edit-roles.component';
import { PrestamoService } from '../service/prestamo.service';
import { isPermission } from 'src/app/config/config';
import { CrearPrestamoComponent } from '../crear-prestamo/crear-prestamo.component';
import { EditarPrestamoComponent } from '../editar-prestamo/editar-prestamo.component';
import { EliminarPrestamoComponent } from '../eliminar-prestamo/eliminar-prestamo.component';
import { VerPrestamoComponent } from '../ver-prestamo/ver-prestamo.component';
import Swal from 'sweetalert2';
import { URL_SERVICIOS } from 'src/app/config/config';
import { ToastrService } from 'ngx-toastr';

import { HttpClient } from '@angular/common/http';

interface DocumentoDetalle {
    id_documento: number;
    nombre_archivo: string;
    serie?: {
        nombre: string;
    };
}

interface Prestamo {
    id: number;
    numero_acta: string;
    documentos_detalles: DocumentoDetalle[];
    solicitante?: { name: string };
    estado_acta: string;
    created_format_at: string;
}


@Component({
  selector: 'app-list-prestamo',
  templateUrl: './list-prestamo.component.html',
  styleUrls: ['./list-prestamo.component.scss']
})
export class ListPrestamoComponent {


  
    search:string = '';
    PRESTAMOS:any = [];
    isLoading$:any;
  
    totalPages:number = 0;
    currentPage:number = 1;

    id_empresa: any;
public URL_SERVICIOS: string = URL_SERVICIOS;

    constructor(
      public modalService: NgbModal,
      public prestamoService: PrestamoService,
        private cdr: ChangeDetectorRef,
        private http: HttpClient,
        private toast: ToastrService,
    ) {}
  
  ngOnInit(): void {
      // Extraer el usuario del local storage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log("👤 Usuario logueado desde prestamo:", user);
      if (user && user.id_empresa) {
        this.id_empresa = user.id_empresa;
      }
      this.isLoading$ = this.prestamoService.isLoading$;
      this.listPrestamos();
  }
  
    listPrestamos(page = 1) {
      this.prestamoService.listPrestamo(page, this.search, this.id_empresa).subscribe((resp: any) => {
        // TypeScript ahora sabe que resp.prestamos encaja con nuestra interfaz
        this.PRESTAMOS = resp.prestamos;
        this.totalPages = resp.total;
        this.currentPage = page;
      });
    }
  
    loadPage($event:any){
      this.listPrestamos($event);
    }
  
    /**
     * Antes de abrir el acta se pregunta de qué tipo es, porque el acta se
     * arma distinto según se entregue el papel o el archivo digital.
     */
    async createPrestamo() {
      const { value: tipo } = await Swal.fire({
        title: '¿Qué tipo de préstamo es?',
        input: 'select',
        inputOptions: {
          FISICO: 'Físico — se entrega el expediente en papel',
          DIGITAL: 'Digital — se entrega el archivo'
        },
        inputPlaceholder: 'Seleccione el tipo de préstamo',
        inputValidator: (valor) => valor ? null : 'Elija el tipo de préstamo',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6'
      });

      // Si cerró o canceló, no se abre el acta
      if (!tipo) { return; }

      const modalRef = this.modalService.open(CrearPrestamoComponent, {
        centered: true,
        windowClass: 'modal-ancho-personalizado',
        backdrop: 'static'
      });

      modalRef.componentInstance.TIPO_PRESTAMO = tipo;

      // Escuchamos el evento de salida del componente hijo (el modal)
      modalRef.componentInstance.PrestamoC.subscribe((prestamo: any) => {
        if (!prestamo) return;

        // 🔍 Buscamos si el préstamo ya existe en la lista de la tabla
        const index = this.PRESTAMOS.findIndex(
          (p: any) => p.id_prestamo === prestamo.id_prestamo
        );

        if (index !== -1) {
          // 🔄 SI YA EXISTE: Actualizamos el registro existente en su misma posición
          this.PRESTAMOS[index] = prestamo;
          console.log(`✅ Registro ID: ${prestamo.id_prestamo} actualizado en la tabla.`);
        } else {
          // ➕ SI ES NUEVO: Lo agregamos al inicio de la lista actual
          this.PRESTAMOS.unshift(prestamo);
          console.log('✅ Nuevo registro agregado al inicio de la tabla.');
        }

        // Forzar detección de cambios si es necesario para refrescar la vista HTML
        this.cdr.detectChanges(); 
      });
    }
  
    EntregarPrestamo(PRESTAMO:any){
      const modalRef = this.modalService.open(EditarPrestamoComponent,{
        centered: true,
        //size: 'xl', // Cambiado a 'lg' para que los formularios de documentos se vean mejor
        windowClass: 'modal-ancho-personalizado',
        backdrop: 'static'
      });
      modalRef.componentInstance.PRESTAMO_SELECTED = PRESTAMO;
  
      modalRef.componentInstance.PrestamoE.subscribe((prestamo:any) => {
        // Alinear por clave real del backend: id_prestamo
        const INDEX = this.PRESTAMOS.findIndex((p:any) => p.id_prestamo === PRESTAMO.id_prestamo);
        if (INDEX !== -1) {
          this.PRESTAMOS[INDEX] = prestamo;
        }
      })
    }


  editarPrestamo(prestamo: any) {
    const modalRef = this.modalService.open(EditarPrestamoComponent, { size: 'xl', centered: true });
    
    // Pasamos el objeto seleccionado al modal
    modalRef.componentInstance.PRESTAMO_SELECTED = prestamo;

    // 🚀 OPCIÓN 1: Refrescar cuando el modal emite el evento con (.emit)
    modalRef.componentInstance.PrestamoE.subscribe((res: any) => {
      console.log("Acta actualizada desde el modal:", res);
      
      // 👇 REEMPLAZA ESTO con el nombre real de tu función que recarga la tabla
      this.listPrestamos(); 
    });

    // 🚀 OPCIÓN 2: Refrescar cuando el modal se cierra con (.close(true))
    modalRef.result.then((result) => {
      if (result === true) {
        console.log("Modal cerrado con éxito, refrescando tabla...");
        
        // 👇 REEMPLAZA ESTO con el nombre real de tu función que recarga la tabla
        this.listPrestamos(); 
      }
    }, () => {
      // Maneja el chat o descarte del modal (cuando lo cierran con la X o escapan)
    });
  }

  VerPrestamo(PRESTAMO:any){
      const modalRef = this.modalService.open(VerPrestamoComponent,{centered:true, size: 'md'});
      modalRef.componentInstance.PRESTAMO_SELECTED = PRESTAMO;
  
      modalRef.componentInstance.PrestamoE.subscribe((prestamo:any) => {
        const INDEX = this.PRESTAMOS.findIndex((p:any) => p.id_prestamo === PRESTAMO.id_prestamo);
        if (INDEX !== -1) {
          this.PRESTAMOS[INDEX] = prestamo;
        }
      })
    }


    deletePrestamo(PRESTAMO:any){
      const modalRef = this.modalService.open(EliminarPrestamoComponent,{centered:true, size: 'md'});
      modalRef.componentInstance.PRESTAMO_SELECTED = PRESTAMO;
  
      modalRef.componentInstance.PrestamoD.subscribe((prestamo:any) => {
        const INDEX = this.PRESTAMOS.findIndex((p:any) => p.id_prestamo === PRESTAMO.id_prestamo);
        if (INDEX !== -1) {
          this.PRESTAMOS.splice(INDEX, 1);
        }
      })
    }
  
  isPermission(permission:string){
     return isPermission(permission);
   }


   viewPrestamo(PRESTAMO: any) {
        console.log("Visualizando préstamo:", PRESTAMO);
        // Aquí puedes abrir un modal de detalle o navegar a otra ruta
        // Ejemplo: este.modalService.open(DetalleComponent, { data: PRESTAMO });
    }

    entregarPrestamo(PRESTAMO: any) {
      
    }



    imprimirActaFirmada(prestamo: any) {
    if (!prestamo.id_prestamo) {
        this.toast.error('ID de préstamo no válido.');
        return;
    }

    // 1. Recuperamos el token almacenado (ajusta la clave si usas 'token' u otro nombre en tu localStorage)
    const token = localStorage.getItem('token'); 
    
    // 2. Armamos las cabeceras de autenticación obligatorias
    const headers = {
        'Authorization': `Bearer ${token}`
    };

    const urlDocumento = `${this.URL_SERVICIOS}/prestamos/ver-acta-firmada/${prestamo.id_prestamo}`;
    
    if (this.toast) {
        this.toast.info('Descargando archivo desde el servidor...', 'Por favor espere');
    }

    // 3. Enviamos los headers en la petición HTTP binaria
    this.http.get(urlDocumento, { headers, responseType: 'blob' }).subscribe({
        next: (blob: Blob) => {
            const data = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = data;
            
            const nombreArchivo = prestamo.ruta_documento_pdf 
                ? prestamo.ruta_documento_pdf.split('/').pop() 
                : `Memorandum_PRE-${prestamo.id_prestamo}.pdf`;
            
            link.setAttribute('download', nombreArchivo);
            link.target = '_self';
            
            document.body.appendChild(link);
            link.click();
            
            document.body.removeChild(link);
            window.URL.revokeObjectURL(data);
            
            if (this.toast) this.toast.success('Memorandum descargado correctamente.');
        },
        error: (err) => {
            console.error('Error al descargar el memorandum:', err);
            // Si el error persiste, te avisará detalladamente si fue por credenciales o archivo faltante
            this.toast.error('Error al descargar el archivo. Verifique su autenticación.');
        }
    });
}



}
