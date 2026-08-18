import { Component, Input } from '@angular/core';
import Swal from 'sweetalert2';
import { RutaetiquetaComponent } from '../rutaetiqueta/rutaetiqueta.component';

/**
 * Edición de una etiqueta ya guardada.
 *
 * Reusa el formulario de RutaetiquetaComponent (clasificación + ubicación) y
 * sólo cambia dos cosas: preselecciona la serie/subserie del registro y, al
 * guardar, actualiza en vez de crear.
 */
@Component({
  selector: 'app-editar-etiqueta',
  templateUrl: './editar-etiqueta.component.html',
  styleUrls: ['./editar-etiqueta.component.scss']
})
export class EditarEtiquetaComponent extends RutaetiquetaComponent {

  @Input() ETIQUETA_SELECTED: any = null;

  /** Ruta con la que quedó guardada, para mostrarla como referencia */
  rutaOriginal = '';

  override ngOnInit(): void {
    this.rutaOriginal = this.ETIQUETA_SELECTED?.ruta || '';
    super.ngOnInit();
  }

  /**
   * Con el árbol ya cargado se busca la serie (o subserie) del registro y se
   * dejan seleccionados los combos de la izquierda hasta ese nivel.
   */
  protected override alCargarSecciones(): void {
    const idBuscado = Number(this.ETIQUETA_SELECTED?.id_serie_subserie);

    if (!idBuscado) { return; }

    for (const seccion of this.secciones) {
      for (const subseccion of (seccion.subsecciones || [])) {

        // Series colgadas de la subsección
        if (this.ubicarSerie(idBuscado, seccion, subseccion, null, subseccion.series || [])) {
          return;
        }

        // Series colgadas de una sub-subsección
        for (const subsub of (subseccion.subsecciones || [])) {
          if (this.ubicarSerie(idBuscado, seccion, subseccion, subsub, subsub.series || [])) {
            return;
          }
        }
      }
    }
  }

  /**
   * Busca el id entre las series recibidas (y entre sus hijos). Si lo encuentra
   * deja armados los combos de ese camino y devuelve true.
   */
  private ubicarSerie(
    idBuscado: number,
    seccion: any,
    subseccion: any,
    subsubseccion: any,
    series: any[]
  ): boolean {
    for (const serie of series) {
      const hijos = serie.hijos || serie.hijos_recursivos || [];
      const esLaSerie = Number(serie.id_serie) === idBuscado;
      const hijo = hijos.find((h: any) => Number(h.id_serie) === idBuscado);

      if (!esLaSerie && !hijo) { continue; }

      this.seccionId = seccion.id_proyecto;
      this.subsecciones = seccion.subsecciones || [];

      this.subseccionId = subseccion.id_proyecto;
      this.subsubsecciones = subseccion.subsecciones || [];

      this.subsubseccionId = subsubseccion ? subsubseccion.id_proyecto : '';
      this.series = series;

      this.serieId = serie.id_serie;
      this.subseries = hijos;
      this.subserieId = hijo ? hijo.id_serie : '';

      // Habilita el lado derecho y deja marcada la ubicación guardada
      this.prepararUbicacion();
      this.precargarUbicacion();
      return true;
    }

    return false;
  }

  /**
   * Rearma los combos de la derecha con los ids que quedaron guardados.
   * Cada nivel se carga recién cuando llegó la lista del anterior, porque cada
   * uno depende del id del de arriba.
   */
  private precargarUbicacion(): void {
    const et = this.ETIQUETA_SELECTED || {};

    if (!et.id_edificio) { return; }

    const idEmpresa = this.usuarioActual?.id_empresa;
    if (!idEmpresa) { return; }

    this.indexacionService.listarEdificiosPorEmpresa({ id_empresa: idEmpresa }).subscribe({
      next: (res: any) => {
        this.edificios = this.aLista(res).map((e: any) => ({ id: e.id_edificio ?? e.id, nombre: e.nombre }));
        this.idEdificio = et.id_edificio;
        this.cdr.detectChanges();

        if (!et.id_sala) { return; }

        this.indexacionService.listarSalasPorEdificio({ id_edificio: et.id_edificio }).subscribe({
          next: (r2: any) => {
            this.salas = this.aLista(r2).map((s: any) => ({ id: s.id_sala ?? s.id, nombre: s.nombre }));
            this.idSala = et.id_sala;
            this.cdr.detectChanges();

            if (!et.id_estanteria) { return; }

            this.indexacionService.listarEstanteriasPorSala({ id_sala: et.id_sala }).subscribe({
              next: (r3: any) => {
                this.estanterias = this.aLista(r3).map((e: any) => ({
                  id: e.id ?? e.id_estanteria,
                  nombre: e.nombre ?? e.codigo ?? e.descripcion
                }));
                this.idEstanteria = et.id_estanteria;
                this.cdr.detectChanges();

                if (!et.id_fila) { return; }

                this.indexacionService.listarFilasPorEstanteria({ id_estanteria: et.id_estanteria }).subscribe({
                  next: (r4: any) => {
                    this.filas = this.aLista(r4).map((f: any) => ({
                      id: f.id ?? f.id_fila,
                      nombre: f.nombre ?? f.codigo ?? f.descripcion
                    }));
                    this.idFila = et.id_fila;
                    this.cdr.detectChanges();

                    if (!et.id_caja) { return; }

                    this.indexacionService.listarCajasPorFila({ id_fila: et.id_fila }).subscribe({
                      next: (r5: any) => {
                        this.cajas = this.aLista(r5).map((c: any) => ({
                          id: c.id ?? c.id_caja,
                          nombre: c.nombre ?? c.numero_caja ?? c.codigo
                        }));
                        this.idCaja = et.id_caja;
                        this.cdr.detectChanges();

                        if (!et.id_carpeta) { return; }

                        this.indexacionService.listarCarpetasPorCaja({ id_caja: et.id_caja }).subscribe({
                          next: (r6: any) => {
                            this.carpetas = this.aLista(r6).map((c: any) => ({
                              id: c.id ?? c.id_carpeta,
                              nombre: c.nombre ?? c.codigo ?? c.descripcion
                            }));
                            this.idCarpeta = et.id_carpeta;
                            this.cdr.detectChanges();
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  /**
   * Si no se elige una ubicación nueva se conserva la que ya tenía, así se
   * puede cambiar sólo la serie sin perder la ruta.
   */
  get rutaFinal(): string {
    return this.rutaTexto || this.rutaOriginal;
  }

  override guardar(): void {
    if (!this.idSerieSubserie) {
      Swal.fire('Falta selección', 'Debe seleccionar una Serie o Sub-Serie.', 'warning');
      return;
    }

    const ruta = this.rutaFinal;

    if (!ruta) {
      Swal.fire('Falta selección', 'Debe seleccionar la ubicación para armar la ruta.', 'warning');
      return;
    }

    this.guardando = true;

    this.etiquetaService.actualizarEtiqueta(this.ETIQUETA_SELECTED.id, {
      ruta,
      id_empresa: this.usuarioActual?.id_empresa,
      id_usuario: this.usuarioActual?.id,
      id_serie_subserie: this.idSerieSubserie,
      ...this.idsUbicacion()
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.toast.success('Etiqueta actualizada correctamente');
        this.activeModal.close(true);
      },
      error: (err) => {
        this.guardando = false;
        console.error('Error actualizando la etiqueta:', err);
        this.mostrarError(err, 'No se pudo actualizar la etiqueta.');
      }
    });
  }
}
