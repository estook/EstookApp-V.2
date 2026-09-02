# servidor

Las capas, y el unico sentido en el que se pueden importar:

```
api  ->  aplicacion  ->  dominio
             |
             v
      infraestructura   (implementa los puertos que declara aplicacion)
```

- `api` es transporte y validacion. Nada mas.
- `aplicacion` orquesta. Un fichero por comando y por consulta.
- `dominio` no importa nada de fuera. Ni red, ni Postgres, ni framework.
- `infraestructura` es la unica que sabe que por debajo hay Postgres.

No es una recomendacion: `.dependency-cruiser.cjs` lo comprueba y la integracion
continua bloquea la fusion si se incumple.

## Donde corre

Decision de M0, anotada en `docs/decisiones/0002-runtime-de-la-api.md`: la API se
escribe en Hono y se despliega como Supabase Edge Functions (Deno). Los trabajos
programados van por cola en tabla mas `pg_cron`, porque en Edge Functions no hay
proceso largo. El adaptador HTTP concreto se escribe en M2, no antes.

**M4 la despliega**, porque es quien trae a alguien a quien servir. El punto de
entrada esta en `supabase/functions/api/index.ts` y no hace nada: enchufa esta
misma API a `Deno.serve`. Se lanza desde Actions, con el flujo `Desplegar la API`.

## Quien pregunta (M4)

Desde M4, la API **no se cree lo que le digan**. Hasta entonces la identidad
llegaba en `x-persona-id`, que estaba bien mientras no hubiera login y era
exactamente lo que prohibe la regla 4. Ahora llega un token en
`Authorization: Bearer`, y la infraestructura lo resuelve contra `estook.sesion`
dentro de la transaccion, con el disfraz de `estook_api` ya puesto.

Las tres puertas —sin sesion, con el segundo factor pendiente, con una contrasena
que puso otra persona— las mira el **despachador**, una vez, por todas las
operaciones. Una operacion nueva nace protegida sin hacer nada; abrir una puerta
se declara en la propia operacion y se ve en el catalogo.
