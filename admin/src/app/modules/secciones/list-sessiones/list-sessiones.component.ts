import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';  // Importa Router
import { SeccionesService } from '../service/sessiones.service';
import { environment } from './../../../../environments/environment';

@Component({
  selector: 'app-list-sessiones',
  templateUrl: './list-sessiones.component.html',
  styleUrls: ['./list-sessiones.component.scss']
})
export class ListSessionesComponent implements OnInit {

  idModulo!: number;
  secciones: any[] = [];
  isLoading = false;

// Todos los permisos que vienen de la DB
permisosDocumentales: any[] = [];

permisosPorSubSeccion: { [id_subseccion: number]: any } = {};


puedeCrearSubSeccion: boolean = false;
puedeEditarSubSeccion: boolean = false;
puedeEliminarSubSeccion: boolean = false;




  constructor(
    private route: ActivatedRoute,
    private seccionesService: SeccionesService,
    private router: Router,              // Inyecta Router
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    console.log('ID USUARIO:', user.id);

    // 👇 AQUÍ SE EJECUTA
    if (user?.id) {
      this.PermisosSubSeccion(user.id);
    }
    console.log('🟡 ngOnInit iniciado...');
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      console.log('🟢 ID del módulo recibido:', id);
      if (id) {
        this.idModulo = +id;
        this.loadSecciones();
      }
    });
  }

  loadSecciones() {
    console.log('🔄 Cargando secciones para el módulo ID:', this.idModulo);
    this.isLoading = true;
    this.cdr.detectChanges();

    this.seccionesService.listSeccionesByModulo(this.idModulo).subscribe({
      next: (resp: any) => {
        console.log('✅ Secciones recibidas del servicio:', resp);
        this.secciones = resp.secciones || resp.data || [];
        console.log('🟢 Secciones asignadas al componente:', this.secciones);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error al cargar secciones:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }



  PermisosSubSeccion(idUser: number) {
  console.log('Ejecutando PermisosSubSeccion con ID:', idUser);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  this.seccionesService.permisosUsuario(idUser.toString()).subscribe({
    next: (resp: any) => {
      console.log('Permisos del usuario para Sub Sección recibidos:', resp);

      // Guardar todos los permisos completos
      this.permisosDocumentales = resp.permissions || [];

      // Crear mapa por id_subseccion
      this.permisosPorSubSeccion = this.permisosDocumentales.reduce((acc, permiso) => {
        if (permiso.id_subseccion !== null) {
          acc[permiso.id_subseccion] = permiso; // Guardamos todo el objeto
        }
        return acc;
      }, {} as { [id_subseccion: number]: any });

      console.log('Permisos por Sub Sección:', this.permisosPorSubSeccion);

      // Evaluar permisos globales para Sub Sección
      this.puedeCrearSubSeccion = this.permisosDocumentales.some(p =>
        p.id_subseccion !== null &&
        p.crear === true &&
        p.id_empresa === user.id_empresa
      );

      this.puedeEditarSubSeccion = this.permisosDocumentales.some(p =>
        p.id_subseccion !== null &&
        p.editar === true &&
        p.id_empresa === user.id_empresa
      );

      this.puedeEliminarSubSeccion = this.permisosDocumentales.some(p =>
        p.id_subseccion !== null &&
        p.eliminar === true &&
        p.id_empresa === user.id_empresa
      );

      console.log('¿Puede crear Sub Sección?', this.puedeCrearSubSeccion);
      console.log('¿Puede editar Sub Sección?', this.puedeEditarSubSeccion);
      console.log('¿Puede eliminar Sub Sección?', this.puedeEliminarSubSeccion);
    },
    error: (err) => {
      console.error('Error permisos Sub Sección', err);
      this.permisosDocumentales = [];
      this.permisosPorSubSeccion = {};
      this.puedeCrearSubSeccion = false;
      this.puedeEditarSubSeccion = false;
      this.puedeEliminarSubSeccion = false;
    }
  });
}



  // Método para navegar al detalle de la sección
navegarADetalleSeccion(idSeccion: number, idModulo: number) {
  this.router.navigate(['/secciones/seccion', idSeccion, 'modulo', idModulo]);
}


}
