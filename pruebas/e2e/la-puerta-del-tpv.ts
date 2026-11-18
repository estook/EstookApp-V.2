/**
 * **La puerta de Estook TPV** (el rediseño, 0148): la caja y el comandero compartido enseñan
 * botones (Entrar, Tickets, la caja) y el teclado sale al tocar uno, o al teclear en el PC; el
 * móvil de un camarero, que es suyo, sigue con el teclado a la vista. Esto reconoce la puerta en
 * los dos casos, para esperar a que esté antes de teclear el PIN.
 */
export const LA_PUERTA = /^(Teclea tu PIN|Entrar)$/;
