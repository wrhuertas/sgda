import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DespachoComponent } from './despacho.component';
import { ListarTramiteComponent } from './listar-tramite/listar-tramite.component';

const routes: Routes = [

  {
          path: '',
          component: DespachoComponent,
          children: [
            {
              path: 'list',
              component: ListarTramiteComponent,
            },
          ],
        },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DespachoRoutingModule { }
