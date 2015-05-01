# tuio-express
Experiments with TUIO and NodeJS using Express

# Project Description
This project is a proof of concept client-server pair meant to demonstrate the viability of:

* Handling TUIO details in the browser
* Improving reconnects by means of socket.io
* Supporting multiple distinct TUIO sources through a single server
* Supporting a variety of TUIO message types

# Server
The server performs two roles:

1. provide client-side static resources (JavaScript and HTML)
2. listen for TUIO messages over UDP
3. wrap messages to add sender identity (some senders identify themselves, but others don't)
4. forward UDP packets over socket.io

# Client
The browser-based clients perform the bulk of the work with respect to TUIO, including:

1. interpretation of raw binary OSC messages into JavaScript-legible bundles
2. mapping of OSC bundles into packets
3. interpreting packets and maintaining a cache of TUIO objects by sender and type
4. retiring defunct objects no longer appearing in 'alive' messages
5. raising events for downstream applications

# Architecture Diagram

                              UDP                         HTTP
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
                          +--> | --> |      and     | --> | --
    +-------------+       |    |     |   socket.io  |     |    |    +---------------+
    |             |       |    |     +--------------+     |    |    |               |
    | TUIO Device | ------+    |                          |    + -- | osc.js client |
    |             |       |    |                          |    |    |               |
    +-------------+       |    |                          |    |    +---------------+
                          |    |                          |    |
                         ...   |                          |   ...
             (more senders)    |                          |  (more clients)
                               |                          |
                               |                          |


# Running this example

Clone this repository, then in the directory where this README resides install server dependencies with:

    npm install

and then install the client dependencies with

    bower install

and finally run the server with:

    node server

You should then be able to open a browser at the server's location (e.g. http://localhost:8080). You may wish to edit the HTTP port if you have conflicting servers.

If you don't have a device that sends TUIO messages, take a look at the [TUIO software](http://www.tuio.org/?software) under
"TUIO Simulators".
