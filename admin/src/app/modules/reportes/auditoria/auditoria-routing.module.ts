import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuditoriaComponent } from './auditoria.component';
import { VerComponent } from './ver/ver.component';

const routes: Routes = [
  {
      path: '',
      component: AuditoriaComponent,
      children: [
        {
          path: 'listadoAuditoria',
          component: VerComponent,
        },
      ],
    },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuditoriaRoutingModule { }
