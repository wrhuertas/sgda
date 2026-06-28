import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ModulosComponent } from './modulos.component';
import { ListModuloComponent } from './list-modulo/list-modulo.component';
import { SeccionesComponent } from '../secciones/secciones.component';
import { ListSessionesComponent } from '../secciones/list-sessiones/list-sessiones.component';

const routes: Routes = [
  {
    path: '',
    component: ModulosComponent,
    children: [
      {
        path: 'list',
        component: ListModuloComponent,
      },
      {
        path: 'list/:id/secciones',  // <-- Nueva ruta para secciones
        component: ListSessionesComponent,
      }
    ],
  },
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ModulosRoutingModule { }
