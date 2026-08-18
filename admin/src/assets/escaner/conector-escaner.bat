@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM  CONECTOR DE ESCANER - Sistema de Gestion Documental
REM
REM  Es lo que permite que el boton "Abrir escaner" del sistema
REM  web pueda abrir PaperStream Capture en esta computadora.
REM  Se instala una sola vez por equipo.
REM
REM  Doble clic  ..........  instala la conexion
REM  Llamado por Windows ..  abre PaperStream Capture
REM
REM  No necesita permisos de administrador: se registra en el
REM  usuario actual (HKCU), no en toda la maquina.
REM ============================================================

REM  Carpeta donde PaperStream tiene que dejar los PDF escaneados.
REM  Si la cambia, cambiela tambien en el trabajo de PaperStream.
set "CARPETA_ESCANEOS=C:\EscaneosSGDA\entrada"

REM  Si Windows lo llamo con una direccion escaner://, hay que
REM  abrir el programa. Si no vino nada, es un doble clic.
if not "%~1"=="" goto :lanzar


:instalar
echo.
echo  ====================================================
echo   Conectando el escaner con el Sistema Documental
echo  ====================================================
echo.

set "DESTINO=%LOCALAPPDATA%\EscanerSGDA"
set "LANZADOR=%DESTINO%\abrir-escaner.bat"

if not exist "%DESTINO%" mkdir "%DESTINO%"

REM  Carpeta de salida de los escaneos, para que ya exista cuando
REM  se configure el trabajo de PaperStream
if not exist "%CARPETA_ESCANEOS%" mkdir "%CARPETA_ESCANEOS%"

REM  Se copia a si mismo: el mismo archivo hace de lanzador
copy /y "%~f0" "%LANZADOR%" >nul
if errorlevel 1 (
  echo  [ERROR] No se pudo copiar el archivo a "%DESTINO%".
  echo.
  pause
  exit /b 1
)

REM  El ayudante que sube el PDF viaja adentro de este mismo
REM  archivo, al final, despues de la marca. Se recorta con
REM  PowerShell porque escribirlo linea por linea con echo
REM  obligaria a escapar comillas, porcentajes y parentesis.
echo   Preparando el ayudante que sube los escaneos...

REM  LastIndexOf y no IndexOf: esta misma linea menciona la marca,
REM  asi que buscando desde el principio se encontraria a si misma.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$t = Get-Content -LiteralPath '%~f0' -Raw;" ^
  "$i = $t.LastIndexOf('#=====AYUDANTE=====');" ^
  "if ($i -lt 0) { exit 1 };" ^
  "Set-Content -LiteralPath '%DESTINO%\ayudante.ps1' -Value $t.Substring($i) -Encoding UTF8"

if not exist "%DESTINO%\ayudante.ps1" (
  echo  [ERROR] No se pudo preparar el ayudante.
  echo.
  pause
  exit /b 1
)

REM  Se registra con reg add y no armando un archivo .reg: ese
REM  formato exige duplicar las barras de la ruta, y hacer esa
REM  sustitucion desde un .bat no funciona bien. reg add toma la
REM  ruta tal cual viene.
set "CLAVE=HKCU\Software\Classes\escaner"

reg add "%CLAVE%" /ve /d "URL:Escaner Sistema Documental" /f >nul
if errorlevel 1 goto :errorRegistro

reg add "%CLAVE%" /v "URL Protocol" /d "" /f >nul
if errorlevel 1 goto :errorRegistro

reg add "%CLAVE%\shell\open\command" /ve /d "\"%LANZADOR%\" \"%%1\"" /f >nul
if errorlevel 1 goto :errorRegistro

