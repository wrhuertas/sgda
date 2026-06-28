import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CertificadoComponent } from './certificado.component';
import { ListCertificadoComponent } from './list-certificado/list-certificado.component';

const routes: Routes = [

   {
      path: '',
      component: CertificadoComponent,
      children: [
        {
          path: 'list',
          component: ListCertificadoComponent  // <-- Aquí se carga lista por defecto
        }
      ]
    }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CertificadoRoutingModule { }
