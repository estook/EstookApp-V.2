# La Auditoría 3 · Todo Estook (27-nov-2026)

> La pidió Richi el 27-nov, antes del siguiente módulo: **de todo Estook, no solo de lo último**. La manda el
> [Plan, E5](../maestros/Estook-Plan-de-Desarrollo.md) (iban siete entregas desde la del 25-nov). Cada «hay un
> fallo» de aquí está **comprobado con una prueba o leído en el código**, y se dice cuál de las dos. Lo que no se
> ha podido confirmar va en su apartado, al final.

## 0 · Antes de empezar: producción

- **Base: 135 migraciones, no 136.** La #212 (el teléfono del local, con la 0136) está en verde en GitHub pero
  **sin fusionar**. Hasta que se fusione, se migre y se despliegue, la web de reservas y la carta siguen poniendo
  el teléfono de Google por delante del del local.
- **API: 152 consultas y 400 comandos**, las conoce todas (`bd:comprobar-api`, 27-nov). El reloj late, ningún
  documento lleva más de dos horas sin saber de Hacienda y nada vendido lleva más de una hora sin bajar.

## 1 · Cómo se ha hecho

**Leído:** ESTADO, la memoria, el Plan (E5), Roles, la Auditoría de flujos, la auditoría del 25-nov, el
despachador entero (las cinco puertas), las 552 operaciones con lo que declara cada una, las migraciones 0125 a
0136 una a una, las funciones con privilegio nuevas, las políticas de la organización, el local y las
membresías, la ficha, las nóminas, las reservas, la web sin sesión, el cálculo del IVA, las propinas, el cobro a
partes, el saldo de vacaciones, el gasto medio, Sentry, los registros, la política de seguridad del navegador y
lo que se guarda en él.

**Lanzado:**

| Qué                                                                                  | Resultado                                                                        |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| La prueba que ataca toda la API (`nadie-toca-lo-de-otro-negocio`), entera            | **0 hallazgos**; 279 operaciones pasaron, 50 no se pudieron generar              |
| Sonda propia: **otra empresa** atacando con **un aparato del TPV vinculado**         | **0 datos cruzados** en las 137 operaciones del TPV y las 45 sin sesión (ver M2) |
| Sonda propia: **otro local de la misma cadena** (Bar Ribera contra Bar Puerto)       | **0 datos cruzados** entre los dos locales (ver M2)                              |
| Sonda propia: las **subidas de fotos y documentos**, con almacén de ficheros         | **0 datos cruzados**                                                             |
| Sonda propia: **la ficha privada** vista por cada rol                                | **Fallo**: G1                                                                    |
| Sonda propia: **una gerente de un local** contra la organización entera              | **Fallo**: G2 y G3                                                               |
| `pnpm audit --prod` (dependencias)                                                   | 11 avisos: 2 altos, 8 medios, 1 bajo (M4)                                        |
| Producción, **solo lectura**: de dónde salen el teléfono y la posición de cada local | IKATZ tiene su teléfono; **su posición para fichar es la de Google** (M3)        |

Las sondas se borraron al acabar: lo que vigilan entra como prueba de verdad con los arreglos (apartado 14).

## 2 · El resumen

| Gravedad   | Cuántos | Cuáles                                                                                                                                                                                                                                                         |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Grave**  | 3       | G1 · lo privado de la ficha se ve hacia arriba · G2 · la gerente de un local cambia la empresa entera · G3 · la gerente de un local da acceso a toda la cadena                                                                                                 |
| **Medio**  | 6       | M1 · los topes por dirección se saltan · M2 · la prueba que ataca la API no ve el TPV ni los ficheros · M3 · Google y la posición de IKATZ · M4 · dependencias · M5 · el sí de las alergias no queda guardado · M6 · sin copia de seguridad, ahora con nóminas |
| **Leve**   | 8       | 6.1, 7.2 a 7.6, 8.1 y 8.2                                                                                                                                                                                                                                      |
| **Mejora** | 10      | Apartado 12                                                                                                                                                                                                                                                    |

