import { ProyectoModule } from './../modules/proyecto/proyecto.module';
import { Routes } from '@angular/router';

const Routing: Routes = [
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./dashboard/dashboard.module').then((m) => m.DashboardModule),
  },
  {
    path: 'builder',
    loadChildren: () =>
      import('./builder/builder.module').then((m) => m.BuilderModule),
  },
  {
    path: 'crafted/pages/profile',
    loadChildren: () =>
      import('../modules/profile/profile.module').then((m) => m.ProfileModule),
    // data: { layout: 'light-sidebar' },
  },
  {
    path: 'crafted/account',
    loadChildren: () =>
      import('../modules/account/account.module').then((m) => m.AccountModule),
    // data: { layout: 'dark-header' },
  },
  {
    path: 'crafted/pages/wizards',
    loadChildren: () =>
      import('../modules/wizards/wizards.module').then((m) => m.WizardsModule),
    // data: { layout: 'light-header' },
  },
  {
    path: 'crafted/widgets',
    loadChildren: () =>
      import('../modules/widgets-examples/widgets-examples.module').then(
        (m) => m.WidgetsExamplesModule
      ),
    // data: { layout: 'light-header' },
  },
  {
    path: 'apps/chat',
    loadChildren: () =>
      import('../modules/apps/chat/chat.module').then((m) => m.ChatModule),
    // data: { layout: 'light-sidebar' },
  },
  {
    path: 'apps/users',
    loadChildren: () => import('./user/user.module').then((m) => m.UserModule),
  },
  {
    path: 'apps/roles',
    loadChildren: () => import('./role/role.module').then((m) => m.RoleModule),
  },
  {
    path: 'apps/permissions',
    loadChildren: () =>
      import('./permission/permission.module').then((m) => m.PermissionModule),
  },
  // MIS MODULOS localhost:4200/roles/list
  {
    path: 'roles',
    loadChildren: () =>
      import('../modules/roles/roles.module').then((m) => m.RolesModule),
  },
  {
    path: 'usuarios',
    loadChildren: () =>
      import('../modules/users/users.module').then((m) => m.UsersModule),
  },
  // MIS MODULOS localhost:4200/configuraciones/sucursales/list
  {
    path: 'configuraciones',
    loadChildren: () =>
      import('../modules/configuration/configuration.module').then(
        (m) => m.ConfigurationModule
      ),
  },
  {
    path: 'productos',
    loadChildren: () =>
      import('../modules/products/products.module').then(
        (m) => m.ProductsModule
      ),
  },
  {
    path: 'clientes',
    loadChildren: () =>
      import('../modules/clients/clients.module').then((m) => m.ClientsModule),
  },
  {
    path: 'proformas',
    loadChildren: () =>
      import('../modules/proformas/proformas.module').then(
        (m) => m.ProformasModule
      ),
  },
  {
    path: 'caja',
    loadChildren: () =>
      import('../modules/cajas/cajas.module').then((m) => m.CajasModule),
  },
  {
    path: 'cronograma-de-envios',
    loadChildren: () =>
      import(
        '../modules/cronograma-proformas/cronograma-proformas.module'
      ).then((m) => m.CronogramaProformasModule),
  },
  {
    path: 'comisiones-asesores',
    loadChildren: () =>
      import('../modules/comissions/comissions.module').then(
        (m) => m.ComissionsModule
      ),
  },
  {
    path: 'compras',
    loadChildren: () =>
      import('../modules/purchase/purchase.module').then(
        (m) => m.PurchaseModule
      ),
  },
  {
    path: 'transportes',
    loadChildren: () =>
      import('../modules/transports/transports.module').then(
        (m) => m.TransportsModule
      ),
  },
  {
    path: 'conversiones',
    loadChildren: () =>
      import('../modules/conversions/conversions.module').then(
        (m) => m.ConversionsModule
      ),
  },
  {
    path: 'despacho',
    loadChildren: () =>
      import('../modules/despacho/despacho.module').then(
        (m) => m.DespachoModule
      ),
  },
  {
    path: 'kardex',
    loadChildren: () =>
      import('../modules/kardex/kardex.module').then((m) => m.KardexModule),
  },
  {
    path: 'empresas',
    loadChildren: () =>
      import('../modules/empresas/empresas.module').then(
        (m) => m.EmpresasModule
      ),
  },
   {
    path: 'proyectos',
    loadChildren: () =>
      import('../modules/proyecto/proyecto.module').then(
        (m) => m.ProyectoModule
      ),
  },
  {
    path: 'modulos',
    loadChildren: () =>
      import('../modules/modulos/modulos.module').then(
        (m) => m.ModulosModule
      ),
  },
  {
  path: 'secciones',
  loadChildren: () =>
    import('../modules/secciones/secciones.module').then(
      (m) => m.SeccionesModule
    ),
},
{
  path: 'indexacion',
  loadChildren: () =>
    import('../modules/indexacion/indexacion.module').then(
      (m) => m.IndexacionModule
    ),
},
{
  path: 'masivo',
  loadChildren: () =>
    import('../modules/masivo/masivo.module').then(
      (m) => m.MasivoModule
    ),
},
{
    path: 'indexacion-serie', // ruta más específica primero
    loadChildren: () =>
      import('../modules/indexacion-serie/indexacion-serie.module').then(
        m => m.IndexacionSerieModule
      ),
  },

