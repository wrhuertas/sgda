import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportesComponent } from './reportes.component';
import { ReportesListComponent } from './reportes-list/reportes-list.component';

const routes: Routes = [
  {
      path: '',
      component: ReportesComponent,
      children: [
        {
          path: 'list',
          component: ReportesListComponent,
        },
      ],
    },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportesRoutingModule { }
