import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SubserieComponent } from './subserie.component';
import { ListSubserieComponent } from './list-subserie/list-subserie.component';

const routes: Routes = [
  {
    path: '',
    component: SubserieComponent,
    children: [
      {
        path: 'list',
        component: ListSubserieComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SubserieRoutingModule {}
