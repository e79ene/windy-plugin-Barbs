"use strict";

/**
 * This is main plugin loading function
 * Feel free to write your own compiler
 */
W.loadPlugin(
/* Mounting options */
{
  "name": "windy-plugin-barbs",
  "version": "0.1.5",
  "author": "Eugene S. Ostrovsky",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/e79ene/windy-plugin-barbs"
  },
  "description": "Windy plugin for wind barbs.",
  "displayName": "Wind Barbs",
  "hook": "menu"
},
/* HTML */
'<svg xmlns="http://www.w3.org/2000/svg" id="barb-svg-source" class="barb-icon" style="stroke: black; stroke-width: 6" viewbox="-50 -150 100 300" width="40" height="120"> <line x1="0" y1="0" x2="0" y2="-78"></line> <line class="barb-feather-long" x1="-2" y1="-75" x2="38" y2="-91"></line> <line class="barb-feather-short" x1="-2" y1="-60" x2="25" y2="-71"></line> <path d="m -0,-81 0,-27 32,-10 z" class="barb-flag"></path> </svg> <svg xmlns="http://www.w3.org/2000/svg" id="barb-svg-zero" class="barb-icon" style="stroke: black; stroke-width: 6; fill: none" viewbox="-50 -150 100 300" width="40" height="120"> <circle r="20" cx="0" cy="0"></circle> </svg>',
/* CSS */
'',
/* Constructor */
function () {
  var interpolator = W.require('interpolator');

  var broadcast = W.require('broadcast');

  var utils = W.require('utils');

  var store = W.require('store');

  var map = W.require('map');

  var $ = W.require('$');

  var barbSource = $('#windy-plugin-barbs #barb-svg-source');
  var barbZero = $('#windy-plugin-barbs #barb-svg-zero');

  var shiftElement = function shiftElement(element, yStep) {
    element.setAttribute('transform', "translate(0, ".concat(yStep, ")"));
  };

  var buildBarb = function buildBarb(barbSource, kts) {
    var totalFives = Math.round(kts / 5);

    if (totalFives < 1) {
      return barbZero;
    }

    var featherStep = 15,
        flagStep = -30,
        fifties = Math.floor(totalFives / 10),
        fives = totalFives % 10,
        tens = Math.floor(fives / 2),
        needShort = fives % 2;

    var barb = barbSource.cloneNode(true),
        _short = $('.barb-feather-short', barb),
        _long = $('.barb-feather-long', barb),
        flag = $('.barb-flag', barb);

    _short.remove();

    _long.remove();

    flag.remove();

    for (var i = 0; i < fifties; i++) {
      i > 0 && shiftElement(flag, i * flagStep);
      barb.append(flag.cloneNode(true));
    }

    for (var _i = 0; _i < tens; _i++) {
      _i > 0 && shiftElement(_long, _i * featherStep);
      barb.append(_long.cloneNode(true));
    }

    if (needShort) {
      tens > 1 && shiftElement(_short, (tens - 1) * featherStep);
      barb.append(_short);
    }

    return barb;
  };

  var barbIcons = [];

  var getBarbIcon = function getBarbIcon(kts) {
    var fives = Math.round(kts / 5);

    if (typeof barbIcons[fives] === 'undefined') {
      barbIcons[fives] = L.divIcon({
        className: 'barb-div-icon',
        html: buildBarb(barbSource, kts).outerHTML,
        iconSize: [40, 120],
        iconAnchor: [20, 60]
      });
    }

    return barbIcons[fives];
  };

  var markers = [];

  var clearBarbs = function clearBarbs() {
    markers.forEach(function (l) {
      return map.removeLayer(l);
    });
    markers = [];
  };

  var updateBarbs = function updateBarbs() {
    return interpolator(function (interFun) {
      clearBarbs();

      if (store.get('overlay') !== 'wind') {
        return;
      }

      var bounds = map.getBounds();
      var step = 90 / Math.pow(2, map.getZoom());
      var ok = true;

      var toGrid = function toGrid(value, step) {
        return Math.ceil(value / step) * step;
      };

      for (var lat = toGrid(bounds.getSouth(), step); lat <= bounds.getNorth(); lat += step) {
        for (var lon = toGrid(bounds.getWest(), step); lon <= bounds.getEast(); lon += step) {
          var values = interFun({
            lat: lat,
            lon: lon
          });

          if (Array.isArray(values)) {
            var _utils$wind2obj = utils.wind2obj(values),
                wind = _utils$wind2obj.wind,
                dir = _utils$wind2obj.dir;

            var kts = Math.round(wind * 1.94384);
            var marker = L.marker([lat, lon], {
              icon: getBarbIcon(kts),
              zIndexOffset: -1000
            }).addTo(map);
            var icon = $('.barb-icon', marker._icon);
            icon.style.transform = "rotateZ(".concat(dir, "deg)");
            markers.push(marker);
          } else {
            ok = false;
          }

          if (!ok) {
            console.warn('Failed to get interpolated wind for some points!');
          }
        }
      }
    });
  };

  this.onopen = function () {
    broadcast.on('redrawFinished', updateBarbs);
    store.set('overlay', 'wind');
    updateBarbs();
  };

  this.onclose = function () {
    broadcast.off('redrawFinished', updateBarbs);
    clearBarbs();
  };
});