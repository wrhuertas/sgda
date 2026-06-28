import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListProyectoComponent } from './list-proyecto/list-proyecto.component';
import { ProyectoComponent } from './proyecto.component';

const routes: Routes = [
  {
    path: '',
    component: ProyectoComponent,
    children: [
      {
        path: 'list',
        component: ListProyectoComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProyectoRoutingModule { }
