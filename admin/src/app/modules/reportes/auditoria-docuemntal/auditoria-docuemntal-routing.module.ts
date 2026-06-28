import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuditoriaDocuemntalComponent } from './auditoria-docuemntal.component';
import { VerComponent } from './ver/ver.component';

const routes: Routes = [

  {
        path: '',
        component: AuditoriaDocuemntalComponent,
        children: [
          {
            path: 'listadoAuditoriaDocumental',
            component: VerComponent,
          },
        ],
      },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuditoriaDocuemntalRoutingModule { }
