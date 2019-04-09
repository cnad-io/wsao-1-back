# Webinar - Starting with Apps in Openshift

## Backend

Conjunto de servicios que comunican el Front con la capa de datos. Consiste en 3 servicios:

- **User Management:** permite administrar usuarios y su historial. Servicio tipo REST.
- **Waiting Room:** permite gestionar el inicio de un Game Room, espera la llegada de un mínimo de jugadores para generar la sesión y dar inicio al juego. Servicio de tipo Websocket.
- **Game Room:** permite gestionar un Game Room, ya sea crearlo, mantener el estado, pausarlo y terminarlo. Servicio de tipo Websocket.
