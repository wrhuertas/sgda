import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CambioPasswordObligatorioComponent } from './cambio-password-obligatorio.component';

const routes: Routes = [
  {
    path: '',
    component: CambioPasswordObligatorioComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CambioPasswordObligatorioRoutingModule {}