**Hoy, en producción, G1 a G3 no le pasan a nadie de verdad** (leído en producción, sin nombres): no hay ninguna
cadena real (Burger King, con dos locales, es de prueba), y en IKATZ, que tiene cinco gerentes, la única ficha
privada rellena es la de un cocinero, que la ven quienes deben. Pero rompen la regla 11 («los datos de una empresa no los ve
otra jamás», «lo que un plan no lleva lo niegan el servidor y la base») y el día que entre una cadena estarían
abiertos. **Van los primeros**, antes de cualquier otra cosa (E5: un fallo grave para todo lo demás).

---

## 3 · Roles y permisos

### G1 · Grave · Lo privado de la ficha se ve hacia arriba y entre iguales — **comprobado con prueba**

- **Dónde:** `base-de-datos/migraciones/0127_la_ficha_del_trabajador.sql:168-169` (`ficha_privada`),
  `:227-228` (`documento_de_persona`: contratos y nóminas) y `:111-112` (`ficha_laboral`). Las tres usan
  `estook.la_lleva` (`:28-49`), que pregunta a `estook.a_quien_lleva`
  (`0027_fichajes_y_lo_que_cuesta_una_hora.sql:393`), y esa devuelve **a todo el equipo desde gerente**,
  también a quien manda más.
- **Qué pasa:** la gerente de un local ve **el DNI, el teléfono, el domicilio, el sueldo, el contrato y las
  nóminas** de la dirección y del area manager que llevan su local, y los de otro gerente del mismo local. El
  area manager ve los de la dirección. RRHH, los de todos (estos dos últimos, leídos en el código). Para **rellenar** la ficha sí se mira que mandes más
  (`servidor/aplicacion/la-ficha.ts:130-144`); para **verla**, no.
- **La prueba:** en Grupo Costa, Vera (gerente de Bar Ribera) abre la ficha de Elena (dirección) y recibe
  `dni: 12345678Z, sueldoCentimos: 999999`. Ignacio (area manager) recibe lo mismo de Elena.
- **Quién lo nota:** el dueño o el area manager que tenga ficha, y dos gerentes en un mismo local.
- **Roles dice** «lo de su gente» y, para lo que cobra cada uno, «nunca hacia arriba» (1.10).
- **Cómo lo arreglaría:** lo privado y los documentos, **solo de quien está por debajo** (la misma regla que para
  rellenarla) y la propia persona; las condiciones, igual, más los jefes con su familia. Una función de la base,
  `estook.esta_por_debajo`, que usen las tres políticas y el servidor. Con su prueba: Vera no ve a Elena, Elena
  sí ve a Vera, y dos gerentes no se ven lo privado.

### G2 · Grave · La gerente de un local cambia la empresa entera — **comprobado con prueba**

- **Dónde:** `0008_politicas_de_seguridad.sql:52-55` (quién cambia la organización) usa
  `estook.nivel_de_permiso_en_organizacion` (`0018_identidad_y_acceso.sql:277`), que **no mira el alcance**: le
  vale el rol que tengas en cualquier local. Las operaciones `cambiar_nombre_del_negocio` y
  `exigir_doble_factor` (`servidor/aplicacion/comandos/ajustes-de-organizacion.ts`) no declaran permiso y confían
  en esa política.
- **Qué pasa:** Vera, gerente de un solo local de Grupo Costa, **renombra toda la empresa** y **enciende o apaga
  el doble factor obligatorio de todos sus locales**. El area manager, también.
- **Quién lo nota:** toda la cadena. Apagar el doble factor de todos es rebajar una protección que no es suya.
- **Cómo lo arreglaría:** lo de la organización, solo con un puesto **de toda la organización** (dirección y
  administrador de cuenta). Que `nivel_de_permiso_en_organizacion` cuente solo las membresías de alcance
  `organizacion`, y que las dos operaciones declaren su permiso (`accion.gestionar_locales`). Con su prueba.

