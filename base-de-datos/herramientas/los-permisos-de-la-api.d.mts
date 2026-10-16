/** Los tipos de `los-permisos-de-la-api.mjs`, para que su prueba se compruebe entera. */
export declare function lasMigraciones(hasta?: number): string[];
export declare function loQueQuisieron(migraciones: readonly string[]): Map<string, Set<string>>;
export declare const LO_QUE_TIENE: string;
export declare function agrupar(
  filas: readonly { readonly tabla: string; readonly permiso: string }[],
): Map<string, Set<string>>;
export declare function enTexto(permisos: Set<string> | undefined): string;
export declare function loQueNoCuadra(
  quiso: Map<string, Set<string>>,
  tiene: Map<string, Set<string>>,
): string[];
