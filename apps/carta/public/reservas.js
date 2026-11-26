/*
 * Estook · las reservas de un local, dentro de su propia web (la Ampliación 5 · 2, decisión 0153).
 *
 * El local copia en su web el código de Estook › Servicio › Reservas › «¿Tienes web propia?»:
 *
 *   <div data-estook-reservas="ikatz" data-color="#c2410c" data-forma="dentro"></div>
 *   <script src="https://estook.com/carta/reservas.js" async></script>
 *
 * · data-forma="dentro": las reservas en ese hueco de su página, que crece solo con lo que ocupan.
 * · data-forma="boton":  un botón «Reservar mesa» de su color; al tocarlo, las reservas se abren encima.
 *
 * Sin cookies y sin guardar nada: es la misma página de estook.com/reservar/<local>, metida en un marco.
 * Escrito a mano, sin dependencias, para que funcione en cualquier web (Wix, WordPress, Squarespace…).
 */
(function () {
  'use strict';

  var guion = document.currentScript;
  var origen = guion && guion.src ? new URL(guion.src).origin : 'https://estook.com';
  var marcos = [];

  function colorBueno(color) {
    return /^#[0-9a-f]{6}$/i.test(color || '') ? color.toLowerCase() : null;
  }

  // El texto que va sobre su color, como `elTextoSobreElColor` del dominio.
  function textoSobre(color) {
    var luz = [1, 3, 5]
      .map(function (i) {
        var c = parseInt(color.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      })
      .reduce(function (suma, c, i) {
        return suma + c * [0.2126, 0.7152, 0.0722][i];
      }, 0);
    // Blanco siempre que se lea bien (4,5 a 1, la regla de la WCAG); oscuro sobre los colores claros.
    return 1.05 / (luz + 0.05) >= 4.5 ? '#ffffff' : '#1d2a2e';
  }

  function laDireccion(local, color) {
    var datos = 'incrustada=1' + (color ? '&color=' + color.slice(1) : '');
    return origen + '/reservar/' + encodeURIComponent(local) + '?' + datos;
  }

  function unMarco(local, color, alto) {
    var marco = document.createElement('iframe');
    marco.src = laDireccion(local, color);
    marco.title = 'Reservar mesa';
    marco.loading = 'lazy';
    marco.setAttribute('allow', 'clipboard-write');
    marco.style.cssText =
      'display:block;width:100%;border:0;background:transparent;height:' + alto + ';';
    marcos.push(marco);
    return marco;
  }

  function dentro(hueco, local, color) {
    hueco.innerHTML = '';
    hueco.appendChild(unMarco(local, color, '760px'));
  }

  function boton(hueco, local, color) {
    var fondo = color || '#5433c4';
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = hueco.getAttribute('data-texto') || 'Reservar mesa';
    b.style.cssText =
      'appearance:none;border:0;cursor:pointer;font:600 16px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;' +
      'padding:14px 22px;border-radius:12px;background:' +
      fondo +
      ';color:' +
      textoSobre(fondo) +
      ';box-shadow:0 6px 16px -8px rgba(0,0,0,.45);';
    b.addEventListener('click', function () {
      abrir(local, color);
    });
    hueco.innerHTML = '';
    hueco.appendChild(b);
  }

  function abrir(local, color) {
    var capa = document.createElement('div');
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-modal', 'true');
    capa.setAttribute('aria-label', 'Reservar mesa');
    capa.style.cssText =
      'position:fixed;inset:0;z-index:2147483000;background:rgba(15,20,25,.55);display:flex;' +
      'align-items:center;justify-content:center;padding:16px;';
    var caja = document.createElement('div');
    caja.style.cssText =
      'display:flex;flex-direction:column;width:100%;max-width:520px;height:min(860px,100%);' +
      'background:#f1efeb;border-radius:18px;overflow:hidden;box-shadow:0 24px 60px -20px rgba(0,0,0,.6);';
    // Una barra arriba con el título y la cruz, para que la cruz no tape nada.
    var barra = document.createElement('div');
    barra.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px 10px 20px;' +
      'background:' +
      (color || '#5433c4') +
      ';color:' +
      textoSobre(color || '#5433c4') +
      ';' +
      'font:700 17px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;';
    var titulo = document.createElement('span');
    titulo.textContent = 'Reservar mesa';
    var cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.setAttribute('aria-label', 'Cerrar');
    cerrar.textContent = '×';
    cerrar.style.cssText =
      'flex:none;width:40px;height:40px;border:0;border-radius:50%;background:rgba(255,255,255,.92);' +
      'font:400 26px/1 system-ui,sans-serif;cursor:pointer;color:#1d2a2e;';
    var marco = unMarco(local, color, '100%');
    // Ya está abierta: que cargue al momento, no cuando el navegador lo crea oportuno.
    marco.loading = 'eager';
    marco.style.flex = '1';
    marco.style.minHeight = '0';
    function fuera() {
      document.removeEventListener('keydown', alTeclear);
      marcos.splice(marcos.indexOf(marco), 1);
      capa.remove();
    }
    function alTeclear(e) {
      if (e.key === 'Escape') fuera();
    }
    cerrar.addEventListener('click', fuera);
    capa.addEventListener('click', function (e) {
      if (e.target === capa) fuera();
    });
    document.addEventListener('keydown', alTeclear);
    barra.appendChild(titulo);
    barra.appendChild(cerrar);
    caja.appendChild(barra);
    caja.appendChild(marco);
    capa.appendChild(caja);
    document.body.appendChild(capa);
    cerrar.focus();
  }

  // La página de reservas dice cuánto ocupa: el hueco «dentro» crece con ella (el del botón no).
  window.addEventListener('message', function (e) {
    if (e.origin !== origen || !e.data || e.data.estook !== 'reservas') return;
    var alto = Number(e.data.alto);
    if (!(alto > 0)) return;
    marcos.forEach(function (marco) {
      if (marco.contentWindow === e.source && marco.style.height !== '100%') {
        marco.style.height = Math.max(alto, 320) + 'px';
      }
    });
  });

  function montar() {
    var huecos = document.querySelectorAll('[data-estook-reservas]:not([data-estook-montado])');
    Array.prototype.forEach.call(huecos, function (hueco) {
      var local = (hueco.getAttribute('data-estook-reservas') || '').trim().toLowerCase();
      if (!/^[a-z0-9-]{1,80}$/.test(local)) return;
      hueco.setAttribute('data-estook-montado', '');
      var color = colorBueno(hueco.getAttribute('data-color'));
      if (hueco.getAttribute('data-forma') === 'boton') boton(hueco, local, color);
      else dentro(hueco, local, color);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
})();
