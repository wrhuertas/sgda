import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConsultaComponent } from './consulta.component';
import { RegistroTramiteComponent } from './registro-tramite/registro-tramite.component';
import { SeguimientoTramiteComponent } from './seguimiento-tramite/seguimiento-tramite.component';

const routes: Routes = [
  { path: '', redirectTo: 'registro', pathMatch: 'full' },
  { path: 'inicio', component: ConsultaComponent },
  { path: 'registro', component: RegistroTramiteComponent },
  { path: 'seguimiento', component: SeguimientoTramiteComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConsultaRoutingModule { }
