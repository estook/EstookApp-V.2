-- Reversion de 0008 · Las politicas de seguridad

drop policy if exists politica_escritura on estook.politica_de_catalogo;
drop policy if exists politica_lectura on estook.politica_de_catalogo;
drop policy if exists dispositivo_escritura on estook.dispositivo;
drop policy if exists dispositivo_lectura on estook.dispositivo;
drop policy if exists traduccion_escritura on estook.traduccion;
drop policy if exists traduccion_lectura on estook.traduccion;
drop policy if exists auditoria_se_anade on estook.auditoria;
drop policy if exists auditoria_lectura on estook.auditoria;
drop policy if exists recorte_escritura on estook.recorte_de_permiso;
drop policy if exists recorte_lectura on estook.recorte_de_permiso;
drop policy if exists membresia_escritura on estook.membresia;
drop policy if exists membresia_lectura on estook.membresia;
drop policy if exists persona_se_edita_a_si_misma on estook.persona;
drop policy if exists persona_lectura on estook.persona;
drop policy if exists local_escritura on estook.local;
drop policy if exists local_lectura on estook.local;
drop policy if exists area_escritura on estook.area;
drop policy if exists area_lectura on estook.area;
drop policy if exists organizacion_escritura on estook.organizacion;
drop policy if exists organizacion_lectura on estook.organizacion;
drop policy if exists permiso_de_rol_lectura on estook.permiso_de_rol;
drop policy if exists permiso_lectura on estook.permiso;
drop policy if exists rol_lectura on estook.rol;

alter table estook.permiso_de_rol        disable row level security;
alter table estook.permiso               disable row level security;
alter table estook.rol                   disable row level security;
alter table estook.politica_de_catalogo  disable row level security;
alter table estook.dispositivo           disable row level security;
alter table estook.traduccion            disable row level security;
alter table estook.auditoria             disable row level security;
alter table estook.recorte_de_permiso    disable row level security;
alter table estook.membresia             disable row level security;
alter table estook.persona               disable row level security;