### G3 · Grave · La gerente de un local da acceso a toda la cadena — **comprobado con prueba**

- **Dónde:** `0008_politicas_de_seguridad.sql:122-140` (las membresías de toda la organización se crean con el
  mismo «nivel en la organización» que no mira el alcance) y `servidor/aplicacion/comandos/invitar-persona.ts:113`,
  que solo mira que el rol no sea el tuyo o uno por encima.
- **Qué pasa:** Vera invita a alguien como **RRHH, gestoría, chef corporativo o compras central de toda la
  cadena**, y entra. Ese RRHH, con G1, ve el DNI, el sueldo y las nóminas de **los seis locales**; la gestoría,
  las ventas de todos.
- **Cómo lo arreglaría:** el mismo arreglo de G2 en la base, y en el servidor: un puesto de toda la organización
  solo lo da quien es de toda la organización; uno de área, quien lleva esa área o más.

### 3.1 · Lo que cuadra con Roles (comprobado en la base)

La matriz de la base dice lo mismo que Roles 1.3 a 1.12 para camarero, cocinero, jefes, gerente, dirección,
RRHH, chef, compras, administrador de cuenta y gestoría: nadie de sala o cocina ve importes de compra, ventas ni
coste de personal (lo confirma la segunda parte de la prueba grande); el jefe de cocina **ve** Equipo y Ajustes y
no los cambia; los permisos de la facturación solo los da la dirección (`dar_un_permiso_de_los_documentos`, 0107);
la gestoría solo mira. **Cada operación del servidor declara su puerta** (lo vigila `despachador.prueba.ts`), y las
96 que no declaran permiso se apoyan en la seguridad por filas: las sensibles de ellas, revisadas a mano
(`una_persona`, `abrir_un_documento_de_persona`, `dar_un_permiso`, `quien_hace_que`, `tickets_y_facturas`); el
único fallo era el de G2.

**Y el admin** sigue en su mundo: una sesión de Estook no abre el admin ni al revés, con doble factor y su nivel
mirados en cada petición (`despachador.ts:279-307`).

---

## 4 · Restaurantes y empresas: nada cruza

- **Entre empresas:** la prueba grande y la sonda con aparatos, sin sesión y con almacén de ficheros: **0 datos
  cruzados**. Lo único que salió es que `poner_en_la_carta` contesta «hecho» con un plato de otro local sin
  tocarlo (7.2).
- **Entre locales de una misma cadena:** **0 datos cruzados** entre Bar Ribera y Bar Puerto. Lo que sí cruza es
  **lo de la organización entera** (G2 y G3).
- **Lo que tenía la víctima** para atacarlo: la carta, el almacén, el plano con 30 mesas, tres mesas abiertas, la
  caja abierta, la lista de espera, el chat, el tablón, el horario y los fichajes. **No llegó a tener** reservas con
  mesa, platos pedidos ni cobros (las sondas no supieron montarlos), así que **eso no está atacado**: lo cubre la
  parte 2 (M2).
- **Las tablas nuevas, una a una**, con su seguridad por filas: `ficha_laboral`, `ficha_privada`,
  `documento_de_persona` (G1), `solicitud_de_vacaciones`, `nota_personal` (solo su dueño, también para el
  gerente), `evento_de_calendario`, `reserva`, `reserva_de_mesa`, `ajuste_de_reservas`, `mesas_que_se_juntan`,
  `aviso_si_se_libera`, `intento_en_la_web_de_reservas` (solo el sistema), `cliente_del_local` y `espera`: todas
  filtran por el local de quien pregunta. Las funciones con privilegio nuevas (`vacaciones_aprobadas`,
  `lo_que_avisa_el_calendario`, `las_reservas_grandes`, `el_cliente_de_la_reserva`) miran el local o que sea el
  sistema.
