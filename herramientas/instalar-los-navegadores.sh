#!/usr/bin/env bash
# Instala Chromium y WebKit con sus paquetes de Ubuntu, en las máquinas de GitHub
# (la auditoría del 27-oct; lecciones 226, 231 y 232). Lo usan `integracion.yml`, antes
# de las pruebas de pantalla, y `navegadores.yml`, que los deja guardados desde `main`.
#
#   · Los paquetes de una vuelta anterior (la caché, en ~/paquetes-de-los-navegadores)
#     se ponen donde apt los busca: así no se le piden al servidor de Ubuntu, que a veces
#     los da a cuentagotas (el 26-oct, de 0,18 a 28 MB/s según la máquina).
#   · Lo lento pero vivo se espera; apt solo deja una conexión muerta (20 s sin recibir).
#   · Si apt falla de verdad, un segundo intento, y antes se corta lo que quede de él
#     con el candado de dpkg cogido.
#   · Al acabar bien, los paquetes quedan en ~/paquetes-de-los-navegadores para guardarlos.
set -u

printf '%s\n' 'APT::Keep-Downloaded-Packages "true";' \
  'Binary::apt::APT::Keep-Downloaded-Packages "true";' \
  'Acquire::http::Timeout "20";' 'Acquire::https::Timeout "20";' \
  'Acquire::Retries "5";' | sudo tee /etc/apt/apt.conf.d/99-estook > /dev/null
sudo rm -f /etc/apt/apt.conf.d/docker-clean

if ls ~/paquetes-de-los-navegadores/*.deb > /dev/null 2>&1; then
  sudo cp ~/paquetes-de-los-navegadores/*.deb /var/cache/apt/archives/
  echo "Paquetes de una vuelta anterior: $(ls ~/paquetes-de-los-navegadores/*.deb | wc -l)"
else
  echo "Sin paquetes de una vuelta anterior: se bajan del servidor de Ubuntu."
fi

for intento in 1 2; do
  if pnpm exec playwright install --with-deps chromium webkit; then
    mkdir -p ~/paquetes-de-los-navegadores
    cp /var/cache/apt/archives/*.deb ~/paquetes-de-los-navegadores/ 2> /dev/null || true
    exit 0
  fi
  echo "::warning::Instalar los navegadores ha fallado (intento $intento de 2)."
  sudo pkill -9 -x apt-get || true
  sudo pkill -9 -x dpkg || true
  for _ in $(seq 1 30); do
    sudo fuser /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock > /dev/null 2>&1 || break
    sleep 2
  done
  sudo dpkg --configure -a || true
done
exit 1
