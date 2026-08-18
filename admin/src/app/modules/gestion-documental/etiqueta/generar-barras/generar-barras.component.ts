import { Component, ElementRef, ViewChild } from '@angular/core';
import JsBarcode from 'jsbarcode';
import { GenerarEtiquetaComponent } from '../generar-etiqueta/generar-etiqueta.component';

/**
 * Mismo modal que el de QR, pero con código de barras: el contenido se guarda
 * en la tabla contenidoBarra en vez de contenidoQR.
 */
@Component({
  selector: 'app-generar-barras',
  templateUrl: './generar-barras.component.html',
  // Se reusan los estilos del rótulo, que son los mismos que los del QR
  styleUrls: [
    '../generar-etiqueta/generar-etiqueta.component.scss',
    './generar-barras.component.scss'
  ]
})
export class GenerarBarrasComponent extends GenerarEtiquetaComponent {

  /** Los dos <svg> donde se dibuja el código (plantilla completa y simple) */
  @ViewChild('barras') barrasRef!: ElementRef<SVGElement>;
  @ViewChild('barrasSimple') barrasSimpleRef!: ElementRef<SVGElement>;

  /**
   * Lo que codifica el código de barras: los mismos campos elegidos que el QR,
   * pero en un solo renglón separado por " | ", porque un CODE128 no admite
   * saltos de línea. Si todavía no hay contenido guardado se usa el código
   * corto de la ubicación (E5-S4-ES23-F20).
   */
  get contenidoBarras(): string {
    const lineas = this.lineasContenido();

    const texto = lineas.length
      ? lineas.join(' | ')
      : (this.datos?.codigo || String(this.ETIQUETA_SELECTED?.id || ''));

    return this.aAscii(texto);
  }

  /**
   * CODE128 sólo acepta caracteres ASCII: con una tilde o una Ñ el código no
   * se dibuja. Se quitan los acentos y cualquier símbolo fuera de ese rango.
   */
  private aAscii(texto: string): string {
    // Los rangos van por constructor para que queden como escapes y no como
    // caracteres sueltos dentro del archivo.
    const acentos = new RegExp('[\\u0300-\\u036f]', 'g');
    const fueraDeAscii = new RegExp('[^\\u0020-\\u007e]', 'g');

    return texto
      .normalize('NFD')
      .replace(acentos, '')
      .replace(fueraDeAscii, '');
  }

  /**
   * Esta pantalla trabaja contra contenidoBarra. Sin esto la lista de campos
   * se marcaba con lo guardado del QR.
   */
  protected override get contenidoGuardado(): any {
    return this.datos?.contenido_barra;
  }

  protected override alCargarDatos(): void {
    // Se espera al render para que el <svg> ya exista en el DOM
    setTimeout(() => this.dibujarBarras(), 0);
  }

  protected override llamarActualizacion(id: number, payload: { campos: string[]; id_usuario: number }) {
    return this.etiquetaService.actualizarContenidoBarra(id, payload);
  }

  private dibujarBarras(): void {
    const texto = this.contenidoBarras;

    if (!texto) { return; }

    const destinos = [this.barrasRef?.nativeElement, this.barrasSimpleRef?.nativeElement];

    // Cuantos más campos se elijan, más largo es el texto: se afinan las
    // barras para que el código siga entrando en el rótulo.
    const ancho = texto.length > 80 ? 1 : (texto.length > 40 ? 1.4 : 2);

    destinos.filter(Boolean).forEach(svg => {
      try {
        JsBarcode(svg, texto, {
          format: 'CODE128',
          displayValue: true,
          fontSize: 12,
          height: 70,
          width: ancho,
          margin: 4,
        });
      } catch (e) {
        console.error('No se pudo dibujar el código de barras:', e);
      }
    });

    this.cdr.detectChanges();
  }
}
