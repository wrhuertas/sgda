import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AreaComponent } from './area.component';
import { ListarAreaComponent } from './listar-area/listar-area.component';

const routes: Routes = [
    {
      path: '',
      component: AreaComponent,
      children: [
        {
          path: 'list',
          component: ListarAreaComponent,
        },
      ],
    },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AreaRoutingModule { }