{
    path: 'indexacion', // ruta más específica primero
    loadChildren: () =>
      import('../modules/indexacion/indexacion.module').then(
        m => m.IndexacionModule
      ),
  },

{
    path: 'subserie', // ruta más específica primero
    loadChildren: () =>
      import('../modules/subserie/subserie.module').then(
        m => m.SubserieModule
      ),
  },

{
    path: 'serie', // ruta más específica primero
    loadChildren: () =>
      import('../modules/serie/serie.module').then(
        m => m.SerieModule
      ),
  },
{
    path: 'subseccion2', // ruta más específica primero
    loadChildren: () =>
      import('../modules/subseccion2/subseccion2.module').then(
        m => m.Subseccion2Module
      ),
  },
{
    path: 'subseccion1', // ruta más específica primero
    loadChildren: () =>
      import('../modules/subseccion1/subseccion1.module').then(
        m => m.Subseccion1Module
      ),
  },
  {
    path: 'subseccion', // otra ruta lazy loaded
    loadChildren: () =>
      import('../modules/subseccion/subseccion.module').then(
        m => m.SubseccionModule
      ),
  },



    {
    path: 'documentos',
    loadChildren: () =>
      import('../modules/documentos/documentos.module').then(
        (m) => m.DocumentosModule
      ),
  },

   {
    path: 'busqueda',
    loadChildren: () =>
      import('../modules/busqueda/busqueda.module').then(
        (m) => m.BusquedaModule
      ),
  },

 {
    path: 'reportes',
    loadChildren: () =>
      import('../modules/reportes/reportes.module').then(
        (m) => m.ReportesModule
      ),
  },

  ////////////////////////////////////////////MODULO DE TRAMITES/////////////////////////////////////////

{
  path: 'area',
  loadChildren: () =>
    import('../modules/Tramites/Area/area.module').then( // Asegúrate de que apunta a area.module
      (m) => m.AreaModule // Asegúrate de que esta clase es la que exporta area.module.ts
    ),
},

{
  path: 'cliente',
  loadChildren: () =>
    import('../modules/Tramites/Cliente/cliente.module').then( // Asegúrate de que apunta a area.module
      (m) => m.ClienteModule // Asegúrate de que esta clase es la que exporta area.module.ts
    ),
},


{
  path: 'tramites',
  loadChildren: () =>
    import('../modules/Tramites/Recepcion/recepcion.module').then( // Asegúrate de que apunta a area.module
      (m) => m.RecepcionModule // Asegúrate de que esta clase es la que exporta area.module.ts
    ),
},


