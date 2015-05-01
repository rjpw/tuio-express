# tuio-express
Experiments with TUIO and NodeJS using Express

## Project Description
This work demonstrates one possible use of [osc.js](https://github.com/colinbdclark/osc.js) in the browser, extending their udp-browser example [found here](https://github.com/colinbdclark/osc.js-examples) to reflect TUIO messages.

The project is a proof of concept client-server pair meant to demonstrate the viability of:

* Defining a [TUIO](http://www.tuio.org) implementation in the browser
* Improving reconnects by means of socket.io
* Supporting multiple distinct TUIO sources through a single server
* Supporting a variety of TUIO message types

## Server
The server performs the following roles:

1. provides client-side static resources (JavaScript and HTML)
2. listens for raw TUIO bundles over UDP
3. wraps bundles to add sender identity (many devices lack "source" packets)
4. forwards wrapped UDP packets over socket.io

## Client
The browser-based clients perform the bulk of the work with respect to TUIO:

1. interprets raw binary into JavaScript-legible bundles
2. maps OSC bundles into packets and then infers operations from packet types
3. maintains cache of TUIO objects by sender and type
4. retires defunct objects no longer appearing in 'alive' packets
5. raises events for downstream applications

## Architecture Diagram

                              UDP                        HTTP
                               |                          |  
    PHYSICAL DEVICES           |          SERVER          |         WEB CLIENTS
                               |                          | 
                               |     Raw TUIO packets     | 
                               |     forwarded over       | 
                               |     socket.io with a     | 
    +-------------+            |     thin wrapper for     |         +---------------+
    |             |            |     device identity      |         |               |
    | TUIO Device | ------+    |                          |    + -- | osc.js client |
    |             |       |    |     +--------------+     |    |    |               |
    +-------------+       |    |     |    Express   |     |    |    +---------------+
                          +--> | --> |      and     | --> | ---+
    +-------------+       |    |     |   socket.io  |     |    |    +---------------+
    |             |       |    |     +--------------+     |    |    |               |
    | TUIO Device | ------+    |                          |    + -- | osc.js client |
    |             |       |    |                          |    |    |               |
    +-------------+       |    |                          |    |    +---------------+
                          |    |                          |    |
                         ...   |                          |   ...
              (more senders)   |                          |  (more clients)
                               |                          |
                               |                          |


## Running this example

Clone this repository, then in the directory where this README resides install server dependencies with:

    npm install

and then install the client dependencies with

    bower install

and finally run the server with:

    node server

You should then be able to open a browser at the server's location (e.g. http://localhost:8080). You may wish to edit the HTTP port if you have conflicting servers.

If you don't have a device that sends TUIO messages, take a look at the [TUIO software](http://www.tuio.org/?software) under
"TUIO Simulators".

## Where to go from here

You will note that index.html 