- **La web sin sesión** trabaja «como el sistema» toda la transacción (`reservas-web.ts:33`): cada consulta filtra
  por el local de la dirección, y el local tiene que ser de Pro y tener las reservas encendidas
  (`reservas-web.ts:52-98`). Revisado en el código.

## 5 · Datos que vienen de fuera

- **Google:** con la #212, la carta y la web ponen lo del local por delante. **Pero queda una puerta:** al
  conectar Google, si el local no tenía teléfono o dirección, Estook **copia los de Google en los del local**
  (`servidor/aplicacion/comandos/google.ts:111-118`). Es lo que habría pasado en IKATZ si su teléfono hubiera
  estado vacío. Y la posición: M3.
- **Stripe y Verifacti:** los avisos solo valen con su firma (`despachador.ts:605-672`), cada uno una vez; no
  pisan nada del local.
- **Fogón:** propone y una persona confirma; lo que lee de un contrato o una nómina es un dato, no una orden.
- **La web de reservas:** el cliente solo crea su reserva; **el nombre del cliente del local lo pone su última
  reserva** (`0135`, `el_cliente_de_la_reserva`), así que quien reserve con el teléfono de otro cambia el nombre de
  esa ficha y, al sentarle, la mesa recibe las alergias guardadas de la otra persona (leve, 7.5).

### M3 · Medio · La posición de IKATZ para fichar es la de Google — **leído en producción**

IKATZ tiene `posicion_de = 'google'`, y su ficha de Google está unida a un Burger King. Si están en sitios
distintos, **los fichajes de IKATZ se miden contra la posición del Burger King** («fichó lejos del local»). No sé
la distancia entre los dos: eso lo ve Richi. **Arreglo:** Richi pone la posición a mano en Ajustes (un minuto), y
en el código, conectar Google ya no copia teléfono, dirección ni posición si no se pulsa «Usar lo de Google».

---

## 6 · Fugas de datos y RGPD

- **Sentry:** sin datos de la petición ni de la persona, y con correos, DNI, teléfonos, IBAN, IP y claves quitados
  (`servidor/infraestructura/sentry.ts`, `fallos.ts:89-119`). Bien.
- **La web pública** enseña lo justo: la carta, las horas libres (nunca quién reservó) y, con el teléfono, el nombre
  de pila, el día, la hora y cuántos. «Pide tu factura» va por un código de 60 bits: no se adivina.
- **El navegador:** la sesión vive en el almacenamiento del navegador (normal en una app así, con la política de
  seguridad cerrando scripts de fuera); el TPV guarda las mesas para seguir sin internet, en el aparato del local.
- **Los avisos al móvil** no llevan alergias ni datos de clientes.

### M5 · Medio · El sí del cliente a guardar sus alergias no queda guardado — **leído en el código**

`cliente_del_local` (`0135_los_clientes_y_la_espera.sql:19-35`) guarda las alergias «solo con su sí», pero no
**cuándo ni quién** lo preguntó. El RGPD (art. 7.1) pide **poder demostrar** ese sí, y son datos de salud
(art. 9). **Arreglo:** dos columnas, cuándo y quién, que se rellenan al marcar la casilla y se borran al quitar las
alergias.

### 6.1 · Leve · Los registros de Supabase guardan el error tal cual

`servidor/infraestructura/fallos.ts:63-70` escribe en el registro el mensaje del error **sin limpiar** (lo limpio
va solo a Sentry). Un choque de Postgres puede dejar ahí un correo («Key (correo)=(…)»). **Arreglo:** pasarlo por
`sinDatosPersonales` también ahí.

### 6.2 · Lo que pide la ley y aún no hay (ya sabido)

**Nada se borra solo** ni hay exportación completa (ESTADO, M27). Con las reservas, Estook guarda ahora teléfonos
de clientes del local que no han dado nada más; y con la ficha, DNI y nóminas. Ver la mejora 12.4.

---

## 7 · Seguridad

### M1 · Medio · Los topes «por dirección» se saltan inventando una cabecera — **leído en el código; sin probar contra Supabase**

