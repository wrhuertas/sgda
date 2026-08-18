import { environment } from "src/environments/environment";


export const URL_BACKEND = environment.URL_BACKEND;
export const URL_SERVICIOS = environment.URL_SERVICIOS;
export const URL_FRONTED = environment.URL_FRONTED;

export const SIDEBAR:any = [
  {
    'name': 'Gráficos',
    'permisos': [
      {
        name:'Graficos',
        permiso: 'grafic_kpi',
      },
    ]
  },
      {
      'name': 'Empresa',
      'permisos': [
        {
          name:'Registrar',
          permiso: 'register_empresa',
        },
        {
          name:'Editar',
          permiso: 'edit_empresa',
        },
        {
          name:'Eliminar',
          permiso: 'delete_empresa',
        }
      ]
    },
   /* {
      'name': 'Roles',
      'permisos': [
        {
          name:'Registrar',
          permiso: 'register_role',
        },
        {
          name:'Editar',
          permiso: 'edit_role',
        },
        {
          name:'Eliminar',
          permiso: 'delete_role',
        }
      ]
    },*/
    {
      'name': 'Usuarios',
      'permisos': [
        {
          name:'Registrar',
          permiso: 'register_user',
        },
        {
          name:'Editar',
          permiso: 'edit_user',
        },
        {
          name:'Eliminar',
          permiso: 'delete_user',
        }
      ]
    },
  
    {
      'name': 'Sección Docuemntal',
      'permisos': [
        {
          name:'Registrar',
          permiso: 'register_documento',
        },
        {
          name:'Editar',
          permiso: 'edit_documento',
        },
        {
          name:'Eliminar',
          permiso: 'delete_documento',
        },
      ]
    },

  
 
   
 
    {
      'name': 'Lista de documentso',
      'permisos': [
        {
          name:'Disponible',
          permiso: 'lista_documentos',
        },
      ]
    },
    {
      'name': 'Busqueda de documentos',
      'permisos': [
        {
          name:'Disponible',
          permiso: 'buscar_documentos',
        },
      ]
    },

    {
      'name': 'Reporte',
      'permisos': [
        {
          name:'Disponible',
          permiso: 'reporte',
        },
      ]
    },



    {
      'name': 'Área',
      'permisos': [
        {
          name:'Registrar',
          permiso: 'register_area',
        },
        {
          name:'Editar',
          permiso: 'edit_area',
        },
        {
          name:'Eliminar',
          permiso: 'delete_area',
        },
      ]
    },
     {
      'name': 'Tipo Documento',
      'permisos': [
        {
          name:'Registrar',
          permiso: 'register_TipoDocumento',
        },
        {
          name:'Editar',
          permiso: 'edit_TipoDocumento',
        },
        {
          name:'Eliminar',
          permiso: 'delete_TipoDocumento',
        },
      ]
    },
     {
      'name': 'Tipo Tramite',
      'permisos': [
        {
          name:'Registrar',
          permiso: 'register_Tipotramite',
        },
        {
          name:'Editar',
          permiso: 'edit_Tipotramite',
        },
        {
          name:'Eliminar',
          permiso: 'delete_Tipotramite',
        },
      ]
    },


     {
      'name': 'Cliente Externo ',
      'permisos': [
        {
          name:'Registrar',
          permiso: 'register_Cliente',
        },
        {
          name:'Editar',
          permiso: 'edit_Cliente',
        },
        {
          name:'Eliminar',
          permiso: 'delete_Cliente',
        },
      ]
    },



     {
      'name': 'Asignar Tramites',
      'permisos': [
        {
          name:'Asginar',
          permiso: 'asignar_tramite',
        },
        
      ]
    },


    {
      'name': 'Tramite',
      'permisos': [
        {
          name:'Registrar',
          permiso: 'register_Tramite',
        },
        {
          name:'Editar',
          permiso: 'edit_Tramite',
        },
        {
          name:'Eliminar',
          permiso: 'delete_Tramite',
        },
      ]
    },

    
    {
      'name': 'Cliente',
      'permisos': [
        {
          name:'Registrar',
          permiso: 'register_Cliente',
        },
        {
          name:'Editar',
          permiso: 'edit_Cliente',
        },
        {
          name:'Eliminar',
          permiso: 'delete_Cliente',
        },
      ]
    },

/*

    
    {
      'name': 'Seguimiento',
      'permisos': [
        {
          name:'Ver',
          permiso: 'seguimiento_tramite',
        },
     
      ]
    },
*/

      {
      'name': 'Recepcion Trámite',
      'permisos': [
        {
          name:'Recepcion',
          permiso: 'recepcion_tramite',
        },
        
      ]
    },
      {
      'name': 'Despacho Trámite',
      'permisos': [
        {
          name:'Despacho',
          permiso: 'despacho_tramite',
        },
        
      ]
    },

      {
      'name': 'Historial Tramite',
      'permisos': [
        {
          name:'historial',
          permiso: 'historial_tramite',
        },
        
      ]
    },

    
      {
      'name': 'Buzon Tramite',
      'permisos': [
        {
          name:'buzon',
          permiso: 'buzon_tramite',
        },
        
      ]
    },
    
    {
      'name': 'Auditoria',
      'permisos': [
        {
          name:'ver auditoria',
          permiso: 'ver_Auditoria',
        },
        
      ]
    },

     {
      'name': 'Respaldo Archivo_&_BD',
      'permisos': [
        {
          name:'resplado',
          permiso: 'backup_database',
        },
        
      ]
    },

    {
      'name': 'Prestamo Expediente',
      'permisos': [
        {
          name:'prestamo ',
          permiso: 'prestamo_expediente',
        },
        
      ]
    },

    {
      'name': 'Certifiados Expediente',
      'permisos': [
        {
          name:'certificado',
          permiso: 'certificado_expediente',
        },

      ]
    },

    {
      'name': 'Scan',
      'permisos': [
        {
          name:'scan',
          permiso: 'scanner',
        },

      ]
    },

    {
      'name': 'Etiquetas',
      'permisos': [
        {
          name:'etiquetas',
          permiso: 'etiquetas',
        },

      ]
    },
];

export function isPermission(permission:string){
  let USER_AUTH = JSON.parse(localStorage.getItem("user") ?? '')
  if(USER_AUTH){
    if(USER_AUTH.role_name == 'Super-Admin'){
      return true;
    }
    if(USER_AUTH.permissions.includes(permission)){
      return true;
    }
    return false;
  }
  return false;
}