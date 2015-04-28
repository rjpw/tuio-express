(function () {

  var mySel = function (selector, el) {
    if (!el) {el = document;}
    return el.querySelector(selector);
  };

  var $ = $ || mySel;

  var tuioClient = new TuioClient();

  var showObjects = function (objects) {
    $("#objects").textContent = JSON.stringify(objects, undefined, 2);
  };

  tuioClient.on('tuio_create', function (p) {
    var cursors = tuioClient.getLiveObjects({profile: p.profile});
    showObjects(cursors);
  });

  tuioClient.on('tuio_change', function (p) {
    var cursors = tuioClient.getLiveObjects({profile: p.profile});
    showObjects(cursors);
  });

  tuioClient.on('tuio_remove', function (p) {
    var cursors = tuioClient.getLiveObjects({profile: p.profile});
    showObjects(cursors);
  });


})();