- **Dónde:** `servidor/api/cabeceras.ts:85-91` toma **la primera** dirección con buena forma de
  `X-Forwarded-For`, y esa la escribe quien llama (ya lo apuntó la auditoría del 20-oct y se dejó así).
- **Qué pasa:** cambiando esa cabecera en cada petición, no hay tope para: **vincular un aparato con su código**
  (6 cifras, 10 minutos, 20 por hora y dirección: `comandos/aparatos.ts:1018-1033`), la web de reservas, crear
  cuenta y recuperar el acceso (este tiene además tope por persona, que sí vale). Lo peor: quien acertara un
  código vivo tendría **una caja vinculada en un local ajeno**, y una caja de centro recibe las huellas de los PIN
  del local (`los_pin_del_centro`). Acertar es difícil (un millón de códigos y diez minutos), no imposible.
- **Arreglo:** leer la dirección que pone el proxy de Supabase (la última, no la primera; se comprueba en
  producción con una petición propia) y, sobre todo, **un tope de toda Estook** para los códigos de vincular que
  fallan (por ejemplo, 300 fallos en 10 minutos paran los intentos 10 minutos), que no depende de la dirección.

### M4 · Medio · Dependencias con avisos — **comprobado con `pnpm audit`**

- **`pdfjs-dist` 5.7 (alto):** un PDF preparado puede ejecutar código al abrirlo. La app abre en el navegador
  la carta en PDF, los contratos y las nóminas. La política de seguridad (sin `eval`) lo frena en gran parte.
  **Subir a 6.2.108 o más.**
- **`hono` 4.13.5 (siete medios, en el servidor):** subir a 4.13.16.
- **`react-router` 6 (dos medios), `zod` dentro del SDK de Anthropic (alto, memoria):** subir cuando se toque.

### M6 · Medio · Sin copia de seguridad, y ya hay nóminas y contratos

Sigue sin haber ninguna copia (0065, aplazada a la mudanza). Desde la Ampliación 3, la base guarda **contratos,
nóminas y DNI** de personas, y las reservas de los clientes. Perderlos ya no es perder una prueba. La copia
semanal está escrita y **no cuesta nada**. Es de Richi decidir (apartado 15).

### 7.1 · Lo que está bien

Las cinco puertas del despachador en un solo sitio; la sesión del admin con doble factor y nivel mirados en
cada petición; las contraseñas y PIN con PBKDF2 de 210.000 vueltas; la caja que se bloquea; los códigos de «Pide tu
factura» imposibles de adivinar; las funciones con privilegio en una lista cerrada que vigila una prueba
(`almacen.prueba.ts`) y que solo puede ejecutar la API; la política de seguridad del navegador sin scripts de
fuera.

### 7.2 · Leve · Respuestas que mienten

`exigir_doble_factor` contesta «lo cambió otra persona» cuando lo que pasa es que no puede
(`comandos/ajustes-de-organizacion.ts:48-55`); `poner_en_la_carta` contesta «hecho» con un plato que no es del local
(`comandos/menus.ts:782-808`). **Arreglo:** «sin permiso» y «no está en tu carta».

### 7.3 · Leve · La política del navegador deja conectar con cualquier web

`connect-src` lleva `https:` entero (`herramientas/politica-de-seguridad.ts`). Mejor solo la API y Supabase. Y sin
`frame-ancestors`, que GitHub Pages no deja poner: llega con la mudanza a Cloudflare.

### 7.4 · Leve · Dos membresías esquivan un recorte

Si alguien tiene dos puestos que cubren el mismo local, el nivel es el mayor de los dos
(`0018_identidad_y_acceso.sql`, `nivel_de_permiso`), y un recorte en uno no vale. Raro hoy.

### 7.5 · Leve · Reservar con el teléfono de otro

Ver apartado 5. Con el teléfono basta para ver y cancelar (decisión de Richi, 26-nov); con M1, sin tope. Si el
local avisa por correo, al dueño de la reserva le llega que se ha cancelado.

