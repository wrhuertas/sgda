import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router'; // <--- Para el router-outlet
import { RespaldoRoutingModule } from './respaldo-routing.module';

// IMPORTA LOS DOS COMPONENTES
import { RespaldoComponent } from './respaldo.component';
import { ListadoRespaldoComponent } from './listado-respaldo/listado-respaldo.component';

@NgModule({
  declarations: [
    RespaldoComponent,        // El que tiene el router-outlet
    ListadoRespaldoComponent  // El que tiene el formulario y los combos
  ],
  imports: [
    CommonModule,
    RespaldoRoutingModule,
    FormsModule,              // <--- ACTIVA EL NGMODEL
    ReactiveFormsModule,
    RouterModule              // <--- ACTIVA EL ROUTER-OUTLET
  ]
})
export class RespaldoModule { }