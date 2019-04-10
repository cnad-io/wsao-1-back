# Webinar - Starting with Apps in Openshift

## Backend

Conjunto de servicios que comunican el Front con la capa de datos. Consiste en 3 servicios:

- **User Management:** permite administrar usuarios y su historial. Servicio tipo REST.
- **Waiting Room:** permite gestionar el inicio de un Game Room, espera la llegada de un mínimo de jugadores para generar la sesión y dar inicio al juego. Servicio de tipo Websocket.
- **Game Room:** permite gestionar un Game Room, ya sea crearlo, mantener el estado, pausarlo y terminarlo. Servicio de tipo Websocket.



## I/O
### user-management

##### Register
Input:

{
  (String)method,
  (String)nickname,
  (Number)client_version
}

Output:
{
  (String)token,
  (String)state
}

##### Validate
Input:

{
  (String)method,
  (String)token,
  (Number)client_version
}

Output:
{
  (String)nickname,
  (String)state
}


### Waiting-room:

##### Join
Input:
{
  (String)method,
  (String)token,
  (Number)client_version
}

Output:
{
  (String)state 
}

##### Game Room Assign
Output:
{
  (String)state,
  (String)game_room_token
}

### Game-room:

##### Join
Input:
{
  (String)method,
  (String)token,
  (String)game_room_token,
  (Number)client_version
}

Output:
{
  (String)state
}

##### Stage
Output:
{
  (String)method,
  (Number)timestamp,
  players:[
    {
      (String) nickname,
      (Number) pos_x,
      (Number) pos_y,
      (String) Shape      
    }
    ]

}

##### KeyStroke

Input:
{
  (String)method,
  (String)token,
  (String)game_room_token,
  (String)keycode,
  (Number)client_version
}
