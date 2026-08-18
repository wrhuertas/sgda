import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { EtiquetaService } from '../service/etiqueta.service';

@Component({
  selector: 'app-generar-etiqueta',
  templateUrl: './generar-etiqueta.component.html',
  styleUrls: ['./generar-etiqueta.component.scss']
})
export class GenerarEtiquetaComponent implements OnInit {

  /** Registro de la tabla etiquetas desde el que se va a generar */
  @Input() ETIQUETA_SELECTED: any = null;

  /** Recuadro del rótulo, es lo único que se manda a la impresora */
  @ViewChild('rotulo') rotuloRef!: ElementRef<HTMLDivElement>;

  /** Datos ya resueltos a nombres que devuelve el backend */
  datos: any = null;
  cargando = false;

  /**
   * Cifras calculadas por el backend a partir de los documentos de esa
   * ubicación. Son informativas: se muestran y se pueden incluir o no, pero
   * no se editan.
   */
  get resumen(): any {
    return this.datos?.resumen || {};
  }

  constructor(
    public activeModal: NgbActiveModal,
    protected etiquetaService: EtiquetaService,
    protected toast: ToastrService,
    protected cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  /**
   * La plantilla completa (la del modelo de Excel) se dibuja cuando la ruta
   * llega a caja o a carpeta. En los niveles de arriba sólo va el QR.
   */
  get usaPlantilla(): boolean {
    return ['caja', 'carpeta'].includes(this.datos?.nivel);
  }

  /** El recuadro de número de carpeta sólo tiene sentido si hay carpeta */
  get esCarpeta(): boolean {
    return this.datos?.nivel === 'carpeta';
  }

  /**
   * De caja para arriba (edificio, sala, estantería y fila) va un rótulo más
   * simple: el QR con su código y debajo el detalle de la ubicación.
   */
  get usaPlantillaSimple(): boolean {
    return ['edificio', 'sala', 'estanteria', 'fila'].includes(this.datos?.nivel);
  }

  /** Nombre del nivel para el encabezado "UBICACIÓN — ..." */
  get nivelTexto(): string {
    const nombres: { [k: string]: string } = {
      edificio:   'EDIFICIO',
      sala:       'SALA',
      estanteria: 'ESTANTERIA',
      fila:       'FILA',
      caja:       'CAJA',
      carpeta:    'CARPETA',
    };

    return nombres[this.datos?.nivel] || '';
  }

  /** Detalle de la ubicación, de edificio hacia abajo, sin los niveles vacíos */
  get filasUbicacion(): Array<{ etiqueta: string; valor: string }> {
    const u = this.datos?.ubicacion || {};

    return [
      { etiqueta: 'Edificio',   valor: u.edificio },
      { etiqueta: 'Sala',       valor: u.sala },
      { etiqueta: 'Estantería', valor: u.estanteria },
      { etiqueta: 'Fila',       valor: u.fila },
      { etiqueta: 'Caja',       valor: u.caja },
      { etiqueta: 'Carpeta',    valor: u.carpeta },
    ].filter(f => f.valor);
  }

  /**
   * Campos que se pueden marcar o desmarcar para decidir qué entra en la
   * etiqueta. Se arman con lo que devuelve el backend y arrancan todos activos.
   */
  campos: Array<{ clave: string; etiqueta: string; valor: string; seleccionado: boolean }> = [];

  /** Nombre visible de cada campo, para la lista y para el texto del QR */
  protected readonly etiquetasCampos: { [clave: string]: string } = {
    seccion:     'SECCIÓN',
    subseccion:  'SUBSECCIÓN',
    subseccion2: 'SUBSECCIÓN 2',
    serie:       'SERIE',
    subserie:    'SUBSERIE',
    edificio:    'EDIFICIO',
    sala:        'SALA',
    estanteria:  'ESTANTERÍA',
    fila:        'FILA',
    caja:        'CAJA',
    carpeta:     'CARPETA',
    fojas:       'FOJAS',
    expedientes: 'CANT. EXPEDIENTES',
    bibliorato:  'N° BIBLIORATO',
    apertura:    'FECHA APERTURA',
    cierre:      'FECHA CIERRE',
    observacion: 'OBSERVACIÓN',
    conformidad: 'CONFORMIDAD',
  };

  /**
   * Contenido guardado que corresponde a esta pantalla. Acá es el de
   * contenidoQR; la pantalla de barras lo apunta a contenidoBarra.
   */
  protected get contenidoGuardado(): any {
    return this.datos?.contenido;
  }

  /**
   * Lo que codifica el QR. Se arma como texto legible a partir del contenido
   * guardado en contenidoQR, porque quien escanea es personal de archivo y no
   * tiene por qué leer un JSON.
   */
  get contenidoQr(): string {
    const lineas = this.lineasContenido();
    const ruta = this.datos?.ruta || this.ETIQUETA_SELECTED?.ruta || '';

    return lineas.length ? lineas.join('\n') : ruta;
  }

  /**
   * Un renglón por campo guardado ("SECCIÓN: ..."), sin los que están vacíos.
   * Lo usan tanto el QR como el código de barras.
   */
  protected lineasContenido(): string[] {
    const guardado = this.contenidoGuardado;

    if (!guardado || !Object.keys(guardado).length) {
      return [];
    }

    return Object.keys(guardado)
      .filter(clave => {
        const valor = guardado[clave];
        // Se omiten los campos sin dato para no ensuciar la lectura
        return valor !== null && valor !== undefined && String(valor).trim() !== '';
      })
      .map(clave => {
        const nombre = this.etiquetasCampos[clave] || clave.toUpperCase();
        return this.sinTildes(`${nombre}: ${this.formatearValor(clave, guardado[clave])}`);
      });
  }

  /**
   * Saca las tildes y la eñe del texto que va dentro del código.
   *
   * El QR guarda en UTF-8, pero muchos lectores lo interpretan con otra tabla
   * de caracteres y una "Ó" termina apareciendo como un símbolo raro. Sin
   * tildes se lee igual en cualquier aplicación. El rótulo impreso no pasa por
   * acá: ahí los acentos se conservan.
   */
  protected sinTildes(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
  }

  /**
   * Manda a imprimir sólo el rótulo. Se abre una ventana aparte con una copia
   * del recuadro, para que no salga el resto del modal ni la pantalla.
   */
  imprimir(): void {
    const nodo = this.rotuloRef?.nativeElement;

    if (!nodo) { return; }

    const clon = nodo.cloneNode(true) as HTMLElement;

    // El QR se dibuja en un <canvas> y al clonar el nodo queda en blanco,
    // así que se reemplaza por una imagen con el mismo dibujo.
    const originales = nodo.querySelectorAll('canvas');
    const copiados = clon.querySelectorAll('canvas');

    copiados.forEach((canvas, i) => {
      const original = originales[i] as HTMLCanvasElement;
      if (!original) { return; }

      const img = document.createElement('img');
      img.src = original.toDataURL('image/png');
      // Con un ancho fijo empujaba la grilla y el rótulo salía cortado
      img.style.width = '100%';
      img.style.maxWidth = '230px';
      img.style.height = 'auto';
      canvas.replaceWith(img);
    });

    const ventana = window.open('', '_blank', 'width=1000,height=700');

    if (!ventana) {
      this.toast.error('El navegador bloqueó la ventana de impresión');
      return;
    }

    ventana.document.write(`
      <html>
        <head>
          <title>Etiqueta</title>
          <style>${this.estilosImpresion()}</style>
        </head>
        <body>${clon.outerHTML}</body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();

    // Se espera a que cargue el logo y el QR antes de abrir el diálogo
    setTimeout(() => {
      ventana.print();
      ventana.close();
    }, 400);
  }

  /**
   * Estilos del rótulo repetidos acá porque la ventana de impresión no hereda
   * el CSS del componente (Angular lo aísla por componente).
   */
  protected estilosImpresion(): string {
    return `
      @page { margin: 10mm; }

      /* Sin esto el navegador imprime sin los fondos verdes de los encabezados */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        /* Que el borde no sume ancho y termine cortando el rótulo */
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
      }

      .etiqueta-carpeta {
        width: 100%;
        max-width: 100%;
        overflow: hidden;
        background: #fff;
        border: 1.5px solid #000;
        font-size: 12px;
        color: #000;
      }
      .etiqueta-carpeta .fila-superior {
        display: grid;
        grid-template-columns: 1.6fr 2.6fr 1.6fr;
      }
      .etiqueta-carpeta .columna { display: flex; flex-direction: column; }
      .etiqueta-carpeta .celda {
        border: 1px solid #000;
        margin: -1px 0 0 -1px;
        padding: 3px 4px;
        text-align: center;
        min-height: 20px;
      }
      .etiqueta-carpeta .titulo {
        background-color: #c6e0b4 !important;
        font-weight: 700;
        text-transform: uppercase;
      }
      .etiqueta-carpeta .valor { font-weight: 700; }
      .etiqueta-carpeta .logo {
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
      }
      .etiqueta-carpeta .logo img { max-width: 100%; max-height: 78px; object-fit: contain; }
      .etiqueta-carpeta .qr {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        flex: 1;
      }
      .etiqueta-carpeta .qr img,
      .etiqueta-carpeta .qr canvas, .etiqueta-carpeta .qr svg { max-width: 100%; height: auto; }
      .etiqueta-carpeta .caja-numero {
        font-size: 42px;
        font-weight: 800;
        line-height: 1.05;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        padding: 4px;
        text-align: center;
        overflow-wrap: anywhere;
      }
      /* Rótulo simple: edificio, sala, estantería y fila */
      .etiqueta-simple {
        width: 100%;
        max-width: 100%;
        overflow: hidden;
        background: #fff;
        border: 1.5px solid #000;
        font-size: 12px;
        color: #000;
      }
      .etiqueta-simple .celda {
        border: 1px solid #000;
        margin: -1px 0 0 -1px;
        padding: 5px 8px;
      }
      .etiqueta-simple .titulo {
        background-color: #c6e0b4 !important;
        font-weight: 700;
        text-transform: uppercase;
        text-align: center;
      }
      .etiqueta-simple .qr {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 14px 8px;
      }
      .etiqueta-simple .qr img,
      .etiqueta-simple .qr canvas, .etiqueta-simple .qr svg { max-width: 100%; height: auto; }
      .etiqueta-simple .codigo { margin-top: 8px; font-size: 11px; color: #3f4254; }
      .etiqueta-simple .detalle { text-align: left; }

      .etiqueta-carpeta .fila-inferior {
        display: grid;
        grid-template-columns: 2.2fr 1.4fr .8fr .9fr 1.1fr 1fr 1fr;
      }
      .etiqueta-carpeta .fila-inferior.encabezado { grid-template-rows: auto auto; }
      .etiqueta-carpeta .abarca-2 { grid-column: span 2; }
      .etiqueta-carpeta .abarca-filas {
        grid-row: span 2;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `;
  }

  /** Las fechas se muestran dd/mm/aaaa; el resto va tal cual */
  protected formatearValor(clave: string, valor: any): string {
    if (clave !== 'apertura' && clave !== 'cierre') {
      return String(valor);
    }

    const partes = String(valor).substring(0, 10).split('-');

    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : String(valor);
  }

  /** Sólo los campos marcados, para cuando haya que armar el contenido */
  get camposSeleccionados() {
    return this.campos.filter(c => c.seleccionado);
  }

  alternarCampo(campo: any): void {
    campo.seleccionado = !campo.seleccionado;
  }

  actualizando = false;

  /** Hook para las subclases: se dispara cuando ya llegaron los datos */
  protected alCargarDatos(): void {
    // En el QR no hay nada extra que dibujar
  }

  /** Endpoint que se usa al actualizar; la subclase de barras lo cambia */
  protected llamarActualizacion(id: number, payload: { campos: string[]; id_usuario: number }) {
    return this.etiquetaService.actualizarContenido(id, payload);
  }

  /**
   * Rehace el registro de contenidoQR con los datos actuales y los campos
   * que quedaron marcados.
   */
  actualizarContenido(): void {
    if (!this.ETIQUETA_SELECTED?.id) { return; }

    const campos = this.camposSeleccionados.map(c => c.clave);

    if (!campos.length) {
      this.toast.warning('Debe elegir al menos un campo');
      return;
    }

    const usuario = JSON.parse(localStorage.getItem('user') || '{}');
    this.actualizando = true;

    this.llamarActualizacion(this.ETIQUETA_SELECTED.id, {
      campos,
      id_usuario: usuario?.id
    }).subscribe({
      next: () => {
        this.actualizando = false;
        this.toast.success('Contenido actualizado correctamente');
        // Se recarga para que el QR quede con el contenido nuevo
        this.cargarDatos();
      },
      error: (err) => {
        this.actualizando = false;
        console.error('Error actualizando el contenido:', err);
        this.toast.error('No se pudo actualizar el contenido');
        this.cdr.detectChanges();
      }
    });
  }

  /** Arma la lista de campos, dejando fuera los que vienen vacíos */
  protected construirCampos(): void {
    const u = this.datos?.ubicacion || {};

    const posibles = [
      { clave: 'seccion',     etiqueta: 'Sección',      valor: this.datos?.seccion },
      { clave: 'subseccion',  etiqueta: 'Subsección',   valor: this.datos?.subseccion },
      { clave: 'subseccion2', etiqueta: 'Subsección 2', valor: this.datos?.subseccion2 },
      { clave: 'serie',       etiqueta: 'Serie',        valor: this.datos?.serie },
      { clave: 'subserie',    etiqueta: 'Subserie',     valor: this.datos?.subserie },
      { clave: 'edificio',    etiqueta: 'Edificio',     valor: u.edificio },
      { clave: 'sala',        etiqueta: 'Sala',         valor: u.sala },
      { clave: 'estanteria',  etiqueta: 'Estantería',   valor: u.estanteria },
      { clave: 'fila',        etiqueta: 'Fila',         valor: u.fila },
      { clave: 'caja',        etiqueta: 'Caja',         valor: u.caja },
      { clave: 'carpeta',     etiqueta: 'Carpeta',      valor: u.carpeta },
    ];

    // Estas van siempre, aunque den 0, porque forman parte del rótulo
    const r = this.datos?.resumen || {};

    const cifras = [
      { clave: 'fojas',       etiqueta: 'Fojas',             valor: r.fojas ?? 0 },
      { clave: 'expedientes', etiqueta: 'Cant. expedientes', valor: r.expedientes ?? 0 },
      { clave: 'bibliorato',  etiqueta: 'N° bibliorato',     valor: r.bibliorato ?? 0 },
      { clave: 'apertura',    etiqueta: 'Fecha apertura',    valor: r.apertura || '—' },
      { clave: 'cierre',      etiqueta: 'Fecha cierre',      valor: r.cierre || '—' },
      // Cargadas desde la pantalla de observación de la ubicación. La
      // conformidad llega del backend ya resuelta como SI o NO.
      { clave: 'observacion', etiqueta: 'Observación',       valor: this.datos?.observacion || '—' },
      { clave: 'conformidad', etiqueta: 'Conformidad',       valor: this.datos?.conformidad || 'NO' },
    ];

    // Si la etiqueta ya tiene contenido guardado, se respeta esa selección
    const guardado = this.contenidoGuardado;
    const clavesGuardadas = guardado ? Object.keys(guardado) : null;

    this.campos = [
      ...posibles.filter(c => c.valor),
      ...cifras,
    ].map(c => ({
      ...c,
      valor: String(c.valor),
      seleccionado: clavesGuardadas ? clavesGuardadas.includes(c.clave) : true
    }));
  }

  cargarDatos(): void {
    if (!this.ETIQUETA_SELECTED?.id) { return; }

    this.cargando = true;

    this.etiquetaService.datosEtiqueta(this.ETIQUETA_SELECTED.id).subscribe({
      next: (resp: any) => {
        this.datos = resp?.data || null;
        this.construirCampos();
        this.cargando = false;
        this.cdr.detectChanges();
        this.alCargarDatos();
      },
      error: (err) => {
        console.error('Error cargando los datos de la etiqueta:', err);
        this.cargando = false;
        this.toast.error('No se pudieron cargar los datos de la etiqueta');
        this.cdr.detectChanges();
      }
    });
  }
}