echo   Listo. Esta computadora ya quedo conectada al escaner.
echo.
echo   Quedo registrado asi:
reg query "%CLAVE%\shell\open\command"
echo.
echo  ----------------------------------------------------
echo   FALTA UN PASO, UNA SOLA VEZ, DENTRO DE PAPERSTREAM
echo  ----------------------------------------------------
echo.
echo   Configure el trabajo de PaperStream Capture para que
echo   guarde los escaneos en esta carpeta:
echo.
echo       %CARPETA_ESCANEOS%
echo.
echo   con formato PDF, un archivo por lote.
echo   (Clic derecho sobre el trabajo, editar, paso Destino)
echo.
echo   Esa configuracion vive dentro de PaperStream y no se
echo   puede dejar puesta desde aca.
echo.
echo   Despues vuelva al sistema y toque "Abrir escaner".
echo   Si el navegador ya estaba abierto, cierrelo y vuelva a
echo   entrar para que tome el cambio.
echo.
pause
exit /b 0


:errorRegistro
echo.
echo  [ERROR] No se pudo registrar la conexion al escaner.
echo.
pause
exit /b 1


:lanzar
REM ============================================================
REM  Abre PaperStream Capture. La ruta del ejecutable cambia
REM  segun la version y el fabricante (Fujitsu suele instalarlo
REM  bajo PFU\), asi que se busca en vez de darla por sentada.
REM ============================================================

set "CONFIG=%LOCALAPPDATA%\EscanerSGDA\ruta-paperstream.txt"
set "PAPERSTREAM="

REM ---- Se anota la ruta documental que eligio el usuario -----
REM  Viene dentro de la direccion escaner:// que mando el sistema.
REM  Se guarda tal cual, sin decodificar: de eso se encarga quien
REM  despues sube el PDF, que tiene mejores herramientas.
set "URLCRUDA=%~1"

if not exist "%CARPETA_ESCANEOS%" mkdir "%CARPETA_ESCANEOS%" 2>nul
>"%CARPETA_ESCANEOS%\ruta-actual.txt" echo(!URLCRUDA!

REM ---- 1) Ruta que ya se encontro en una vez anterior --------
if exist "%CONFIG%" (
  set /p PAPERSTREAM=<"%CONFIG%"
  if exist "!PAPERSTREAM!" goto :abrir
  set "PAPERSTREAM="
)

REM ---- 2) El registro de Windows, si el programa se anoto ----
for %%E in (PFU.PaperStream.Capture.exe PSCCap32.exe PaperStreamCapture.exe) do (
  if not defined PAPERSTREAM (
    for /f "tokens=2,*" %%A in (
      'reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\%%E" /ve 2^>nul ^| findstr /i "REG_SZ"'
    ) do (
      if exist "%%~B" set "PAPERSTREAM=%%~B"
    )
  )
)
if defined PAPERSTREAM goto :guardarRuta

REM ---- 3) Las carpetas donde se suele instalar ---------------
REM  La instalacion habitual de los escaneres fi es la primera:
REM  fiScanner\PaperStream Capture\PFU.PaperStream.Capture.exe
for %%C in (
  "%ProgramFiles(x86)%\fiScanner\PaperStream Capture\PFU.PaperStream.Capture.exe"
  "%ProgramFiles%\fiScanner\PaperStream Capture\PFU.PaperStream.Capture.exe"
  "%ProgramFiles(x86)%\PFU\PaperStream Capture\PFU.PaperStream.Capture.exe"
  "%ProgramFiles%\PFU\PaperStream Capture\PFU.PaperStream.Capture.exe"
  "%ProgramFiles(x86)%\PFU\PaperStream Capture\PSCCap32.exe"
  "%ProgramFiles%\PFU\PaperStream Capture\PSCCap32.exe"
  "%ProgramFiles(x86)%\PaperStream Capture\PSCCap32.exe"
  "%ProgramFiles%\PaperStream Capture\PSCCap32.exe"
  "%ProgramFiles(x86)%\Ricoh\PaperStream Capture\PSCCap32.exe"
  "%ProgramFiles%\Ricoh\PaperStream Capture\PSCCap32.exe"
) do (
  if not defined PAPERSTREAM if exist %%C set "PAPERSTREAM=%%~C"
)
if defined PAPERSTREAM goto :guardarRuta

