# 0003 · M0 crea el esqueleto minimo de organizacion, area y local

**Fecha:** 31 de agosto de 2026
**Modulo:** M0
**Estado:** aceptada

## El problema

M0 pide «dos semillas: un local independiente y una cadena de seis locales en dos
areas», y su criterio de terminado dice «se clona, se ejecuta un comando y todo
arranca con las dos semillas».

Pero las tablas de organizaciones, areas y locales son M1. Sin ellas no hay donde
sembrar, y el criterio de M0 no se puede cumplir.

## La decision

La migracion `0001_cimientos.sql` crea **solo** los tres contenedores de alcance
que las semillas necesitan: `organizacion`, `area` y `local`, con sus claves, sus
restricciones de coherencia y RLS encendido sin ninguna politica.

## Que NO entra aqui, y es a proposito

Usuarios, membresias con alcance y vigencia, la funcion `locales_visibles`, los
doce roles, la herencia de permisos, las politicas RLS de verdad, la auditoria
append-only, el catalogo maestro, las traducciones y los dispositivos. Todo eso es
M1 y se construye alli.

## Por que RLS encendido y sin politicas

Es el fallo seguro. Con RLS activo y ninguna politica escrita, nadie que no sea la
clave de servicio lee nada. Si M1 se retrasara, lo peor que puede pasar es que no
se vea nada; no que se vea de mas.

## El cuarto alcance

El Manifiesto define cuatro niveles: organizacion, area, local y **persona**. M0
crea los tres primeros. La persona llega con M1, que es donde vive la
autenticacion, y no tiene sentido crearla antes.
