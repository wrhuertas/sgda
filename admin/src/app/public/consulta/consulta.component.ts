import { Component } from '@angular/core';

@Component({ 
  selector: 'app-consulta', 
  template: `
<div class="vh-100 d-flex">
  <div class="col-md-7 d-none d-md-block p-0" 
       style="background: url('assets/portada_cotopaxi.png') no-repeat center center; 
              background-size: contain; 
              background-color: #727679;"> 
  </div>

  <div class="col-md-5 d-flex align-items-center justify-content-center bg-white p-4">
    <div class="text-center" style="max-width: 400px; width: 100%;">
      <img src="assets/logo_cotopaxi.png" alt="Logo" class="mb-3" style="width: 120px;">
      <h4 class="mb-4">Gobierno Autónomo Descentralizado Provincial de Cotopaxi</h4>
      
      <p class="mb-4 text-muted">¿Qué deseas realizar?</p>
      
      <div class="d-grid gap-3">
        <a routerLink="/consulta/registro" class="btn btn-success btn-lg">Ingresar un trámite nuevo</a>
        <a routerLink="/consulta/seguimiento" class="btn btn-success btn-lg">Consultar estado de Trámite</a>
      </div>

      <hr class="my-4">
      
      <p>¿Ingresar al Sistema?</p>
      <a routerLink="/auth/login" class="btn btn-primary btn-fixed-blue">Iniciar Sesión</a>
    </div>
  </div>
</div>
` 
})
export class ConsultaComponent {}