{
  path: 'tipodocumento',
  loadChildren: () =>
    import('../modules/Tramites/TipoDocumento/tipo-documento.module').then( // Asegúrate de que apunta a area.module
      (m) => m.TipoDocumentoModule // Asegúrate de que esta clase es la que exporta area.module.ts
    ),
},


{
  path: 'registrartramite',
  loadChildren: () =>
    import('../modules/Tramites/RegistrarTramite/registrar-tramite.module').then( // Asegúrate de que apunta a area.module
      (m) => m.RegistrarTramiteModule // Asegúrate de que esta clase es la que exporta area.module.ts
    ),
},


{
  path: 'seguimiento',
  loadChildren: () =>
    import('../modules/Tramites/Seguimiento/seguimiento.module').then( // Asegúrate de que apunta a area.module
      (m) => m.SeguimientoModule // Asegúrate de que esta clase es la que exporta area.module.ts
    ),
},


{
  path: 'recepcion',
  loadChildren: () =>
    import('../modules/Tramites/Recepcion/recepcion.module').then( // Asegúrate de que apunta a area.module
      (m) => m.RecepcionModule // Asegúrate de que esta clase es la que exporta area.module.ts
    ),
},


{
  path: 'auditoria',
  loadChildren: () =>
    import('../modules/reportes/auditoria/auditoria.module').then( // Asegúrate de que apunta a area.module
      (m) => m.AuditoriaModule // Asegúrate de que esta clase es la que exporta area.module.ts
    ),
},



{
  path: 'asignar',
  loadChildren: () =>
    import('../modules/Tramites/asignar-tramite/asignar-tramite.module').then( // Asegúrate de que apunta a area.module
      (m) => m.AsignarTramiteModule // Asegúrate de que esta clase es la que exporta area.module.ts
    ),
},


{
  path: 'historial',
  loadChildren: () =>
    import('../modules/Tramites/historial-tramite/historial-tramite.module').then( // Asegúrate de que apunta a area.module
      (m) => m.HistorialTramiteModule // Asegúrate de que esta clase es la que exporta area.module.ts
    ),
},



{
  path: 'tipotramite',
  loadChildren: () =>
    import('../modules/Tramites/tipo-tramites/tipo-tramites.module').then( // Asegúrate de que apunta a area.module
      (m) => m.TipoTramitesModule // Asegúrate de que esta clase es la que exporta area.module.ts
    ),
},


{
  path: 'respaldo',
  loadChildren: () =>
    import('../modules/respaldo/respaldo.module').then( // <--- DEBE SER .module, NO -routing.module
      (m) => m.RespaldoModule // <--- DEBE SER RespaldoModule
    ),
},


{
  path: 'prestamo',
  loadChildren: () =>
    import('../modules/gestion-documental/prestamo/prestamo.module').then( // <--- DEBE SER .module, NO -routing.module
      (m) => m.PrestamoModule // <--- DEBE SER RespaldoModule
    ),
},


{
  path: 'certificado',
  loadChildren: () =>
    import('../modules/gestion-documental/certificado/certificado.module').then( // <--- DEBE SER .module, NO -routing.module
      (m) => m.CertificadoModule // <--- DEBE SER RespaldoModule
    ),
},

{
  path: 'auditoriadocumental',
  loadChildren: () =>
    import('../modules/reportes/auditoria-docuemntal/auditoria-docuemntal.module').then(
      (m) => m.AuditoriaDocuemntalModule
    ),
},



{
  path: 'despacho',
  loadChildren: () =>
    import('../modules/Tramites/Despacho/despacho.module').then( // Asegúrate de que apunta a area.module
      (m) => m.DespachoModule // Asegúrate de que esta clase es la que exporta area.module.ts
    ),
},

  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'error/404',
  },
];

export { Routing };
