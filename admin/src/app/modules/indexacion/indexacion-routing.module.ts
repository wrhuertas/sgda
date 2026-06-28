import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IndexacionComponent } from './indexacion.component';
import { ListIndexacionComponent } from './list-indexacion/list-indexacion.component';

const routes: Routes = [
  {
    path: '',
    component: IndexacionComponent,
    children: [
      {
        path: 'list',
        component: ListIndexacionComponent  // <-- Aquí se carga lista por defecto
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IndexacionRoutingModule { }
