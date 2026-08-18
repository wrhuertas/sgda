import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { URL_SERVICIOS } from 'src/app/config/config';

/** Un tramo de la ruta: su icono y su nombre */
export interface TramoRuta {
  icono: string;
  paths: number;
  nombre: string;
}

@Component({
  selector: 'app-scan-documentos',
  templateUrl: './scan-documentos.component.html',
  styleUrls: ['./scan-documentos.component.scss']
})
export class ScanDocumentosComponent implements OnInit {

  /** Ruta completa, de la sección hasta el nivel que se está escaneando */
  @Input() RUTA: TramoRuta[] = [];

  /** Nivel sobre el que se tocó el botón de escanear */
  @Input() NIVEL = '';

  /** Ids de la serie y de la ubicación física donde va el documento */
  @Input() IDS: { [campo: string]: any } = {};

  /**
   * Protocolo registrado en la PC del usuario que abre PaperStream Capture.
   * Se registra una sola vez por equipo con el .reg de assets/escaner/.
   */
  private readonly PROTOCOLO = 'escaner';

  /** Se prende cuando se detecta que la PC no tiene el escáner registrado */
  escanerNoRegistrado = false;

  /** Mientras se espera a ver si Windows abrió el programa */
  abriendo = false;

  /** El usuario ya dijo alguna vez que instaló el conector en esta PC */
  yaLoDeclaroInstalado = false;

  /**
   * Pase de un solo uso con el que la computadora sube el escaneo.
   * Se pide al abrir el modal y no al tocar el botón: en el clic no hay
   * tiempo de esperar una respuesta sin perder el permiso para abrir el
   * programa externo.
   */
  private pase = '';

  /** Marca en el navegador de que en esta PC el conector ya funcionó */
  private readonly CLAVE_CONECTOR = 'escaner_conector_ok';

  constructor(
    public activeModal: NgbActiveModal,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.pedirPase();
  }

  /**
   * Pide al servidor el pase con el que la computadora va a poder subir el
   * escaneo. Si falla, el escáner se abre igual: el usuario podrá escanear,
   * sólo que el archivo no subirá solo.
   */
  private pedirPase(): void {
    const cabeceras = new HttpHeaders({
      Authorization: 'Bearer ' + (localStorage.getItem('token') || '')
    });

    this.http.post(URL_SERVICIOS + '/scanner/pase', {
      nivel: this.NIVEL,
      ruta: this.rutaTexto,
      tramos: this.RUTA.map((tramo) => tramo.nombre),
      ids: this.IDS
    }, { headers: cabeceras }).subscribe({
      next: (respuesta: any) => { this.pase = respuesta?.pase || ''; },
      error: (err) => {
        this.pase = '';
        console.error('No se pudo obtener el pase de escaneo', err);
      }
    });
  }

  /** Para pintar los <span class="pathN"> que pide cada icono */
  paths(cantidad: number): number[] {
    return Array.from({ length: cantidad }, (_, i) => i + 1);
  }

  /** La ruta en texto, para que el escaneo quede identificado */
  get rutaTexto(): string {
    return this.RUTA.map((tramo) => tramo.nombre).join(' / ');
  }

  /**
   * Empaqueta los datos del escaneo en base64 para meterlos en la dirección.
   *
   * Va todo en un solo tramo y no como parámetros con "&" porque Windows
   * ejecuta los .bat a través de cmd, y ahí el "&" corta la línea: la ruta
   * llegaba partida al conector. En base64 sólo hay letras, números y unos
   * pocos signos, así que atraviesa cmd sin que lo toque.
   */
  private datosEnBase64(pase: string): string {
    const datos = JSON.stringify({
      nivel: this.NIVEL,
      ruta: this.rutaTexto,
      tramos: this.RUTA.map((tramo) => tramo.nombre),
      api: URL_SERVICIOS,
      pase: pase
    });

    // El unescape/encodeURIComponent es para que btoa acepte los acentos
    return btoa(unescape(encodeURIComponent(datos)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Abre PaperStream Capture en la PC del usuario.
   *
   * El navegador no puede hablar con un escáner, así que se llama a un
   * protocolo de Windows registrado en ese equipo: Windows lo resuelve y
   * lanza el programa. Por eso funciona aunque el sistema esté en un servidor.
   */
  abrirEscaner() {
    this.escanerNoRegistrado = false;
    this.abriendo = true;

    // Se lanza en el mismo instante del clic. Si se esperara la respuesta de
    // una petición, el navegador ya no lo dejaría abrir un programa externo:
    // sólo lo permite mientras dura el gesto del usuario.
    this.lanzarProtocolo(this.pase);

    // El pase es de un solo uso, así que se pide otro para el próximo escaneo
    this.pedirPase();
  }

  /** Le pasa la dirección a Windows y se fija si algo la atendió */
  private lanzarProtocolo(pase: string) {
    const destino = `${this.PROTOCOLO}://escanear/${this.datosEnBase64(pase)}`;

    // No hay forma de preguntarle al navegador si el protocolo existe. Lo que
    // sí se nota es que, cuando Windows abre el programa, la ventana pierde el
    // foco. Si al cabo de un momento eso no pasó, es que no está registrado.
    let seAbrio = false;

    const marcarAbierto = () => { seAbrio = true; };

    window.addEventListener('blur', marcarAbierto, { once: true });
    document.addEventListener('visibilitychange', marcarAbierto, { once: true });

    window.location.href = destino;

    setTimeout(() => {
      window.removeEventListener('blur', marcarAbierto);
      document.removeEventListener('visibilitychange', marcarAbierto);

      this.abriendo = false;

      if (seAbrio) {
        // Queda anotado para no volver a pedir la instalación en esta PC
        this.recordarConectorInstalado();
        this.escanerNoRegistrado = false;
        return;
      }

      // No se abrió. Igual se avisa siempre: si el usuario dijo que ya lo
      // tenía instalado, el aviso es más corto, pero nunca se lo deja sin
      // saber por qué el botón no hizo nada.
      this.escanerNoRegistrado = true;
      this.yaLoDeclaroInstalado = this.conectorYaInstalado();
    }, 1800);
  }

  /** El usuario dice que ya lo instaló: se le cree y no se insiste */
  marcarConectorInstalado() {
    this.recordarConectorInstalado();
    this.yaLoDeclaroInstalado = true;
    this.escanerNoRegistrado = false;
  }

  private conectorYaInstalado(): boolean {
    try {
      return localStorage.getItem(this.CLAVE_CONECTOR) === '1';
    } catch (e) {
      return false;
    }
  }

  private recordarConectorInstalado() {
    try {
      localStorage.setItem(this.CLAVE_CONECTOR, '1');
    } catch (e) {
      // Si el navegador no deja guardar, sólo se pierde la comodidad
    }
  }
}
