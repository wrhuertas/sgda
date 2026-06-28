import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RespaldoComponent } from './respaldo.component';
import { ListadoRespaldoComponent } from './listado-respaldo/listado-respaldo.component';

const routes: Routes = [
  {
      path: '',
      component: RespaldoComponent,
      children: [
        {
          path: 'listadRespaldo',
          component: ListadoRespaldoComponent
        },
      ],
    },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RespaldoRoutingModule { }
