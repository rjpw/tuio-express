/*

  This script assumes the following libraries are loaded and available globally:

    "socket.io": "^1.3.5",
    "osc.js": ">=1.1.0",
    "lodash": "~3.7.0",
    "tiny-emitter": "~1.0.0"

*/

(function () {

  "use strict";

  // used for positional mapping of object properties from TUIO 'set' messages
  var profiles = {
    '/tuio/2Dcur':  ['sid', 'x', 'y', 'dx', 'dy', 'dd'],
    '/tuio/25Dcur': ['sid', 'x', 'y', 'z', 'dx', 'dy', 'dz', 'dd'],
    '/tuio/3Dcur':  ['sid', 'x', 'y', 'z', 'dx', 'dy', 'dz', 'dd'],
    '/tuio/2Dobj':  ['sid', 'cid', 'x', 'y', 'a', 'dx', 'dy', 'da', 'dd', 'ddr'],
    '/tuio/25Dobj': ['sid', 'cid', 'x', 'y', 'z', 'a', 'dx', 'dy', 'dz', 'da', 'dd', 'ddr'],
    '/tuio/3Dobj':  ['sid', 'cid', 'x', 'y', 'z', 'a', 'b', 'c', 'dx', 'dy', 'dz', 'da', 'db', 'dc', 'dd', 'ddr'],
    '/tuio/2Dblb':  ['sid', 'x', 'y', 'a', 'w', 'h', 'f', 'dx', 'dy', 'da', 'dd', 'ddr'],
    '/tuio/25Dblb': ['sid', 'x', 'y', 'z', 'a', 'w', 'h', 'f', 'dx', 'dy', 'dz', 'da', 'dd', 'ddr'],
    '/tuio/3Dblb':  ['sid', 'x', 'y', 'z', 'a', 'b', 'c', 'w', 'h', 'd', 'v', 'dx', 'dy', 'dz', 'da', 'db', 'dc', 'dd', 'ddr']
  };

  /*
  ** Constructor options:
  **
  **   uri: <protocol and location of socket.io sender, eg. 'http://localhost:8080'>
  **   ignoreVerbosity: <skip messages with negative FSEQ numbers (true|false)>
  **   tuioEventName: <event name used by socket.io sender>
  **
  ** See constructor itself for defaults.
  */
  var TuioClient = function (options) {

    this.options = options || {};

    // set reasonable defaults
    _.defaults(this.options,
      { uri: window.location.protocol + "//" + window.location.host },
      { ignoreVerbosity: true },
      { tuioEventName: 'tuiomessage'}
    );

    this.lastFSEQs = {};
    this.objects = {};

    // wire up the connect event
    this.socket = io(this.options.uri);

    this.socket.on('connect', this.onConnect.bind(this));

  };

  // inherit from TinyEmitter
  var pType = TuioClient.prototype = _.create(TinyEmitter.prototype, {
    'constructor': TuioClient
  });

  //
  pType.onConnect = function () {
    this.socket.on(this.options.tuioEventName, this.onMessage.bind(this));
  };

  /*
  ** Messages are expected to be in the following format:
  **
  **   {buffer: <ArrayBuffer>,
  **    sender: <object>}
  **
  ** Where the ArrayBuffer is the raw UDP message from the TUIO device
  ** that sent it (typically on port 3333), and the sender object is
  ** of the form:
  **
  **   {address: <ipaddr>,
  **    family: <IPv4|IPv6>,
  **    port: <clientport>,
  **    size: <msgsize>}
  */
  pType.onMessage = function (message) {

    var m = message; // short name for long expressions below

    var bundle = this.readBundle(m.buffer);
    var senderSuffix = (m.sender && m.sender.address) ? '@' + m.sender.address : '';
    var defaultSource = 'Anonymous' + senderSuffix;

    // default translated message
    var translated = {
      seq: Number.NEGATIVE_INFINITY,
      source: defaultSource,
      objects: [],
      alive: [],
      topics: {}
    };

    // translate each packet, updating the "translated" message object
    _.map(bundle.packets, this.translatePacket, translated);

    // initialize sequence tracker by source
    if (!_.has(this.lastFSEQs, translated.source)) {
      this.lastFSEQs[translated.source] = Number.NEGATIVE_INFINITY;
    }

    // Discard late or verbose messages
    // Note: verbosity check assumes negative FSEQ for verbose messages.
    // This observation is based on the TUIO.org simulator code.
    if (translated.seq >= 0) {
      if (this.lastFSEQs[translated.source] > translated.seq) return;
    } else {
      if (this.options.ignoreVerbosity) return;
    }

    // keep counter for next packet
    this.lastFSEQs[translated.source] = translated.seq;

    // update state and fire events
    this.inferEvents(translated);

  };

  /*
  ** Interprets the packet, transforming into a more concise format.
  **
  ** Note that when this is called it is bound to a translated message
  ** object and not the TuioClient, so the "this" variable refers to
  ** a temporary variable that we modify along the way.
  */
  pType.translatePacket = function (packet) {

    // empty 'alive' args appear as a string, not an array
    var pType = (typeof packet.args === 'string' ? packet.args : packet.args[0]);
    var rest = (typeof packet.args === 'string' ? [] : packet.args.slice(1));

    this.profile = packet.address;

    switch (pType) {

      case 'source':
        this.source = packet.args[1];
        break;

      case 'set':

        var obj = _.zipObject(profiles[packet.address], rest);
        obj.profile = packet.address;

        // we should know the source by the time 'set' packets arrive
        obj.source = this.source;
        this.objects.push(obj);
        break;

      case 'alive':
        this.alive = rest;
        break;

      case 'fseq':
        this.seq = rest[0];
        break;

      default:
        throw 'Unexpected TUIO packet type: ' + pType;

    }
  };

  /*
  ** Updates TuioClient state and fires events.
  */
  pType.inferEvents = function (translated) {
    _.map(translated.objects, this.addUpdateObject.bind(this));
    this.retireMissingObjects(translated);
  };

  /*
  ** Removes objects no longer appearing in 'alive' messages.
  **
  ** Note that this is filtered by source and profile, so
  ** it can keep track of different senders and different
  ** object types (i.e. supports fiducials and cursors).
  */
  pType.retireMissingObjects = function (translated) {

    var knownKeys = _.pluck(this.getLiveObjects({
      source: translated.source,
      profile: translated.profile
    }), 'sid');

    var toRemove = _.difference(knownKeys, translated.alive);
    var eventType = 'tuio_remove';

    _.map(toRemove, function (sid) {
      var oid = translated.source + '_' + translated.profile + '_' + sid;
      var obj = this.objects[oid];
      delete this.objects[oid];
      this.emit(eventType, obj);

    }, this);

  };

  /*
  ** Create or update object.
  **
  ** Emits an event ('tuio_create' or 'tuio_change')
  ** containing the object.
  */
  pType.addUpdateObject = function (tuioObject) {

    var eventType = 'tuio_';

    var knownObjects = this.getLiveObjects({
      source: tuioObject.source,
      profile: tuioObject.profile,
      sid: tuioObject.sid
    });

    var oid = tuioObject.source + '_' + tuioObject.profile + '_' + tuioObject.sid;
    this.objects[oid] = tuioObject;

    if (knownObjects.length > 0) {
      eventType += 'change';
    } else {
      eventType += 'create';
    }

    this.emit(eventType, tuioObject);

  };

  /*
  ** Get a list of objects that match the given properties.
  **
  ** For example getLiveObjects({profile: '/tuio/2Dcur'}) will
  ** return all 2D cursor objects regardless of sender, whereas
  ** getLiveObjects() will return all objects regardless of type.
  */
  pType.getLiveObjects = function (props) {
    var filterProps = props || {};
    return _.filter(this.objects, filterProps);
  };

  /*
  ** Gets a list of active senders.
  */
  pType.getActiveSenders = function () {
    return _.pluck(this.getLiveObjects({
      source: translated.source,
      profile: translated.profile
    }), 'source');
  };

  /*
  ** Curried wrapper around osc.readPacket using default properties.
  */
  pType.readBundle = (function (osc) {
    if (!osc) throw "Missing library: osc.js (https://github.com/colinbdclark/osc.js)";
    return function (message) {
      return osc.readPacket(message, osc.defaults);
    };
  })(osc);

  window.TuioClient = TuioClient;

}());