### 7.6 · Leve · «Por encima de» no mira si el puesto ha caducado

`servidor/aplicacion/la-ficha.ts:116-121` cuenta puestos con fecha de fin pasada. Se arregla con G1.

---

## 8 · Las cuentas, con números a mano

Todo el dinero va en **céntimos enteros**: `centimos()` lanza un error con cualquier decimal
(`packages/dominio/src/dinero.ts`). Comprobado:

| Caso                                                    | Cuenta a mano                              | Lo que da Estook        |
| ------------------------------------------------------- | ------------------------------------------ | ----------------------- |
| Ticket con IVA del 10 %: 16,50 €                        | 16,50 / 1,10 = 15,00 de base y 1,50 de IVA | base 1500, cuota 150 ✔  |
| Grupo del 21 %: 7,35 €                                  | 7,35 / 1,21 = 6,0743… → 6,07 y 1,28        | base 607, cuota 128 ✔   |
| Propinas: 10,00 € entre 3                               | 3,34 + 3,33 + 3,33                         | 334, 333, 333 ✔         |
| Cobro a partes: 10,00 € en 3, y la última, lo que quede | 3,34 + 3,33 + 3,33 = 10,00                 | 334, 333, 333 ✔         |
| Vacaciones: 30 al año, entra el 1-jul                   | 30 × 184 / 365 = 15,12                     | 15,12 ✔                 |
| Desglose: base + IVA = lo que paga el cliente, siempre  | el IVA se saca restando                    | sin un céntimo de más ✔ |

### 8.1 · Leve · El redondeo de las devoluciones no es simétrico — **comprobado con números**

`entreFactor` y `porFraccion` (`dinero.ts:70` y `:153`) redondean con `Math.round`, que lleva las mitades hacia
arriba también en negativo. Un artículo de **0,13 € al 4 %**: el ticket dice IVA 0,00 y su devolución dice
**−0,01**. Solo pasa con importes pequeños al 4 % o al 5 %. **Arreglo:** redondear la mitad hacia fuera en los dos
signos, y una prueba con ese caso.

### 8.2 · Leve · El gasto medio del cliente no resta lo devuelto

`servidor/aplicacion/clientes-del-local.ts:117-128` suma el precio de las líneas de sus mesas cobradas, sin
restar devoluciones. Con los descuentos (R3 · 2 · 2), tampoco los restará. **Arreglo:** contar lo cobrado de
verdad (el cobro), no las líneas.

**Lo demás de dinero**, mirado y sin hallazgos: el food cost y los escandallos en milésimas de céntimo
(`coste.ts`), lo vendido que baja del almacén (vigilado por el reloj en producción: 0 pendientes), la Z y los
cierres (la prueba de la caja), el coste de Fogón por local (topes de la 0097). **No he rehecho a mano** los
informes, las nóminas que lee Fogón (no hay cuentas: se guarda lo que dice la nómina) ni la desviación.

---

## 9 · Lo que funciona mal o es mejorable

- **El comandero siempre pide haber fichado** para entrar (0115, decidido así), pero Roles 1.12 dice «el local
  puede pedirlo, apagado de fábrica». Es el documento el que está mal: se corrige (D2).
- **Cuatro funciones para repartir a partes iguales**: `repartir` y `repartirEnPartesIguales` (todo el resto al
  primero, y **no las usa nadie** fuera de su prueba, `dinero.ts:86-115`), `repartirAPartesIguales` (las propinas,
  `caja.ts:104`) y `lasPartesIguales` (el cobro a partes, `caja.ts:190-201`), estas dos **iguales** por dentro. Con
  10,01 € entre 3, la primera da 3,35 · 3,33 · 3,33 y las otras, 3,34 · 3,34 · 3,33. **Arreglo:** una sola.
- **No he probado pantallas en este repaso** (ni lentitud ni cargas eternas): se apunta para la prueba de Richi y
  las de pantalla de cada arreglo.