REM ---- 4) Ultimo recurso: buscarlo en Archivos de programa ---
echo Buscando PaperStream Capture, espere un momento...

for %%D in ("%ProgramFiles%" "%ProgramFiles(x86)%") do (
  for %%E in (PFU.PaperStream.Capture.exe PSCCap32.exe PaperStreamCapture.exe) do (
    if not defined PAPERSTREAM (
      for /f "delims=" %%F in ('dir /b /s "%%~D\%%E" 2^>nul') do (
        if not defined PAPERSTREAM set "PAPERSTREAM=%%F"
      )
    )
  )
)

if not defined PAPERSTREAM goto :noEncontrado


:guardarRuta
REM  Se anota para que la proxima vez abra al instante
if not exist "%LOCALAPPDATA%\EscanerSGDA" mkdir "%LOCALAPPDATA%\EscanerSGDA"
>"%CONFIG%" echo !PAPERSTREAM!


:abrir
REM  Primero se abre el escaner, que es lo que el usuario espera
REM  ver. Si algo fallara con el ayudante, igual puede escanear.
REM  Para arrancar directo en un trabajo, agregue los parametros
REM  que documente su version, por ejemplo:  /j "Trabajo01" /s
start "" "!PAPERSTREAM!"

REM  Despues queda el ayudante esperando el PDF, sin ventana. Se
REM  cierra solo al subir el archivo o al acabarse el tiempo.
call :arrancarAyudante
exit /b 0


:arrancarAyudante
REM  Todo en una sola linea a proposito: la continuacion con ^
REM  adentro de un if ( ) rompe el bloque en archivos por lotes.
set "AYUDANTE=%LOCALAPPDATA%\EscanerSGDA\ayudante.ps1"
if not exist "%AYUDANTE%" exit /b 0
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%AYUDANTE%" -Url "%URLCRUDA%" -Carpeta "%CARPETA_ESCANEOS%"
exit /b 0


:noEncontrado
echo.
echo  No se encontro PaperStream Capture en esta computadora.
echo.
echo  Para resolverlo:
echo    1. Haga clic derecho en el acceso directo de PaperStream
echo       Capture del escritorio y elija Propiedades.
echo    2. Copie lo que dice en el campo Destino ^(sin comillas^).
echo    3. Pegue esa ruta, en una sola linea, dentro del archivo:
echo       %CONFIG%
echo.
echo  Con eso el sistema ya sabra donde esta.
echo.
pause
exit /b 1


REM ============================================================
REM  De aca para abajo ya no es un archivo por lotes: es el
REM  ayudante en PowerShell. cmd nunca llega hasta aca porque
REM  todos los caminos de arriba terminan en exit.
REM  Al instalarse, esta parte se recorta a  ayudante.ps1
REM ============================================================

#=====AYUDANTE=====
# ============================================================
#  Ayudante del escaner - Sistema de Gestion Documental
#
#  Espera a que PaperStream deje el PDF en la carpeta y lo sube
#  al servidor. Despues se cierra solo.
#
#  No guarda ninguna clave: usa el pase de un solo uso que le
#  llega en la direccion escaner:// y que se vence enseguida.
# ============================================================

param(
    [string]$Url,
    [string]$Carpeta,
    [int]$MinutosEspera = 20
)

$ErrorActionPreference = 'Stop'

$registro = Join-Path $Carpeta 'ayudante.log'

function Anotar($texto) {
    $linea = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $texto
    Add-Content -LiteralPath $registro -Value $linea -Encoding UTF8
}

