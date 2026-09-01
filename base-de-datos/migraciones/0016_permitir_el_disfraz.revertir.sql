-- Reversion de 0016 · Permitir el disfraz de estook_api

do $$
begin
  execute format('revoke estook_api from %I', current_user);
exception
  when others then
    null;
end
$$;
