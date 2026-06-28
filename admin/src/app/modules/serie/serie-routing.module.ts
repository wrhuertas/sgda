import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SerieComponent } from './serie.component';
import { ListSerieComponent } from './list-serie/list-serie.component';

const routes: Routes = [
  {
    path: '',
    component: SerieComponent,
    children: [
      {
        path: 'list',
        component: ListSerieComponent,
      },
    ],
  },
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SerieRoutingModule { }