---

## 10 · Las pruebas (punto 8 de Richi)

### M2 · Medio · La prueba que ataca toda la API no ve el TPV, los ficheros ni la cadena — **comprobado en el código**

`base-de-datos/pruebas/nadie-toca-lo-de-otro-negocio.prueba.ts`:

1. **Ataca solo con la sesión de una persona**: las **103 operaciones solo del TPV** contestan «sin permiso» y no
   se prueban con un aparato; y la víctima no tiene ni una mesa cobrada ni una reserva, porque el generador no sabe
   hacer un servicio.
2. **Corre sin almacén de ficheros**: las subidas de fotos, el logo, los contratos y las nóminas fallan antes de
   mirar de quién son.
3. **No prueba dos locales de la misma cadena**, ni lo que hace la organización entera (de ahí G2 y G3).
4. **La segunda parte, «cada rol ve solo sus cifras», no comprueba nada**: escribe lo que ve y no falla nunca
   (no tiene `expect`), y no mira el DNI, las nóminas ni las alergias.
5. **No mira la ficha hacia arriba** (de ahí G1).

Las sondas de esta auditoría hicieron 1, 2 y 3 sin hallazgos de datos cruzados, salvo los platos pedidos, las
reservas con mesa y los cobros, que no llegaron a montar. **Arreglo:** que la prueba haga lo
mismo para siempre: aparatos vinculados en los dos lados, un servicio de verdad en la víctima (caja, mesas,
reservas, espera), almacén en memoria, un segundo barrido entre dos locales de Grupo Costa, y la parte de los roles
con su `expect`, también para DNI, sueldo, nóminas y alergias.

### 10.1 · Lo que no está probado y debería

- La ficha, las nóminas y los documentos vistos por cada rol, hacia arriba y entre iguales (G1).
- Lo de la organización entera con cada rol de local y de área (G2, G3).
- Los cobros, tickets y devoluciones atacados desde otra empresa con un aparato (necesita el Verifacti de mentira
  en el barrido).
- El redondeo de las devoluciones al 4 % (8.1).

---

## 11 · Los documentos (punto 9 de Richi)

- **D1 · ESTADO** dice cosas que ya no son verdad: «producción leída el 22-nov» (sección 1), «3.081 pruebas con la
  #188» (sección 1), «fusionar la 5 · 3, migrar y desplegar» (sección 2, ya hecho), «cinco organizaciones reales»
  (hay dos cuentas más). Lo que dice de producción se pone al día con esta auditoría; lo demás, en la parte 5.
- **D2 · Roles:** 1.11 y 1.13 dicen «por construir» de los recordatorios, las notas, las vacaciones y la ficha, que
  ya están; 1.12 dice que fichar antes de entrar viene apagado (el comandero lo pide siempre); 2.2 dice que el area
  manager hace «todo lo de un gerente» y la tabla 1.12 no le deja anular ni corregir; y la cabecera dice
  «versión 1.4, septiembre».
- **D3 · Auditoría de flujos:** su último apartado dice «por construir» de cuatro cosas hechas.
- **D4 · El Plan, M13, M14 y M32:** cada ficha arrastra la historia de lo que se pidió, se pulió y se construyó.
  Para que se lea en un minuto y nadie construya dos veces lo mismo, **cada ficha en tres partes**: **Hecho** (dos o
  tres líneas, con el enlace a su decisión), **Falta** (la lista exacta) y **Reglas**. La historia ya vive en las
  decisiones y en `historia-de-los-modulos.md`. El mapa (fila de M13) se pone igual.
- **D5 · Las auditorías:** la tabla decía «Auditoría 3, después de M13 a M16b, sobre los datos de los
  empleados». Esta es la 3, y de todo; lo de los empleados de M15 y M16b irá en la 4 (antes de vender).

---

## 12 · Mejoras y cosas que añadiría (punto 10 de Richi, para decidir)

