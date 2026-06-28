import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BusquedaComponent } from './busqueda.component';
import { BusquedaListComponent } from './busqueda-list/busqueda-list.component';

const routes: Routes = [
    {
      path: '',
      component: BusquedaComponent,
      children: [
        {
          path: 'list',
          component: BusquedaListComponent,
        },
      ],
    },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BusquedaRoutingModule { }