try {
    # ---- Se desarma la direccion que mando el sistema ----------
    # Viene como  escaner://escanear/<base64>  y adentro trae la
    # ruta documental, la direccion del servidor y el pase.
    $codificado = $Url.Substring($Url.LastIndexOf('/') + 1)

    # Vuelve de base64url a base64 comun
    $codificado = $codificado.Replace('-', '+').Replace('_', '/')
    while ($codificado.Length % 4 -ne 0) { $codificado += '=' }

    $json = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($codificado))
    $datos = $json | ConvertFrom-Json

    if (-not $datos.api -or -not $datos.pase) {
        Anotar 'La direccion no traia servidor o pase. No hay nada que subir.'
        exit 1
    }

    Anotar ("Esperando escaneo para: " + $datos.ruta)

    # ---- Se anota lo que ya estaba, para no subirlo de nuevo ---
    $previos = @{}
    Get-ChildItem -LiteralPath $Carpeta -Filter *.pdf -ErrorAction SilentlyContinue |
        ForEach-Object { $previos[$_.FullName] = $true }

    $limite = (Get-Date).AddMinutes($MinutosEspera)
    $nuevo = $null

    while ((Get-Date) -lt $limite) {
        Start-Sleep -Seconds 2

        $candidato = Get-ChildItem -LiteralPath $Carpeta -Filter *.pdf -ErrorAction SilentlyContinue |
            Where-Object { -not $previos.ContainsKey($_.FullName) } |
            Sort-Object LastWriteTime |
            Select-Object -First 1

        if (-not $candidato) { continue }

        # PaperStream puede estar escribiendo todavia: se espera a
        # que el tamano deje de cambiar antes de tocarlo
        $tamano1 = $candidato.Length
        Start-Sleep -Seconds 3
        $candidato.Refresh()

        if ($candidato.Length -ne $tamano1) { continue }

        $nuevo = $candidato
        break
    }

    if (-not $nuevo) {
        Anotar 'Se acabo el tiempo de espera y no aparecio ningun PDF.'
        exit 0
    }

    Anotar ("Subiendo: " + $nuevo.Name)

    # ---- Se sube con curl, que ya viene con Windows ------------
    $destino = $datos.api.TrimEnd('/') + '/scanner/recibir'

    # Se baja la exigencia solo para esta llamada: si curl escribe en la
    # salida de errores, con 'Stop' PowerShell lo toma como excepcion y se
    # pierde la respuesta del servidor, que es justo lo que hace falta leer.
    $ErrorActionPreference = 'Continue'

    $salida = & curl.exe -s -S --fail-with-body `
        -F ("archivo=@" + $nuevo.FullName + ";type=application/pdf") `
        -F ("pase=" + $datos.pase) `
        $destino 2>&1 | Out-String

    $codigo = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'

    $salida = $salida.Trim()

    if ($codigo -ne 0) {
        Anotar ("Fallo la subida (curl " + $codigo + "). El servidor respondio: " + $salida)

        # Se aparta para que no quede dando vueltas ni se suba despues a una
        # ruta equivocada. El archivo no se pierde: queda en 'fallidos'.
        $fallidos = Join-Path $Carpeta 'fallidos'
        if (-not (Test-Path -LiteralPath $fallidos)) {
            New-Item -ItemType Directory -Path $fallidos | Out-Null
        }

        Move-Item -LiteralPath $nuevo.FullName -Destination $fallidos -Force
        Anotar ("El PDF quedo guardado en: " + $fallidos)
        exit 1
    }

    Anotar ("Subido correctamente. Respuesta: " + $salida)

    # Ya esta en el servidor: se aparta para no volver a mandarlo
    $subidos = Join-Path $Carpeta 'subidos'
    if (-not (Test-Path -LiteralPath $subidos)) {
        New-Item -ItemType Directory -Path $subidos | Out-Null
    }

    Move-Item -LiteralPath $nuevo.FullName -Destination $subidos -Force
    exit 0
}
catch {
    Anotar ("Error inesperado: " + $_.Exception.Message)
    exit 1
}