1. **Un solo «quién manda más que quién».** Hoy hay cuatro: en la base (`a_quien_lleva`), en la ficha
   (`laAmplitud`), al invitar (`jerarquia.ts`) y al poner el sueldo (`comandos/equipo.ts`). G1 y G3 salieron de que
   no dicen lo mismo. Una sola función en la base, que usen todos.
2. **Quién ha abierto el DNI o una nómina, apuntado.** Cada vez que alguien abre un documento de otra persona,
   queda en la auditoría; la persona puede verlo en Mi ficha. Es lo que hacen las aplicaciones de personal.
3. **El doble factor, obligatorio para quien ve datos del equipo** (gerente, dirección, RRHH), ahora que ven DNI y
   nóminas. Hoy es opcional salvo que la empresa lo exija.
4. **Borrar solo lo de los clientes que no vuelven**: las reservas sin nombre ni teléfono a los dos años, y la ficha
   del cliente que no viene en dos años. Es lo mínimo que pide el RGPD y no espera a M27.
5. **La copia de seguridad semanal, encendida ya** (M6).
6. **Conectar Google no copia nada en lo del local** sin un botón «Usar lo de Google» (M3).
7. **Una sola forma de repartir** (apartado 9).
8. **La posición del local, con su origen a la vista** en Ajustes («la puso Google» / «la pusiste tú»), para que no
   vuelva a pasar lo de IKATZ sin que se vea.
9. **Las fichas del Plan en tres partes** (D4).
10. **Una prueba de «quién ve qué» generada de la tabla de Roles**: hoy Roles y la matriz de la base se comparan a
    mano; una prueba que lea la tabla 1.12 y la de la ficha y las compare con la base, como ya se hace con las apps
    (B5).

---

## 13 · Lo que no he podido confirmar

- **Cómo llega `X-Forwarded-For` a la API en Supabase** (M1): el comentario del código dice que el proxy añade la
  dirección de verdad detrás; no lo he probado contra producción. Se comprueba al arreglarlo.
- **La distancia entre IKATZ y el Burger King** (M3).
- **El tope de tamaño de una petición en Supabase**: la API no pone uno propio.
- **Las pantallas**: no las he abierto en esta auditoría.
- **Los informes y la desviación**, con números a mano.

## 14 · Cómo se arregla, por partes

| Parte                       | Qué                                                                             | Migración |
| --------------------------- | ------------------------------------------------------------------------------- | --------- |
| **1 · Lo grave**            | G1, G2, G3, con 7.6 y el mensaje del doble factor (7.2), y sus pruebas          | Sí        |
| **2 · La prueba que ataca** | M2 y 10.1: aparatos, servicio, ficheros, entre locales y los roles con `expect` | No        |
| **3 · Lo medio**            | M1, M5, M3 (Google no copia), 6.1, 8.1, 8.2, `poner_en_la_carta` (7.2) y 9      | Sí        |
| **4 · Dependencias**        | M4                                                                              | No        |
| **5 · Los documentos**      | D1 a D5                                                                         | No        |

Cada parte en su rama y su pull request, con su prueba vista fallar sin el arreglo.

## 15 · Lo que decide Richi

1. **La copia de seguridad semanal**: ¿se enciende ya, o sigue esperando a la mudanza? (M6). Recomiendo encenderla
   ya: hay nóminas, contratos y DNI, y no cuesta nada.
2. **Las mejoras del apartado 12** que quieras meter. Recomiendo la 1 (va con lo grave), la 2 (quién abre un DNI o
   una nómina), la 4 (borrar lo de los clientes que no vuelven) y la 6 (Google no copia nada). La 3 (doble factor
   obligatorio para quien ve datos del equipo) cambia cómo entran gerentes y dirección: solo si la quieres.
3. **Las fichas del Plan en tres partes** (Hecho, Falta, Reglas): cambia la forma del maestro, no lo que dice.

**Y un paso tuyo, sin decidir nada:** en Estook, Ajustes › el local, poner a mano dónde está IKATZ (M3).
