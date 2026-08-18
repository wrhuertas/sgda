import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { BusquedaService } from '../service/busqueda.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-busquea-avanzada',
  templateUrl: './busquea-avanzada.component.html',
  styleUrls: ['./busquea-avanzada.component.scss']
})
export class BusqueaAvanzadaComponent implements OnInit {

  @Input() titulo: string = '';
  @Input() proyectos: any[] = []; 

  niveles: any[] = [];
  public isLoading: boolean = false;
  
  // VARIABLE PARA EL INPUT ÚNICO
  terminoGeneral: string = ''; 
  tipoDocumentoFiltro: string = '';
  activeTab = 1;
  
  esNivelSerie: boolean = false; 

  // Variables necesarias en tu componente
tiposDocumento: any[] = [];
tiposConParametros: any = {}; // Para guardar el objeto completo { "FACTURA": "param1, param2" }
parametrosActuales: string[] = []; // Los campos para los inputs dinámicos
valoresParametros: { [nombre: string]: string } = {}; // Lo escrito en cada input
cargandoTipos: boolean = false;

  
  titulosNiveles = [
    "Seccion Documental",
    "Sub Seccion Documental",
    "Sub Sub Seccion Docuemntal",
    "Serie",
    "Subserie",
    "Sub-subserie"
  ];

  constructor(
    public activeModal: NgbActiveModal,
    private busquedaService: BusquedaService,
    private toast: ToastrService,
  ) {}

  ngOnInit() {
    this.niveles = [{ opciones: this.proyectos, seleccionado: null }];
    // Cargar tipos de documento al iniciar, independiente de la cascada
    this.cargarTiposDocumento();
  }

  seleccionarNivel(index: number) {
    const seleccionado = this.niveles[index].seleccionado;
    
    this.niveles.splice(index + 1);
    this.esNivelSerie = false; 

    if (!seleccionado) return;

    let continuaCascada = false;

    if (seleccionado.subsecciones && seleccionado.subsecciones.length > 0) {
      this.niveles.push({ opciones: seleccionado.subsecciones, seleccionado: null });
      continuaCascada = true;
    }

    if (seleccionado.series && seleccionado.series.length > 0) {
      this.niveles.push({ opciones: seleccionado.series, seleccionado: null });
      continuaCascada = true;
    }

    if (seleccionado.hijos_recursivos && seleccionado.hijos_recursivos.length > 0) {
      this.niveles.push({ opciones: seleccionado.hijos_recursivos, seleccionado: null });
      continuaCascada = true;
    }
    
    if (!continuaCascada) {
        this.esNivelSerie = true; 
    }
  }

  aplicarBusqueda() {
    const rutaObjetos = this.niveles
      .map(n => n.seleccionado)
      .filter(s => s !== null);
  
    const ids_ruta: any = {};
  
    rutaObjetos.forEach(item => {
      if (item.id_proyecto) {
        switch (item.nivel) {
          case 1: ids_ruta.id_seccion = item.id_proyecto; break; 
          case 2: ids_ruta.id_subseccion = item.id_proyecto; break;
          case 3: ids_ruta.id_subsubseccion = item.id_proyecto; break;
        }
      }
      if (item.id_serie) {
        if (!ids_ruta.id_serie) {
          ids_ruta.id_serie = item.id_serie;
        } else {
          ids_ruta.id_subserie = item.id_serie;
        }
      }
    });
  
    const user = JSON.parse(localStorage.getItem('user') || '{}');
  
    const dataBusqueda = {
      ids_ruta,
      busqueda: this.terminoGeneral,
      id_empresa: user.id_empresa || null,
      tipo_documento: this.tipoDocumentoFiltro || null
    };
  
    // 🔥 SOLO DEVUELVE LOS DATOS
    this.activeModal.close(dataBusqueda);
  }

  cerrar() { this.activeModal.dismiss(); }





cargarTiposDocumento() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const idEmpresa = user?.id_empresa;

  if (!idEmpresa) return;

  this.cargandoTipos = true;
  
  // Asumiendo que ahora tu servicio trae el objeto completo con los parámetros
  this.busquedaService.getTiposDocumentoEmpresa(idEmpresa).subscribe({
    next: (resp) => {
      console.log('Datos recibidos del backend:', resp);
      
      // Guardamos el objeto completo para consultar parámetros luego
      this.tiposConParametros = resp;

      // Extraemos las llaves para el select (los tipos de documento)
      this.tiposDocumento = Object.keys(resp)
        .filter((item: string) => item && item.trim() !== '')
        .map((item: string) => ({
          id: item,
          nombre: item
        }));
    },
    error: (err) => {
      console.error('Error:', err);
      this.cargandoTipos = false;
    },
    complete: () => {
      this.cargandoTipos = false;
    }
  });
}

// Esta función se llama desde el HTML cuando el select cambia
onTipoDocumentoChange(event: any) {
  const tipoSeleccionado = event.target.value;
  this.tipoDocumentoFiltro = tipoSeleccionado;

  // Cada tipo tiene sus propios parámetros, así que se descarta lo escrito
  // para el tipo anterior y no se manden filtros que ya no corresponden
  this.valoresParametros = {};

  const paramString = this.tiposConParametros[tipoSeleccionado];

  if (paramString) {
    // 1. Quitamos los corchetes [ ] y las comillas " '
    // 2. Reemplazamos las comas , si es necesario
    // 3. Convertimos a array
    this.parametrosActuales = paramString
      .replace(/[\[\]"']/g, '') // Elimina [, ], ", '
      .split(',')              // Divide por la coma
      .map((p: string) => p.trim()) // Quita espacios extra
      .filter((p: string) => p !== ''); // Asegura que no queden vacíos
  } else {
    this.parametrosActuales = [];
  }
}


/**
 * Cierra el modal devolviendo el tipo de documento y los parámetros escritos.
 * La búsqueda y el pintado en la tabla los hace el componente de la lista,
 * igual que con la búsqueda por ruta.
 */
buscarPorDocumento() {
  if (!this.tipoDocumentoFiltro) {
    this.toast.warning('Seleccione un tipo de documento');
    return;
  }

  // Sólo viajan los parámetros con algo escrito: los vacíos no filtran
  const parametros: { [nombre: string]: string } = {};

  this.parametrosActuales.forEach((nombre) => {
    const valor = (this.valoresParametros[nombre] || '').trim();
    if (valor !== '') {
      parametros[nombre] = valor;
    }
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  this.activeModal.close({
    ids_ruta: {},
    busqueda: '',
    id_empresa: user.id_empresa || null,
    tipo_documento: this.tipoDocumentoFiltro,
    parametros
  });
}
}
