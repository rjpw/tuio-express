/*
** Liberally modified from an example by Boris Smus
** https://github.com/borismus/MagicTouch/blob/master/samples/tracker.html
*/

(function (window) {

	"use strict";

	var canvas;
	var ctx;
	var w = 0;
	var h = 0;

	var timer;
	var updateStarted = false;
	var cursors = [];

  var tuioClient = new window.TuioClient();

  var profileFilter = '/tuio/2Dcur';

	canvas = document.getElementById('canvas');
	ctx = canvas.getContext('2d');

  tuioClient.on('tuio_create', function (p) {
    cursors = tuioClient.getLiveObjects({profile: profileFilter});
  });

  tuioClient.on('tuio_change', function (p) {
    cursors = tuioClient.getLiveObjects({profile: profileFilter});
  });

  tuioClient.on('tuio_remove', function (p) {
    cursors = tuioClient.getLiveObjects({profile: profileFilter});
  });

	function step(timestamp) {

		if (updateStarted) return;
		updateStarted = true;

		var nw = window.innerWidth;
		var nh = window.innerHeight;

		if ((w != nw) || (h != nh)) {
			w = nw;
			h = nh;
			canvas.style.width = w+'px';
			canvas.style.height = h+'px';
			canvas.width = w;
			canvas.height = h;
		}

		ctx.clearRect(0, 0, w, h);

		var i, len = cursors.length;

		for (i=0; i<len; i++) {
			var touch = cursors[i];
	    var px = nw * touch.x;
	    var py = nh * touch.y;

			ctx.beginPath();
			ctx.arc(px, py, 20, 0, 2*Math.PI, true);

			ctx.fillStyle = "rgba(0, 0, 200, 0.2)";
			ctx.fill();

			ctx.lineWidth = 2.0;
			ctx.strokeStyle = "rgba(0, 0, 200, 0.8)";
			ctx.stroke();
		}

		updateStarted = false;

    window.requestAnimationFrame(step);

	}

	window.requestAnimationFrame(step);

})(this);

