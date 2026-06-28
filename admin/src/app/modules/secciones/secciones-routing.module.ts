import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ListSessionesComponent } from './list-sessiones/list-sessiones.component';
import { DetalleSessionesComponent } from './detalle-sessiones/detalle-sessiones.component'; // crea este componente si no existe

const routes: Routes = [
   // Ruta para detalle con ambos params
  { path: 'seccion/:idSeccion/modulo/:idModulo', component: DetalleSessionesComponent },

  // Ruta para mostrar las secciones del módulo (ej: /modulo/3)
  { path: 'modulo/:id', component: ListSessionesComponent },

  // Ruta para mostrar detalle de una sección (ej: /seccion/5)
  { path: 'seccion/:id', component: DetalleSessionesComponent },

  // Ruta vacía o default, si quieres redirigir al listado
  { path: '', redirectTo: 'modulo/1', pathMatch: 'full' } 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SeccionesRoutingModule { }
