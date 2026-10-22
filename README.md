# CH360 · Ventas en línea

Demostración del Dr. José Rodolfo Chávez Mejía. Tienda deportiva con identidad propia, compras simuladas, Google Sheets, correo de agradecimiento y resumen agregado para Gerente IA 360.

## Qué está preparado

- Tienda adaptable al celular: cinco productos, filtros, bolsa y formulario.
- Registro privado en Google Sheets y validación de precios/cantidades en el servidor.
- Inventario simulado, bloqueo de operaciones simultáneas y prevención de duplicados por código.
- Comprobante dentro del correo (sin PDF adjunto), sin cobro ni validez fiscal.
- Resumen JSON agregado para lectura del agente, sin nombres ni correos.
- Instrucciones para representar los roles Ventas, Operaciones y Gerencia.

## 1. Crear la hoja

1. Cree una hoja nueva de Google Sheets: **Ventas en línea — Dr. José Chávez**.
2. Abra **Extensiones → Apps Script**.
3. Reemplace el contenido de `Código.gs` con [apps-script/Code.gs](apps-script/Code.gs).
4. Guarde y ejecute la función **configurar**. Autorice los permisos solicitados para su propio proyecto. Esta función crea la pestaña Ventas; no envía correos ni borra registros.
5. En **Configuración del proyecto → Propiedades de la secuencia de comandos**, compruebe que `SPREADSHEET_ID` tiene el identificador de su hoja. `ACEPTAR_COMPRAS` debe ser `SI`.

No comparta públicamente la hoja: contiene nombres y correos. El resumen agregado se consulta mediante Apps Script.

## 2. Implementar Apps Script

1. Pulse **Implementar → Nueva implementación**.
2. Seleccione **Aplicación web**.
3. En **Ejecutar como**, seleccione su cuenta.
4. En **Quién tiene acceso**, seleccione **Cualquier persona**, si su cuenta permite esta opción. Con acceso limitado a la organización, los visitantes externos no podrán participar.
5. Implemente y copie la URL que termina en **/exec**. No use `/dev`.
6. Abra la URL: debe mostrar JSON con `ok: true`, cero compras y cinco productos.

## 3. Conectar la tienda

Edite [config.js](config.js) en GitHub y pegue la URL:

```js
window.VENTAS_CONFIG = {
  appsScriptUrl: 'https://script.google.com/macros/s/SU_IMPLEMENTACION/exec'
};
```

La URL del servicio no es una contraseña. No coloque claves, tokens ni identificadores personales adicionales en GitHub.

## 4. Activar GitHub Pages

En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save**. Utilice la dirección que muestre GitHub una vez finalizada la publicación. El repositorio está preparado para https://jrchavezmejia.github.io/ventasenlinea/; la página solo estará disponible cuando Pages esté activo.

## 5. Prueba sin enviar correos

1. Mantenga `ENVIAR_CORREOS=NO` en las propiedades de Apps Script.
2. Abra la tienda, agregue productos e introduzca datos de prueba (por ejemplo, un nombre ficticio y una dirección reservada de ejemplo).
3. Confirme. Se abre una nueva pestaña con el resultado del servidor. La tienda no afirma que se registró hasta que el servidor lo confirma.
4. Compruebe en Ventas el total, el detalle, el costo y la utilidad bruta.
5. Reabra el resumen y verifique el incremento. Enviar otra vez el mismo código no genera otra venta ni otro correo.
6. Elimine únicamente sus filas de prueba de la hoja antes del evento, conservando la cabecera.

Se usa un formulario HTML POST normal hacia una nueva pestaña, evitando depender de CORS o de `fetch` con respuestas opacas. Si el navegador muestra una advertencia de reenvío, cancelar es seguro: un código ya registrado no vuelve a procesarse.

## 6. Activar el correo para la demostración

1. Cambie la propiedad **ENVIAR_CORREOS** a **SI**.
2. Haga una compra con su propio correo y marque la casilla de recepción.
3. Compruebe el correo y la columna **Estado correo**. Revise también spam.
4. El mensaje incluye nombre, código, fecha de Guatemala, detalle, total y agradecimiento con el enlace https://www.tiktok.com/@dr.jose.chavez.

Solo se intenta enviar cuando se marca la casilla. El correo se envía desde la cuenta que implementa el script, con nombre visible «Dr. José Chávez · Demostración». Una dirección recibe como máximo un correo exitoso durante la sesión registrada en la hoja. Compras posteriores siguen registrándose. No hay reenvío automático de errores ni adjunto PDF. Si se agota la cuota, la venta queda registrada y el estado muestra `SIN CUOTA`.

Google aplica cuotas de correo; la disponibilidad depende de la cuenta. No se ha enviado ningún correo como parte de la preparación del repositorio.

## 7. Conectar el agente

Lea [agente/INSTRUCCIONES.md](agente/INSTRUCCIONES.md). La consulta pública es:

```
SU_URL_EXEC?action=resumen
```

Pruébela desde la herramienta de consulta del agente. Si el agente no puede acceder a la URL, abra el resumen en el navegador y pegue su contenido en el chat. Compartir la URL no instala automáticamente una herramienta de acceso. Los roles Ventas y Operaciones son una simulación dentro del mismo agente.

## Uso en vivo

- Abra la tienda y comparta el enlace al público.
- Pida que cada persona registre una compra simulada y, si quiere el comprobante, marque la casilla.
- Consulte al agente por compras, ingresos, unidades y existencias.
- Pida dos propuestas de decisión basadas en los datos.
- Cierre `ACEPTAR_COMPRAS=NO` y `ENVIAR_CORREOS=NO` al terminar.

Esta implementación está pensada para una demostración corta y supervisada. El formulario es público y no verifica la propiedad del correo; no debe mantenerse abierto como sistema comercial ni como servicio de correo masivo. No se cobran pagos ni se recopilan datos de tarjeta.

## Mantenimiento

- Catálogo: los identificadores y precios deben coincidir entre `app.js` y `apps-script/Code.gs`. Los precios del servidor son los que se registran. No cambie identificadores ni retire productos mientras conserve ventas de esa sesión.
- Después de cambiar Code.gs: **Implementar → Gestionar implementaciones → Editar → Nueva versión → Implementar**.
- No altere el orden de las columnas de Ventas.
- Los nombres y correos se escriben como texto, evitando que se interpreten como fórmulas.
- Los totales son simulados en GTQ. La utilidad bruta no descuenta impuestos ni gastos operativos.
- Las fotos son ilustrativas desde Unsplash y requieren conexión. Identidad CH360 propia; sin afiliación con Nike.

## Documentación oficial

- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/reference/mail/mail-app
- https://developers.google.com/apps-script/guides/services/quotas
