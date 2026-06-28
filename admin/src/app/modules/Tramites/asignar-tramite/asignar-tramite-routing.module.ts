import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AsignarTramiteComponent } from './asignar-tramite.component';
import { ListTramitesComponent } from './list-tramites/list-tramites.component';

const routes: Routes = [
   {
        path: '',
        component: AsignarTramiteComponent,
        children: [
          {
            path: 'list',
            component: ListTramitesComponent,
          },
        ],
      },
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AsignarTramiteRoutingModule { }
