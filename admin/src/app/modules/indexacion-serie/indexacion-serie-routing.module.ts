import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IndexacionSerieComponent } from './indexacion-serie.component';
import { ListIndexacionSerieComponent } from './list-indexacion-serie/list-indexacion-serie.component';

const routes: Routes = [
  {
    path: '',
    component: IndexacionSerieComponent,
    children: [
      {
        path: 'list',
        component: ListIndexacionSerieComponent  // <-- Aquí se carga lista por defecto
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IndexacionSerieRoutingModule { }
