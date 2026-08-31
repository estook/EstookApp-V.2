import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * M1 · los doce roles, la herencia y el recorte local a local.
 *
 * Cada prueba cita la frase del documento de Roles que la justifica, para que
 * cambiar un nivel obligue a discutir con el documento delante.
 */
let base: BaseDePrueba;

beforeAll(async () => {
  base = await levantarBase();
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

async function nivel(correo: string, codigoLocal: string, permiso: string): Promise<string> {
  const persona = await base.personaPorCorreo(correo);
  const local = await base.localPorCodigo(codigoLocal);
  const { rows } = await base.bd.query<{ nivel: string }>(
    'select estook.nivel_de_permiso($1, $2, $3) as nivel',
    [persona, local, permiso],
  );
  return rows[0]?.nivel ?? 'sin_respuesta';
}

async function nivelDelRol(rol: string, permiso: string): Promise<string> {
  const { rows } = await base.bd.query<{ nivel: string }>(
    'select nivel from estook.permiso_de_rol where rol = $1 and permiso = $2',
    [rol, permiso],
  );
  return rows[0]?.nivel ?? 'sin_acceso';
}

describe('lo que trae puesto cada rol', () => {
  it('el cocinero no ve ningun importe', async () => {
    // «Que no ve: ningun importe. Ni coste de linea, ni coste total, ni margen,
    //  ni precio recomendado. Esa columna no existe para el.»
    expect(await nivel('marcos@ejemplo.estook.com', 'bar-centro', 'dato.coste_de_genero')).toBe(
      'sin_acceso',
    );
    expect(await nivelDelRol('cocinero', 'dato.coste_de_personal')).toBe('sin_acceso');
    expect(await nivelDelRol('cocinero', 'dato.ventas')).toBe('sin_acceso');
  });

  it('el camarero no ve costes, ni ventas, ni el cuadrante completo, ni datos de otros', async () => {
    // «Que no ve, en ningun sitio: costes, margenes, precios de compra, ventas
    //  del local, datos de otras personas ni el cuadrante completo.»
    for (const permiso of [
      'dato.coste_de_genero',
      'dato.coste_de_personal',
      'dato.ventas',
      'dato.datos_del_equipo',
      'dato.cuadrante_completo',
    ]) {
      expect(await nivel('sara@ejemplo.estook.com', 'bar-centro', permiso), permiso).toBe(
        'sin_acceso',
      );
    }
  });

  it('el camarero si puede fichar, apuntar una merma y marcar un agotado', async () => {
    for (const permiso of ['accion.fichar', 'accion.registrar_merma', 'accion.marcar_agotado']) {
      expect(await nivel('sara@ejemplo.estook.com', 'bar-centro', permiso), permiso).toBe(
        'ver_y_editar',
      );
    }
  });

  it('el jefe de sala ve las ventas de su turno pero no los costes de genero', async () => {
    // «Las ventas del turno con su ticket medio.» / «No ve costes de materia prima.»
    expect(await nivelDelRol('jefe_de_sala', 'dato.ventas')).toBe('ver');
    expect(await nivelDelRol('jefe_de_sala', 'dato.coste_de_genero')).toBe('sin_acceso');
  });

  it('el jefe de sala puede proponer cambios en la carta pero no publicarlos', async () => {
    // «Proponer cambios en la carta sin publicarlos.»
    expect(await nivelDelRol('jefe_de_sala', 'app.carta')).toBe('ver_y_editar');
    expect(await nivelDelRol('jefe_de_sala', 'accion.publicar_carta')).toBe('sin_acceso');
  });

  it('el jefe de cocina manda en el genero pero no ve el negocio ni la facturacion', async () => {
    // «No ve: el margen global del negocio, el coste de personal de sala, la
    //  facturacion ni la parte de plan y facturacion de Ajustes.»
    expect(await nivelDelRol('jefe_de_cocina', 'app.inventario')).toBe('ver_y_editar');
    expect(await nivelDelRol('jefe_de_cocina', 'app.escandallos')).toBe('ver_y_editar');
    expect(await nivelDelRol('jefe_de_cocina', 'dato.coste_de_genero')).toBe('ver_y_editar');
    expect(await nivelDelRol('jefe_de_cocina', 'app.negocio')).toBe('sin_acceso');
    expect(await nivelDelRol('jefe_de_cocina', 'dato.facturacion')).toBe('sin_acceso');
    expect(await nivelDelRol('jefe_de_cocina', 'dato.coste_de_personal')).toBe('sin_acceso');
  });

  it('el gerente lo tiene todo en su local', async () => {
    // «Todo lo de su local.»
    for (const permiso of [
      'app.panel',
      'app.inventario',
      'app.escandallos',
      'app.negocio',
      'dato.coste_de_genero',
      'dato.coste_de_personal',
      'dato.ventas',
      'accion.conectar_tpv',
      'accion.poner_objetivos',
      'accion.invitar_personas',
    ]) {
      expect(await nivel('rosa@ejemplo.estook.com', 'bar-centro', permiso), permiso).toBe(
        'ver_y_editar',
      );
    }
  });

  it('el area manager hace lo del gerente pero sin facturacion ni crear locales', async () => {
    // «Sin tocar facturacion ni crear locales.»
    expect(await nivel('ignacio@ejemplo.estook.com', 'bar-puerto', 'app.negocio')).toBe(
      'ver_y_editar',
    );
    expect(await nivelDelRol('area_manager', 'dato.facturacion')).toBe('sin_acceso');
    expect(await nivelDelRol('area_manager', 'accion.gestionar_locales')).toBe('sin_acceso');
  });

  it('compras central no puede cerrar recuentos', async () => {
    // Decision 5 de la Auditoria de flujos: quien compra no valora su inventario.
    expect(await nivelDelRol('compras_central', 'app.inventario')).toBe('ver_y_editar');
    expect(await nivelDelRol('compras_central', 'accion.cerrar_recuento')).toBe('sin_acceso');
  });

  it('compras central no toca recetas y el chef corporativo no toca personal', async () => {
    // «Nada de recetas ni de personal» / «Nada de personal ni de facturacion.»
    expect(await nivelDelRol('compras_central', 'app.escandallos')).toBe('sin_acceso');
    expect(await nivelDelRol('chef_corporativo', 'app.equipo')).toBe('sin_acceso');
    expect(await nivelDelRol('chef_corporativo', 'dato.coste_de_personal')).toBe('sin_acceso');
    expect(await nivelDelRol('chef_corporativo', 'dato.facturacion')).toBe('sin_acceso');
  });

  it('RRHH ve costes de personal pero no materia prima ni margenes', async () => {
    // «Con costes de personal. Sin acceso a materia prima ni a margenes.»
    expect(await nivelDelRol('rrhh', 'dato.coste_de_personal')).toBe('ver_y_editar');
    expect(await nivelDelRol('rrhh', 'dato.coste_de_genero')).toBe('sin_acceso');
    expect(await nivelDelRol('rrhh', 'app.negocio')).toBe('sin_acceso');
  });

  it('la gestoria no ve fichas tecnicas ni recetas, y no tiene rueda de apps', async () => {
    // «No ve fichas tecnicas, ni recetas, ni el chat.»
    expect(await nivelDelRol('gestoria', 'app.gestoria')).toBe('ver');
    expect(await nivelDelRol('gestoria', 'app.escandallos')).toBe('sin_acceso');
    expect(await nivelDelRol('gestoria', 'app.carta')).toBe('sin_acceso');
    expect(await nivelDelRol('gestoria', 'app.panel')).toBe('sin_acceso');
    expect(await nivelDelRol('gestoria', 'accion.exportar_contabilidad')).toBe('ver_y_editar');
  });

  it('nadie, ni la direccion, ve los directos ajenos del chat', async () => {
    // «El gerente ve todos los canales del local, nunca los directos entre dos.»
    const { rows } = await base.bd.query(
      `select rol from estook.permiso_de_rol where permiso = 'dato.chat_directos'`,
    );
    expect(rows).toEqual([]);
  });

  it('la direccion lo tiene todo lo demas', async () => {
    const { rows } = await base.bd.query<{ cuantos: number }>(
      `select count(*)::int as cuantos
         from estook.permiso p
        where p.codigo <> 'dato.chat_directos'
          and not exists (
            select 1 from estook.permiso_de_rol pr
             where pr.rol = 'direccion' and pr.permiso = p.codigo
               and pr.nivel = 'ver_y_editar'
          )`,
    );
    expect(rows[0]?.cuantos).toBe(0);
  });
});

describe('el recorte local a local', () => {
  it('quita un permiso que el rol si traia', async () => {
    // La semilla recorta `accion.cerrar_recuento` al jefe de cocina del Bar Puerto.
    expect(await nivelDelRol('jefe_de_cocina', 'accion.cerrar_recuento')).toBe('ver_y_editar');
    expect(await nivel('luis@ejemplo.estook.com', 'bar-puerto', 'accion.cerrar_recuento')).toBe(
      'sin_acceso',
    );
  });

  it('tambien puede dar un permiso que el rol no traia', async () => {
    // «Sin acceso a la operacion diaria, salvo que se le de expresamente.»
    const marcos = await base.personaPorCorreo('marcos@ejemplo.estook.com');
    const local = await base.localPorCodigo('bar-centro');
    expect(await nivel('marcos@ejemplo.estook.com', 'bar-centro', 'dato.ventas')).toBe(
      'sin_acceso',
    );

    await base.bd.exec(`
      insert into estook.recorte_de_permiso (membresia_id, local_id, permiso, nivel, motivo)
      select m.id, '${local}', 'dato.ventas', 'ver', 'Prueba'
      from estook.membresia m where m.persona_id = '${marcos}'
    `);
    expect(await nivel('marcos@ejemplo.estook.com', 'bar-centro', 'dato.ventas')).toBe('ver');

    await base.bd.exec(
      `delete from estook.recorte_de_permiso where permiso = 'dato.ventas' and motivo = 'Prueba'`,
    );
  });

  it('un permiso sobre lo tuyo no se recorta', async () => {
    const sara = await base.personaPorCorreo('sara@ejemplo.estook.com');
    const local = await base.localPorCodigo('bar-centro');
    await expect(
      base.bd.exec(`
        insert into estook.recorte_de_permiso (membresia_id, local_id, permiso, nivel)
        select m.id, '${local}', 'accion.fichar', 'sin_acceso'
        from estook.membresia m where m.persona_id = '${sara}'
      `),
    ).rejects.toThrow(/es sobre lo tuyo/i);
  });
});

describe('dos roles sobre el mismo local', () => {
  it('gana el mas amplio, permiso a permiso', async () => {
    // «Si alguien tiene dos roles sobre el mismo local, gana el mas amplio.»
    const sara = await base.personaPorCorreo('sara@ejemplo.estook.com');
    expect(await nivel('sara@ejemplo.estook.com', 'bar-centro', 'app.inventario')).toBe(
      'sin_acceso',
    );

    await base.bd.exec(`
      insert into estook.membresia (persona_id, organizacion_id, local_id, alcance, rol)
      select '${sara}', o.id, l.id, 'local', 'jefe_de_cocina'
      from estook.organizacion o
      join estook.local l on l.organizacion_id = o.id and l.codigo = 'bar-centro'
      where o.codigo = 'bar-centro'
    `);

    // Ahora suma lo del jefe de cocina sin perder lo que ya tenia de camarera.
    expect(await nivel('sara@ejemplo.estook.com', 'bar-centro', 'app.inventario')).toBe(
      'ver_y_editar',
    );
    expect(await nivel('sara@ejemplo.estook.com', 'bar-centro', 'dato.coste_de_genero')).toBe(
      'ver_y_editar',
    );
    expect(await nivel('sara@ejemplo.estook.com', 'bar-centro', 'app.cuaderno')).toBe(
      'ver_y_editar',
    );

    await base.bd.exec(
      `delete from estook.membresia where persona_id = '${sara}' and rol = 'jefe_de_cocina'`,
    );
  });
});
