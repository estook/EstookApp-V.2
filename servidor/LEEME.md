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
