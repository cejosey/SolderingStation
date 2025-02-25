/* Detect-zoom
 * -----------
 * Cross Browser Zoom and Pixel Ratio Detector
 * Version 1.0.4 | Apr 1 2013
 * dual-licensed under the WTFPL and MIT license
 * Maintained by https://github/tombigel
 * Original developer https://github.com/yonran
 */

//AMD and CommonJS initialization copied from https://github.com/zohararad/audio5js
(function (root, ns, factory) {
    "use strict";

    if (typeof (module) !== 'undefined' && module.exports) { // CommonJS
        module.exports = factory(ns, root);
    } else if (typeof (define) === 'function' && define.amd) { // AMD
        define("factory", function () {
            return factory(ns, root);
        });
    } else {
        root[ns] = factory(ns, root);
    }

}(window, 'detectZoom', function () {

    /**
     * Use devicePixelRatio if supported by the browser
     * @return {Number}
     * @private
     */
    var devicePixelRatio = function () {
        return window.devicePixelRatio || 1;
    };

    /**
     * Fallback function to set default values
     * @return {Object}
     * @private
     */
    var fallback = function () {
        return {
            zoom: 1,
            devicePxPerCssPx: 1
        };
    };
    /**
     * IE 8 and 9: no trick needed!
     * TODO: Test on IE10 and Windows 8 RT
     * @return {Object}
     * @private
     **/
    var ie8 = function () {
        var zoom = Math.round((screen.deviceXDPI / screen.logicalXDPI) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * For IE10 we need to change our technique again...
     * thanks https://github.com/stefanvanburen
     * @return {Object}
     * @private
     */
    var ie10 = function () {
        var zoom = Math.round((document.documentElement.offsetHeight / window.innerHeight) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Mobile WebKit
     * the trick: window.innerWIdth is in CSS pixels, while
     * screen.width and screen.height are in system pixels.
     * And there are no scrollbars to mess up the measurement.
     * @return {Object}
     * @private
     */
    var webkitMobile = function () {
        var deviceWidth = (Math.abs(window.orientation) == 90) ? screen.height : screen.width;
        var zoom = deviceWidth / window.innerWidth;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Desktop Webkit
     * the trick: an element's clientHeight is in CSS pixels, while you can
     * set its line-height in system pixels using font-size and
     * -webkit-text-size-adjust:none.
     * device-pixel-ratio: http://www.webkit.org/blog/55/high-dpi-web-sites/
     *
     * Previous trick (used before http://trac.webkit.org/changeset/100847):
     * documentElement.scrollWidth is in CSS pixels, while
     * document.width was in system pixels. Note that this is the
     * layout width of the document, which is slightly different from viewport
     * because document width does not include scrollbars and might be wider
     * due to big elements.
     * @return {Object}
     * @private
     */
    var webkit = function () {
        var important = function (str) {
            return str.replace(/;/g, " !important;");
        };

        var div = document.createElement('div');
        div.innerHTML = "1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>0";
        div.setAttribute('style', important('font: 100px/1em sans-serif; -webkit-text-size-adjust: none; text-size-adjust: none; height: auto; width: 1em; padding: 0; overflow: visible;'));

        // The container exists so that the div will be laid out in its own flow
        // while not impacting the layout, viewport size, or display of the
        // webpage as a whole.
        // Add !important and relevant CSS rule resets
        // so that other rules cannot affect the results.
        var container = document.createElement('div');
        container.setAttribute('style', important('width:0; height:0; overflow:hidden; visibility:hidden; position: absolute;'));
        container.appendChild(div);

        document.body.appendChild(container);
        var zoom = 1000 / div.clientHeight;
        zoom = Math.round(zoom * 100) / 100;
        document.body.removeChild(container);

        return{
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * no real trick; device-pixel-ratio is the ratio of device dpi / css dpi.
     * (Note that this is a different interpretation than Webkit's device
     * pixel ratio, which is the ratio device dpi / system dpi).
     *
     * Also, for Mozilla, there is no difference between the zoom factor and the device ratio.
     *
     * @return {Object}
     * @private
     */
    var firefox4 = function () {
        var zoom = mediaQueryBinarySearch('min--moz-device-pixel-ratio', '', 0, 10, 20, 0.0001);
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom
        };
    };

    /**
     * Firefox 18.x
     * Mozilla added support for devicePixelRatio to Firefox 18,
     * but it is affected by the zoom level, so, like in older
     * Firefox we can't tell if we are in zoom mode or in a device
     * with a different pixel ratio
     * @return {Object}
     * @private
     */
    var firefox18 = function () {
        return {
            zoom: firefox4().zoom,
            devicePxPerCssPx: devicePixelRatio()
        };
    };

    /**
     * works starting Opera 11.11
     * the trick: outerWidth is the viewport width including scrollbars in
     * system px, while innerWidth is the viewport width including scrollbars
     * in CSS px
     * @return {Object}
     * @private
     */
    var opera11 = function () {
        var zoom = window.top.outerWidth / window.top.innerWidth;
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Use a binary search through media queries to find zoom level in Firefox
     * @param property
     * @param unit
     * @param a
     * @param b
     * @param maxIter
     * @param epsilon
     * @return {Number}
     */
    var mediaQueryBinarySearch = function (property, unit, a, b, maxIter, epsilon) {
        var matchMedia;
        var head, style, div;
        if (window.matchMedia) {
            matchMedia = window.matchMedia;
        } else {
            head = document.getElementsByTagName('head')[0];
            style = document.createElement('style');
            head.appendChild(style);

            div = document.createElement('div');
            div.className = 'mediaQueryBinarySearch';
            div.style.display = 'none';
            document.body.appendChild(div);

            matchMedia = function (query) {
                style.sheet.insertRule('@media ' + query + '{.mediaQueryBinarySearch ' + '{text-decoration: underline} }', 0);
                var matched = getComputedStyle(div, null).textDecoration == 'underline';
                style.sheet.deleteRule(0);
                return {matches: matched};
            };
        }
        var ratio = binarySearch(a, b, maxIter);
        if (div) {
            head.removeChild(style);
            document.body.removeChild(div);
        }
        return ratio;

        function binarySearch(a, b, maxIter) {
            var mid = (a + b) / 2;
            if (maxIter <= 0 || b - a < epsilon) {
                return mid;
            }
            var query = "(" + property + ":" + mid + unit + ")";
            if (matchMedia(query).matches) {
                return binarySearch(mid, b, maxIter - 1);
            } else {
                return binarySearch(a, mid, maxIter - 1);
            }
        }
    };

    /**
     * Generate detection function
     * @private
     */
    var detectFunction = (function () {
        var func = fallback;
        //IE8+
        if (!isNaN(screen.logicalXDPI) && !isNaN(screen.systemXDPI)) {
            func = ie8;
        }
        // IE10+ / Touch
        else if (window.navigator.msMaxTouchPoints) {
            func = ie10;
        }
        //Mobile Webkit
        else if ('orientation' in window && typeof document.body.style.webkitMarquee === 'string') {
            func = webkitMobile;
        }
        //WebKit
        else if (typeof document.body.style.webkitMarquee === 'string') {
            func = webkit;
        }
        //Opera
        else if (navigator.userAgent.indexOf('Opera') >= 0) {
            func = opera11;
        }
        //Last one is Firefox
        //FF 18.x
        else if (window.devicePixelRatio) {
            func = firefox18;
        }
        //FF 4.0 - 17.x
        else if (firefox4().zoom > 0.001) {
            func = firefox4;
        }

        return func;
    }());


    return ({

        /**
         * Ratios.zoom shorthand
         * @return {Number} Zoom level
         */
        zoom: function () {
            return detectFunction().zoom;
        },

        /**
         * Ratios.devicePxPerCssPx shorthand
         * @return {Number} devicePxPerCssPx level
         */
        device: function () {
            return detectFunction().devicePxPerCssPx;
        }
    });
}));

var wpcom_img_zoomer = {
        clientHintSupport: {
                gravatar: false,
                files: false,
                photon: false,
                mshots: false,
                staticAssets: false,
                latex: false,
                imgpress: false,
        },
	useHints: false,
	zoomed: false,
	timer: null,
	interval: 1000, // zoom polling interval in millisecond

	// Should we apply width/height attributes to control the image size?
	imgNeedsSizeAtts: function( img ) {
		// Do not overwrite existing width/height attributes.
		if ( img.getAttribute('width') !== null || img.getAttribute('height') !== null )
			return false;
		// Do not apply the attributes if the image is already constrained by a parent element.
		if ( img.width < img.naturalWidth || img.height < img.naturalHeight )
			return false;
		return true;
	},

        hintsFor: function( service ) {
                if ( this.useHints === false ) {
                        return false;
                }
                if ( this.hints() === false ) {
                        return false;
                }
                if ( typeof this.clientHintSupport[service] === "undefined" ) {
                        return false;
                }
                if ( this.clientHintSupport[service] === true ) {
                        return true;
                }
                return false;
        },

	hints: function() {
		try {
			var chrome = window.navigator.userAgent.match(/\sChrome\/([0-9]+)\.[.0-9]+\s/)
			if (chrome !== null) {
				var version = parseInt(chrome[1], 10)
				if (isNaN(version) === false && version >= 46) {
					return true
				}
			}
		} catch (e) {
			return false
		}
		return false
	},

	init: function() {
		var t = this;
		try{
			t.zoomImages();
			t.timer = setInterval( function() { t.zoomImages(); }, t.interval );
		}
		catch(e){
		}
	},

	stop: function() {
		if ( this.timer )
			clearInterval( this.timer );
	},

	getScale: function() {
		var scale = detectZoom.device();
		// Round up to 1.5 or the next integer below the cap.
		if      ( scale <= 1.0 ) scale = 1.0;
		else if ( scale <= 1.5 ) scale = 1.5;
		else if ( scale <= 2.0 ) scale = 2.0;
		else if ( scale <= 3.0 ) scale = 3.0;
		else if ( scale <= 4.0 ) scale = 4.0;
		else                     scale = 5.0;
		return scale;
	},

	shouldZoom: function( scale ) {
		var t = this;
		// Do not operate on hidden frames.
		if ( "innerWidth" in window && !window.innerWidth )
			return false;
		// Don't do anything until scale > 1
		if ( scale == 1.0 && t.zoomed == false )
			return false;
		return true;
	},

	zoomImages: function() {
		var t = this;
		var scale = t.getScale();
		if ( ! t.shouldZoom( scale ) ){
			return;
		}
		t.zoomed = true;
		// Loop through all the <img> elements on the page.
		var imgs = document.getElementsByTagName("img");

		for ( var i = 0; i < imgs.length; i++ ) {
			// Wait for original images to load
			if ( "complete" in imgs[i] && ! imgs[i].complete )
				continue;

			// Skip images that have srcset attributes.
			if ( imgs[i].hasAttribute('srcset') ) {
				continue;
			}

			// Skip images that don't need processing.
			var imgScale = imgs[i].getAttribute("scale");
			if ( imgScale == scale || imgScale == "0" )
				continue;

			// Skip images that have already failed at this scale
			var scaleFail = imgs[i].getAttribute("scale-fail");
			if ( scaleFail && scaleFail <= scale )
				continue;

			// Skip images that have no dimensions yet.
			if ( ! ( imgs[i].width && imgs[i].height ) )
				continue;

			// Skip images from Lazy Load plugins
			if ( ! imgScale && imgs[i].getAttribute("data-lazy-src") && (imgs[i].getAttribute("data-lazy-src") !== imgs[i].getAttribute("src")))
				continue;

			if ( t.scaleImage( imgs[i], scale ) ) {
				// Mark the img as having been processed at this scale.
				imgs[i].setAttribute("scale", scale);
			}
			else {
				// Set the flag to skip this image.
				imgs[i].setAttribute("scale", "0");
			}
		}
	},

	scaleImage: function( img, scale ) {
		var t = this;
		var newSrc = img.src;

                var isFiles = false;
                var isLatex = false;
                var isPhoton = false;

		// Skip slideshow images
		if ( img.parentNode.className.match(/slideshow-slide/) )
			return false;

		// Skip CoBlocks Lightbox images
		if ( img.parentNode.className.match(/coblocks-lightbox__image/) )
			return false;

		// Scale gravatars that have ?s= or ?size=
		if ( img.src.match( /^https?:\/\/([^\/]*\.)?gravatar\.com\/.+[?&](s|size)=/ ) ) {
                        if ( this.hintsFor( "gravatar" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&](s|size)=)(\d+)/, function( $0, $1, $2, $3 ) {
				// Stash the original size
				var originalAtt = "originals",
				originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $3;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width/height of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(img.clientWidth * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go larger than the service supports
				targetSize = Math.min( targetSize, 512 );
				return $1 + targetSize;
			});
		}

		// Scale mshots that have width
		else if ( img.src.match(/^https?:\/\/([^\/]+\.)*(wordpress|wp)\.com\/mshots\/.+[?&]w=\d+/) ) {
                        if ( this.hintsFor( "mshots" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&]w=)(\d+)/, function($0, $1, $2) {
				// Stash the original size
				var originalAtt = 'originalw', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalWidth )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});

			// Update height attribute to match width
			newSrc = newSrc.replace( /([?&]h=)(\d+)/, function($0, $1, $2) {
				if ( newSrc == img.src ) {
					return $0;
				}
				// Stash the original size
				var originalAtt = 'originalh', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
				}
				// Get the height of the image in CSS pixels
				var size = img.clientHeight;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalHeight )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});
		}

		// Scale simple imgpress queries (s0.wp.com) that only specify w/h/fit
		else if ( img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/imgpress\?(.+)/) ) {
                        if ( this.hintsFor( "imgpress" ) === true ) {
                                return false; 
                        }
			var imgpressSafeFunctions = ["zoom", "url", "h", "w", "fit", "filter", "brightness", "contrast", "colorize", "smooth", "unsharpmask"];
			// Search the query string for unsupported functions.
			var qs = RegExp.$3.split('&');
			for ( var q in qs ) {
				q = qs[q].split('=')[0];
				if ( imgpressSafeFunctions.indexOf(q) == -1 ) {
					return false;
				}
			}
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 )
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			else
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?zoom=' + scale + '&');
		}

		// Scale files.wordpress.com, LaTeX, or Photon images (i#.wp.com)
		else if (
			( isFiles = img.src.match(/^https?:\/\/([^\/]+)\.files\.wordpress\.com\/.+[?&][wh]=/) ) ||
			( isLatex = img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/latex\.php\?(latex|zoom)=(.+)/) ) ||
			( isPhoton = img.src.match(/^https?:\/\/i[\d]{1}\.wp\.com\/(.+)/) )
		) {
                        if ( false !== isFiles && this.hintsFor( "files" ) === true ) {
                                return false
                        }
                        if ( false !== isLatex && this.hintsFor( "latex" ) === true ) {
                                return false
                        }
                        if ( false !== isPhoton && this.hintsFor( "photon" ) === true ) {
                                return false
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 ) {
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			} else {
				newSrc = img.src;

				var url_var = newSrc.match( /([?&]w=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.width );
				}

				url_var = newSrc.match( /([?&]h=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.height );
				}

				var zoom_arg = '&zoom=2';
				if ( !newSrc.match( /\?/ ) ) {
					zoom_arg = '?zoom=2';
				}
				img.setAttribute( 'srcset', newSrc + zoom_arg + ' ' + scale + 'x' );
			}
		}

		// Scale static assets that have a name matching *-1x.png or *@1x.png
		else if ( img.src.match(/^https?:\/\/[^\/]+\/.*[-@]([12])x\.(gif|jpeg|jpg|png)(\?|$)/) ) {
                        if ( this.hintsFor( "staticAssets" ) === true ) {
                                return false; 
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			var currentSize = RegExp.$1, newSize = currentSize;
			if ( scale <= 1 )
				newSize = 1;
			else
				newSize = 2;
			if ( currentSize != newSize )
				newSrc = img.src.replace(/([-@])[12]x\.(gif|jpeg|jpg|png)(\?|$)/, '$1'+newSize+'x.$2$3');
		}

		else {
			return false;
		}

		// Don't set img.src unless it has changed. This avoids unnecessary reloads.
		if ( newSrc != img.src ) {
			// Store the original img.src
			var prevSrc, origSrc = img.getAttribute("src-orig");
			if ( !origSrc ) {
				origSrc = img.src;
				img.setAttribute("src-orig", origSrc);
			}
			// In case of error, revert img.src
			prevSrc = img.src;
			img.onerror = function(){
				img.src = prevSrc;
				if ( img.getAttribute("scale-fail") < scale )
					img.setAttribute("scale-fail", scale);
				img.onerror = null;
			};
			// Finally load the new image
			img.src = newSrc;
		}

		return true;
	}
};

wpcom_img_zoomer.init();
;
/**
 The MIT License

 Copyright (c) 2010 Daniel Park (http://metaweb.com, http://postmessage.freebaseapps.com)

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 **/
var NO_JQUERY = {};
(function(window, $, undefined) {

     if (!("console" in window)) {
         var c = window.console = {};
         c.log = c.warn = c.error = c.debug = function(){};
     }

     if ($ === NO_JQUERY) {
         // jQuery is optional
         $ = {
             fn: {},
             extend: function() {
                 var a = arguments[0];
                 for (var i=1,len=arguments.length; i<len; i++) {
                     var b = arguments[i];
                     for (var prop in b) {
                         a[prop] = b[prop];
                     }
                 }
                 return a;
             }
         };
     }

     $.fn.pm = function() {
         console.log("usage: \nto send:    $.pm(options)\nto receive: $.pm.bind(type, fn, [origin])");
         return this;
     };

     // send postmessage
     $.pm = window.pm = function(options) {
         pm.send(options);
     };

     // bind postmessage handler
     $.pm.bind = window.pm.bind = function(type, fn, origin, hash, async_reply) {
         pm.bind(type, fn, origin, hash, async_reply === true);
     };

     // unbind postmessage handler
     $.pm.unbind = window.pm.unbind = function(type, fn) {
         pm.unbind(type, fn);
     };

     // default postmessage origin on bind
     $.pm.origin = window.pm.origin = null;

     // default postmessage polling if using location hash to pass postmessages
     $.pm.poll = window.pm.poll = 200;

     var pm = {

         send: function(options) {
             var o = $.extend({}, pm.defaults, options),
             target = o.target;
             if (!o.target) {
                 console.warn("postmessage target window required");
                 return;
             }
             if (!o.type) {
                 console.warn("postmessage type required");
                 return;
             }
             var msg = {data:o.data, type:o.type};
             if (o.success) {
                 msg.callback = pm._callback(o.success);
             }
             if (o.error) {
                 msg.errback = pm._callback(o.error);
             }
             if (("postMessage" in target) && !o.hash) {
                 pm._bind();
                 target.postMessage(JSON.stringify(msg), o.origin || '*');
             }
             else {
                 pm.hash._bind();
                 pm.hash.send(o, msg);
             }
         },

         bind: function(type, fn, origin, hash, async_reply) {
           pm._replyBind ( type, fn, origin, hash, async_reply );
         },

         _replyBind: function(type, fn, origin, hash, isCallback) {
           if (("postMessage" in window) && !hash) {
               pm._bind();
           }
           else {
               pm.hash._bind();
           }
           var l = pm.data("listeners.postmessage");
           if (!l) {
               l = {};
               pm.data("listeners.postmessage", l);
           }
           var fns = l[type];
           if (!fns) {
               fns = [];
               l[type] = fns;
           }
           fns.push({fn:fn, callback: isCallback, origin:origin || $.pm.origin});
         },

         unbind: function(type, fn) {
             var l = pm.data("listeners.postmessage");
             if (l) {
                 if (type) {
                     if (fn) {
                         // remove specific listener
                         var fns = l[type];
                         if (fns) {
                             var m = [];
                             for (var i=0,len=fns.length; i<len; i++) {
                                 var o = fns[i];
                                 if (o.fn !== fn) {
                                     m.push(o);
                                 }
                             }
                             l[type] = m;
                         }
                     }
                     else {
                         // remove all listeners by type
                         delete l[type];
                     }
                 }
                 else {
                     // unbind all listeners of all type
                     for (var i in l) {
                       delete l[i];
                     }
                 }
             }
         },

         data: function(k, v) {
             if (v === undefined) {
                 return pm._data[k];
             }
             pm._data[k] = v;
             return v;
         },

         _data: {},

         _CHARS: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''),

         _random: function() {
             var r = [];
             for (var i=0; i<32; i++) {
                 r[i] = pm._CHARS[0 | Math.random() * 32];
             };
             return r.join("");
         },

         _callback: function(fn) {
             var cbs = pm.data("callbacks.postmessage");
             if (!cbs) {
                 cbs = {};
                 pm.data("callbacks.postmessage", cbs);
             }
             var r = pm._random();
             cbs[r] = fn;
             return r;
         },

         _bind: function() {
             // are we already listening to message events on this w?
             if (!pm.data("listening.postmessage")) {
                 if (window.addEventListener) {
                     window.addEventListener("message", pm._dispatch, false);
                 }
                 else if (window.attachEvent) {
                     window.attachEvent("onmessage", pm._dispatch);
                 }
                 pm.data("listening.postmessage", 1);
             }
         },

         _dispatch: function(e) {
             //console.log("$.pm.dispatch", e, this);
             try {
                 var msg = JSON.parse(e.data);
             }
             catch (ex) {
                 //console.warn("postmessage data invalid json: ", ex); //message wasn't meant for pm
                 return;
             }
             if (!msg.type) {
                 //console.warn("postmessage message type required"); //message wasn't meant for pm
                 return;
             }
             var cbs = pm.data("callbacks.postmessage") || {},
             cb = cbs[msg.type];
             if (cb) {
                 cb(msg.data);
             }
             else {
                 var l = pm.data("listeners.postmessage") || {};
                 var fns = l[msg.type] || [];
                 for (var i=0,len=fns.length; i<len; i++) {
                     var o = fns[i];
                     if (o.origin && o.origin !== '*' && e.origin !== o.origin) {
                         console.warn("postmessage message origin mismatch", e.origin, o.origin);
                         if (msg.errback) {
                             // notify post message errback
                             var error = {
                                 message: "postmessage origin mismatch",
                                 origin: [e.origin, o.origin]
                             };
                             pm.send({target:e.source, data:error, type:msg.errback});
                         }
                         continue;
                     }

                     function sendReply ( data ) {
                       if (msg.callback) {
                           pm.send({target:e.source, data:data, type:msg.callback});
                       }
                     }

                     try {
                         if ( o.callback ) {
                           o.fn(msg.data, sendReply, e);
                         } else {
                           sendReply ( o.fn(msg.data, e) );
                         }
                     }
                     catch (ex) {
                         if (msg.errback) {
                             // notify post message errback
                             pm.send({target:e.source, data:ex, type:msg.errback});
                         } else {
                             throw ex;
                         }
                     }
                 };
             }
         }
     };

     // location hash polling
     pm.hash = {

         send: function(options, msg) {
             //console.log("hash.send", target_window, options, msg);
             var target_window = options.target,
             target_url = options.url;
             if (!target_url) {
                 console.warn("postmessage target window url is required");
                 return;
             }
             target_url = pm.hash._url(target_url);
             var source_window,
             source_url = pm.hash._url(window.location.href);
             if (window == target_window.parent) {
                 source_window = "parent";
             }
             else {
                 try {
                     for (var i=0,len=parent.frames.length; i<len; i++) {
                         var f = parent.frames[i];
                         if (f == window) {
                             source_window = i;
                             break;
                         }
                     };
                 }
                 catch(ex) {
                     // Opera: security error trying to access parent.frames x-origin
                     // juse use window.name
                     source_window = window.name;
                 }
             }
             if (source_window == null) {
                 console.warn("postmessage windows must be direct parent/child windows and the child must be available through the parent window.frames list");
                 return;
             }
             var hashmessage = {
                 "x-requested-with": "postmessage",
                 source: {
                     name: source_window,
                     url: source_url
                 },
                 postmessage: msg
             };
             var hash_id = "#x-postmessage-id=" + pm._random();
             target_window.location = target_url + hash_id + encodeURIComponent(JSON.stringify(hashmessage));
         },

         _regex: /^\#x\-postmessage\-id\=(\w{32})/,

         _regex_len: "#x-postmessage-id=".length + 32,

         _bind: function() {
             // are we already listening to message events on this w?
             if (!pm.data("polling.postmessage")) {
                 setInterval(function() {
                                 var hash = "" + window.location.hash,
                                 m = pm.hash._regex.exec(hash);
                                 if (m) {
                                     var id = m[1];
                                     if (pm.hash._last !== id) {
                                         pm.hash._last = id;
                                         pm.hash._dispatch(hash.substring(pm.hash._regex_len));
                                     }
                                 }
                             }, $.pm.poll || 200);
                 pm.data("polling.postmessage", 1);
             }
         },

         _dispatch: function(hash) {
             if (!hash) {
                 return;
             }
             try {
                 hash = JSON.parse(decodeURIComponent(hash));
                 if (!(hash['x-requested-with'] === 'postmessage' &&
                       hash.source && hash.source.name != null && hash.source.url && hash.postmessage)) {
                     // ignore since hash could've come from somewhere else
                     return;
                 }
             }
             catch (ex) {
                 // ignore since hash could've come from somewhere else
                 return;
             }
             var msg = hash.postmessage,
             cbs = pm.data("callbacks.postmessage") || {},
             cb = cbs[msg.type];
             if (cb) {
                 cb(msg.data);
             }
             else {
                 var source_window;
                 if (hash.source.name === "parent") {
                     source_window = window.parent;
                 }
                 else {
                     source_window = window.frames[hash.source.name];
                 }
                 var l = pm.data("listeners.postmessage") || {};
                 var fns = l[msg.type] || [];
                 for (var i=0,len=fns.length; i<len; i++) {
                     var o = fns[i];
                     if (o.origin) {
                         var origin = /https?\:\/\/[^\/]*/.exec(hash.source.url)[0];
                         if (o.origin !== '*' && origin !== o.origin) {
                             console.warn("postmessage message origin mismatch", origin, o.origin);
                             if (msg.errback) {
                                 // notify post message errback
                                 var error = {
                                     message: "postmessage origin mismatch",
                                     origin: [origin, o.origin]
                                 };
                                 pm.send({target:source_window, data:error, type:msg.errback, hash:true, url:hash.source.url});
                             }
                             continue;
                         }
                     }

                     function sendReply ( data ) {
                       if (msg.callback) {
                         pm.send({target:source_window, data:data, type:msg.callback, hash:true, url:hash.source.url});
                       }
                     }

                     try {
                         if ( o.callback ) {
                           o.fn(msg.data, sendReply);
                         } else {
                           sendReply ( o.fn(msg.data) );
                         }
                     }
                     catch (ex) {
                         if (msg.errback) {
                             // notify post message errback
                             pm.send({target:source_window, data:ex, type:msg.errback, hash:true, url:hash.source.url});
                         } else {
                             throw ex;
                         }
                     }
                 };
             }
         },

         _url: function(url) {
             // url minus hash part
             return (""+url).replace(/#.*$/, "");
         }

     };

     $.extend(pm, {
                  defaults: {
                      target: null,  /* target window (required) */
                      url: null,     /* target window url (required if no window.postMessage or hash == true) */
                      type: null,    /* message type (required) */
                      data: null,    /* message data (required) */
                      success: null, /* success callback (optional) */
                      error: null,   /* error callback (optional) */
                      origin: "*",   /* postmessage origin (optional) */
                      hash: false    /* use location hash for message passing (optional) */
                  }
              });

 })(this, typeof jQuery === "undefined" ? NO_JQUERY : jQuery);
;
/**
 * author Christopher Blum
 *    - based on the idea of Remy Sharp, http://remysharp.com/2009/01/26/element-in-view-event-plugin/
 *    - forked from http://github.com/zuk/jquery.inview/
 */
(function ($) {
  var inviewObjects = {}, viewportSize, viewportOffset,
      d = document, w = window, documentElement = d.documentElement, expando = $.expando;

  $.event.special.inview = {
    add: function(data) {
      inviewObjects[data.guid + "-" + this[expando]] = { data: data, $element: $(this) };
    },

    remove: function(data) {
      try { delete inviewObjects[data.guid + "-" + this[expando]]; } catch(e) {}
    }
  };

  function getViewportSize() {
    var mode, domObject, size = { height: w.innerHeight, width: w.innerWidth };

    // if this is correct then return it. iPad has compat Mode, so will
    // go into check clientHeight/clientWidth (which has the wrong value).
    if (!size.height) {
      mode = d.compatMode;
      if (mode || !$.support.boxModel) { // IE, Gecko
        domObject = mode === 'CSS1Compat' ?
          documentElement : // Standards
          d.body; // Quirks
        size = {
          height: domObject.clientHeight,
          width:  domObject.clientWidth
        };
      }
    }

    return size;
  }

  function getViewportOffset() {
    return {
      top:  w.pageYOffset || documentElement.scrollTop   || d.body.scrollTop,
      left: w.pageXOffset || documentElement.scrollLeft  || d.body.scrollLeft
    };
  }

  function checkInView() {
    var $elements = $(), elementsLength, i = 0;

    $.each(inviewObjects, function(i, inviewObject) {
      var selector  = inviewObject.data.selector,
          $element  = inviewObject.$element;
      $elements = $elements.add(selector ? $element.find(selector) : $element);
    });

    elementsLength = $elements.length;
    if (elementsLength) {
      viewportSize   = viewportSize   || getViewportSize();
      viewportOffset = viewportOffset || getViewportOffset();

      for (; i<elementsLength; i++) {
        // Ignore elements that are not in the DOM tree
        if (!$.contains(documentElement, $elements[i])) {
          continue;
        }

        var element       = $elements[i],
            $element      = $(element),
            elementSize   = {},
            elementOffset = {},
            inView        = $element.data('inview'),
            visiblePartX,
            visiblePartY,
            visiblePartsMerged;

        // for the case where 'display:none' is used in place of 'visibility:hidden'
        // count and sum the above items to get and move closer to the correct values
        // IMPORTANT :: insert element into container empty
        if($element.css('display') == 'none')
        {
            var parentElement = $element.parent();

            elementOffset.top = parentElement.offset().top;
            elementOffset.left = parentElement.offset().left;
            elementSize.height = parentElement.height();
            elementSize.width = parentElement.width();
        } else {
       	    elementSize = { height: $element.height(), width: $element.width() }
       	    elementOffset = $element.offset();
       	}

        // Don't ask me why because I haven't figured out yet:
        // viewportOffset and viewportSize are sometimes suddenly null in Firefox 5.
        // Even though it sounds weird:
        // It seems that the execution of this function is interferred by the onresize/onscroll event
        // where viewportOffset and viewportSize are unset
        if (!viewportOffset || !viewportSize) {
          return;
        }

        if (element.offsetWidth >= 0 && element.offsetHeight >= 0 && element.style.display != "none" &&
            elementOffset.top + elementSize.height > viewportOffset.top &&
            elementOffset.top < viewportOffset.top + viewportSize.height &&
            elementOffset.left + elementSize.width > viewportOffset.left &&
            elementOffset.left < viewportOffset.left + viewportSize.width) {
          visiblePartX = (viewportOffset.left > elementOffset.left ?
            'right' : (viewportOffset.left + viewportSize.width) < (elementOffset.left + elementSize.width) ?
            'left' : 'both');
          visiblePartY = (viewportOffset.top > elementOffset.top ?
            'bottom' : (viewportOffset.top + viewportSize.height) < (elementOffset.top + elementSize.height) ?
            'top' : 'both');
          visiblePartsMerged = visiblePartX + "-" + visiblePartY;
          if (!inView || inView !== visiblePartsMerged) {
            $element.data('inview', visiblePartsMerged).trigger('inview', [true, visiblePartX, visiblePartY]);
          }
        } else if (inView) {
          $element.data('inview', false).trigger('inview', [false]);
        }
      }
    }
  }

  $(w).bind("scroll resize", function() {
    viewportSize = viewportOffset = null;
  });

  // IE < 9 scrolls to focused elements without firing the "scroll" event
  if (!documentElement.addEventListener && documentElement.attachEvent) {
    documentElement.attachEvent("onfocusin", function() {
      viewportOffset = null;
    });
  }

  // Use setInterval in order to also make sure this captures elements within
  // "overflow:scroll" elements or elements that appeared in the dom tree due to
  // dom manipulation and reflow
  // old: $(window).scroll(checkInView);
  //
  // By the way, iOS (iPad, iPhone, ...) seems to not execute, or at least delays
  // intervals while the user scrolls. Therefore the inview event might fire a bit late there
  setInterval(checkInView, 250);
})(jQuery);;
/* global Jetpack, JSON */
/**
 * Resizeable Iframes.
 *
 * Start listening to resize postMessage events for selected iframes:
 * $( selector ).Jetpack( 'resizeable' );
 * - OR -
 * Jetpack.resizeable( 'on', context );
 *
 * Resize selected iframes:
 * $( selector ).Jetpack( 'resizeable', 'resize', { width: 100, height: 200 } );
 * - OR -
 * Jetpack.resizeable( 'resize', { width: 100, height: 200 }, context );
 *
 * Stop listening to resize postMessage events for selected iframes:
 * $( selector ).Jetpack( 'resizeable', 'off' );
 * - OR -
 * Jetpack.resizeable( 'off', context );
 *
 * Stop listening to all resize postMessage events:
 * Jetpack.resizeable( 'off' );
 */
( function ( $ ) {
	var listening = false, // Are we listening for resize postMessage events
		sourceOrigins = [], // What origins are allowed to send resize postMessage events
		$sources = false, // What iframe elements are we tracking resize postMessage events from
		URLtoOrigin, // Utility to convert URLs into origins
		setupListener, // Binds global resize postMessage event handler
		destroyListener, // Unbinds global resize postMessage event handler
		methods; // Jetpack.resizeable methods

	// Setup the Jetpack global
	if ( 'undefined' === typeof window.Jetpack ) {
		window.Jetpack = {
			/**
			 * Handles the two different calling methods:
			 * $( selector ).Jetpack( 'namespace', 'method', context ) // here, context is optional and is used to filter the collection
			 * - vs. -
			 * Jetpack.namespace( 'method', context ) // here context defines the collection
			 *
			 * @internal
			 *
			 * Call as: Jetpack.getTarget.call( this, context )
			 *
			 * @param string context: jQuery selector
			 * @return jQuery|undefined object on which to perform operations or undefined when context cannot be determined
			 */
			getTarget: function ( context ) {
				if ( this instanceof jQuery ) {
					return context ? this.filter( context ) : this;
				}

				return context ? $( context ) : context;
			},
		};
	}

	// Setup the Jetpack jQuery method
	if ( 'undefined' === typeof $.fn.Jetpack ) {
		/**
		 * Dispatches calls to the correct namespace
		 *
		 * @param string namespace
		 * @param ...
		 * @return mixed|jQuery (chainable)
		 */
		$.fn.Jetpack = function ( namespace ) {
			if ( 'function' === typeof Jetpack[ namespace ] ) {
				// Send the call to the correct Jetpack.namespace
				return Jetpack[ namespace ].apply( this, Array.prototype.slice.call( arguments, 1 ) );
			} else {
				$.error( 'Namespace "' + namespace + '" does not exist on jQuery.Jetpack' );
			}
		};
	}

	// Define Jetpack.resizeable() namespace to just always bail if no postMessage
	if ( 'function' !== typeof window.postMessage ) {
		$.extend( window.Jetpack, {
			/**
			 * Defines the Jetpack.resizeable() namespace.
			 * See below for non-trivial definition for browsers with postMessage.
			 */
			resizeable: function () {
				$.error( 'Browser does not support window.postMessage' );
			},
		} );

		return;
	}

	/**
	 * Utility to convert URLs into origins
	 *
	 * http://example.com:port/path?query#fragment -> http://example.com:port
	 *
	 * @param string URL
	 * @return string origin
	 */
	URLtoOrigin = function ( URL ) {
		if ( ! URL.match( /^https?:\/\// ) ) {
			URL = document.location.href;
		}
		return URL.split( '/' ).slice( 0, 3 ).join( '/' );
	};

	/**
	 * Binds global resize postMessage event handler
	 */
	setupListener = function () {
		listening = true;

		$( window ).on( 'message.JetpackResizeableIframe', function ( e ) {
			var event = e.originalEvent,
				data;

			// Ensure origin is allowed
			if ( -1 === $.inArray( event.origin, sourceOrigins ) ) {
				return;
			}

			// Some browsers send structured data, some send JSON strings
			if ( 'object' === typeof event.data ) {
				data = event.data.data;
			} else {
				try {
					data = JSON.parse( event.data );
				} catch ( err ) {
					data = false;
				}
			}

			if ( ! data.data ) {
				return;
			}

			// Un-nest
			data = data.data;

			// Is it a resize event?
			if ( 'undefined' === typeof data.action || 'resize' !== data.action ) {
				return;
			}

			// Find the correct iframe and resize it
			$sources
				.filter( function () {
					if ( 'undefined' !== typeof data.name ) {
						return this.name === data.name;
					} else {
						return event.source === this.contentWindow;
					}
				} )
				.first()
				.Jetpack( 'resizeable', 'resize', data );
		} );
	};

	/**
	 * Unbinds global resize postMessage event handler
	 */
	destroyListener = function () {
		listening = false;
		$( window ).off( 'message.JetpackResizeableIframe' );

		sourceOrigins = [];
		$( '.jetpack-resizeable' ).removeClass( 'jetpack-resizeable' );
		$sources = false;
	};

	// Methods for Jetpack.resizeable() namespace
	methods = {
		/**
		 * Start listening for resize postMessage events on the given iframes
		 *
		 * Call statically as: Jetpack.resizeable( 'on', context )
		 * Call as: $( selector ).Jetpack( 'resizeable', 'on', context ) // context optional: used to filter the collectino
		 *
		 * @param string context jQuery selector.
		 * @return jQuery (chainable)
		 */
		on: function ( context ) {
			var target = Jetpack.getTarget.call( this, context );

			if ( ! listening ) {
				setupListener();
			}

			target
				.each( function () {
					sourceOrigins.push( URLtoOrigin( $( this ).attr( 'src' ) ) );
				} )
				.addClass( 'jetpack-resizeable' );

			$sources = $( '.jetpack-resizeable' );

			return target;
		},

		/**
		 * Stop listening for resize postMessage events on the given iframes
		 *
		 * Call statically as: Jetpack.resizeable( 'off', context )
		 * Call as: $( selector ).Jetpack( 'resizeable', 'off', context ) // context optional: used to filter the collectino
		 *
		 * @param string context jQuery selector
		 * @return jQuery (chainable)
		 */
		off: function ( context ) {
			var target = Jetpack.getTarget.call( this, context );

			if ( 'undefined' === typeof target ) {
				destroyListener();

				return target;
			}

			target
				.each( function () {
					var origin = URLtoOrigin( $( this ).attr( 'src' ) ),
						pos = $.inArray( origin, sourceOrigins );

					if ( -1 !== pos ) {
						sourceOrigins.splice( pos, 1 );
					}
				} )
				.removeClass( 'jetpack-resizeable' );

			$sources = $( '.jetpack-resizeable' );

			return target;
		},

		/**
		 * Resize the given iframes
		 *
		 * Call statically as: Jetpack.resizeable( 'resize', dimensions, context )
		 * Call as: $( selector ).Jetpack( 'resizeable', 'resize', dimensions, context ) // context optional: used to filter the collectino
		 *
		 * @param object dimensions in pixels: { width: (int), height: (int) }
		 * @param string context jQuery selector
		 * @return jQuery (chainable)
		 */
		resize: function ( dimensions, context ) {
			var target = Jetpack.getTarget.call( this, context );

			$.each( [ 'width', 'height' ], function ( i, variable ) {
				var value = 0,
					container;
				if ( 'undefined' !== typeof dimensions[ variable ] ) {
					value = parseInt( dimensions[ variable ], 10 );
				}

				if ( 0 !== value ) {
					target[ variable ]( value );
					container = target.parent();
					if ( container.hasClass( 'slim-likes-widget' ) ) {
						container[ variable ]( value );
					}
				}
			} );

			return target;
		},
	};

	// Define Jetpack.resizeable() namespace
	$.extend( window.Jetpack, {
		/**
		 * Defines the Jetpack.resizeable() namespace.
		 * See above for trivial definition for browsers with no postMessage.
		 *
		 * @param string method
		 * @param ...
		 * @return mixed|jQuery (chainable)
		 */
		resizeable: function ( method ) {
			if ( methods[ method ] ) {
				// Send the call to the correct Jetpack.resizeable() method
				return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ) );
			} else if ( ! method ) {
				// By default, send to Jetpack.resizeable( 'on' ), which isn't useful in that form but is when called as
				// jQuery( selector ).Jetpack( 'resizeable' )
				return methods.on.apply( this );
			} else {
				$.error( 'Method ' + method + ' does not exist on Jetpack.resizeable' );
			}
		},
	} );
} )( jQuery );
;
/* global pm, wpcom_reblog */

var jetpackLikesWidgetQueue = [];
var jetpackLikesWidgetBatch = [];
var jetpackLikesMasterReady = false;

function JetpackLikespostMessage( message, target ) {
	if ( 'string' === typeof message ){
		try {
			message = JSON.parse( message );
		} catch(e) {
			return;
		}
	}

	pm( {
		target: target,
		type: 'likesMessage',
		data: message,
		origin: '*'
	} );
}

function JetpackLikesBatchHandler() {
	var requests = [];
	jQuery( 'div.jetpack-likes-widget-unloaded' ).each( function() {
		if ( jetpackLikesWidgetBatch.indexOf( this.id ) > -1 ) {
			return;
		}
		jetpackLikesWidgetBatch.push( this.id );
		var regex = /like-(post|comment)-wrapper-(\d+)-(\d+)-(\w+)/,
			match = regex.exec( this.id ),
			info;

		if ( ! match || match.length !== 5 ) {
			return;
		}

		info = {
			blog_id: match[2],
			width:   this.width
		};

		if ( 'post' === match[1] ) {
			info.post_id = match[3];
		} else if ( 'comment' === match[1] ) {
			info.comment_id = match[3];
		}

		info.obj_id = match[4];

		requests.push( info );
	});

	if ( requests.length > 0 ) {
		JetpackLikespostMessage( { event: 'initialBatch', requests: requests }, window.frames['likes-master'] );
	}
}

function JetpackLikesMessageListener( event, message ) {
	var allowedOrigin, $container, $list, offset, rowLength, height, scrollbarWidth;

	if ( 'undefined' === typeof event.event ) {
		return;
	}

	// We only allow messages from one origin
	allowedOrigin = window.location.protocol + '//widgets.wp.com';
	if ( allowedOrigin !== message.origin ) {
		return;
	}

	if ( 'masterReady' === event.event ) {
		jQuery( document ).ready( function() {
			jetpackLikesMasterReady = true;

			var stylesData = {
					event: 'injectStyles'
				},
				$sdTextColor = jQuery( '.sd-text-color' ),
				$sdLinkColor = jQuery( '.sd-link-color' );

			if ( jQuery( 'iframe.admin-bar-likes-widget' ).length > 0 ) {
				JetpackLikespostMessage( { event: 'adminBarEnabled' }, window.frames[ 'likes-master' ] );

				stylesData.adminBarStyles = {
					background: jQuery( '#wpadminbar .quicklinks li#wp-admin-bar-wpl-like > a' ).css( 'background' ),
					isRtl: ( 'rtl' === jQuery( '#wpadminbar' ).css( 'direction' ) )
				};
			}

			// enable reblogs if we're on a single post page
			if ( jQuery( 'body' ).hasClass( 'single' ) ) {
				JetpackLikespostMessage( { event: 'reblogsEnabled' }, window.frames[ 'likes-master' ] );
			}

			if ( ! window.addEventListener ) {
				jQuery( '#wp-admin-bar-admin-bar-likes-widget' ).hide();
			}

			stylesData.textStyles = {
				color:          $sdTextColor.css( 'color' ),
				fontFamily:     $sdTextColor.css( 'font-family' ),
				fontSize:       $sdTextColor.css( 'font-size' ),
				direction:      $sdTextColor.css( 'direction' ),
				fontWeight:     $sdTextColor.css( 'font-weight' ),
				fontStyle:      $sdTextColor.css( 'font-style' ),
				textDecoration: $sdTextColor.css('text-decoration')
			};

			stylesData.linkStyles = {
				color:          $sdLinkColor.css('color'),
				fontFamily:     $sdLinkColor.css('font-family'),
				fontSize:       $sdLinkColor.css('font-size'),
				textDecoration: $sdLinkColor.css('text-decoration'),
				fontWeight:     $sdLinkColor.css( 'font-weight' ),
				fontStyle:      $sdLinkColor.css( 'font-style' )
			};

			JetpackLikespostMessage( stylesData, window.frames[ 'likes-master' ] );

			JetpackLikesBatchHandler();

			jQuery( document ).on( 'inview', 'div.jetpack-likes-widget-unloaded', function() {
				jetpackLikesWidgetQueue.push( this.id );
			});
		});
	}

	if ( 'showLikeWidget' === event.event ) {
		jQuery( '#' + event.id + ' .post-likes-widget-placeholder'  ).fadeOut( 'fast', function() {
			jQuery( '#' + event.id + ' .post-likes-widget' ).fadeIn( 'fast', function() {
				JetpackLikespostMessage( { event: 'likeWidgetDisplayed', blog_id: event.blog_id, post_id: event.post_id, obj_id: event.obj_id }, window.frames['likes-master'] );
			});
		});
	}

	if ( 'clickReblogFlair' === event.event ) {
		wpcom_reblog.toggle_reblog_box_flair( event.obj_id );
	}

	if ( 'showOtherGravatars' === event.event ) {
		$container = jQuery( '#likes-other-gravatars' );
		$list = $container.find( 'ul' );

		$container.hide();
		$list.html( '' );

		$container.find( '.likes-text span' ).text( event.total );

		jQuery.each( event.likers, function( i, liker ) {
			var element = jQuery( '<li><a><img /></a></li>' );
			element.addClass( liker.css_class );

			element.find( 'a' ).
				attr({
					href: liker.profile_URL,
					rel: 'nofollow',
					target: '_parent'
				}).
				addClass( 'wpl-liker' );

			element.find( 'img' ).
				attr({
					src: liker.avatar_URL,
					alt: liker.name
				}).
				css({
					width: '30px',
					height: '30px',
					paddingRight: '3px'
				});

			$list.append( element );
		} );

		offset = jQuery( '[name=\'' + event.parent + '\']' ).offset();

		$container.css( 'left', offset.left + event.position.left - 10 + 'px' );
		$container.css( 'top', offset.top + event.position.top - 33 + 'px' );

		rowLength = Math.floor( event.width / 37 );
		height = ( Math.ceil( event.likers.length / rowLength ) * 37 ) + 13;
		if ( height > 204 ) {
			height = 204;
		}

		$container.css( 'height', height + 'px' );
		$container.css( 'width', rowLength * 37 - 7 + 'px' );

		$list.css( 'width', rowLength * 37 + 'px' );

		$container.fadeIn( 'slow' );

		scrollbarWidth = $list[0].offsetWidth - $list[0].clientWidth;
		if ( scrollbarWidth > 0 ) {
			$container.width( $container.width() + scrollbarWidth );
			$list.width( $list.width() + scrollbarWidth );
		}
	}
}

pm.bind( 'likesMessage', JetpackLikesMessageListener );

jQuery( document ).click( function( e ) {
	var $container = jQuery( '#likes-other-gravatars' );

	if ( $container.has( e.target ).length === 0 ) {
		$container.fadeOut( 'slow' );
	}
});

function JetpackLikesWidgetQueueHandler() {
	var $wrapper, wrapperID, found;
	if ( ! jetpackLikesMasterReady ) {
		setTimeout( JetpackLikesWidgetQueueHandler, 500 );
		return;
	}

	if ( jetpackLikesWidgetQueue.length > 0 ) {
		// We may have a widget that needs creating now
		found = false;
		while( jetpackLikesWidgetQueue.length > 0 ) {
			// Grab the first member of the queue that isn't already loading.
			wrapperID = jetpackLikesWidgetQueue.splice( 0, 1 )[0];
			if ( jQuery( '#' + wrapperID ).hasClass( 'jetpack-likes-widget-unloaded' ) ) {
				found = true;
				break;
			}
		}
		if ( ! found ) {
			setTimeout( JetpackLikesWidgetQueueHandler, 500 );
			return;
		}
	} else if ( jQuery( 'div.jetpack-likes-widget-unloaded' ).length > 0 ) {
		// Grab any unloaded widgets for a batch request
		JetpackLikesBatchHandler();

		// Get the next unloaded widget
		wrapperID = jQuery( 'div.jetpack-likes-widget-unloaded' ).first()[0].id;
		if ( ! wrapperID ) {
			// Everything is currently loaded
			setTimeout( JetpackLikesWidgetQueueHandler, 500 );
			return;
		}
	}

	if ( 'undefined' === typeof wrapperID ) {
		setTimeout( JetpackLikesWidgetQueueHandler, 500 );
		return;
	}

	$wrapper = jQuery( '#' + wrapperID );
	$wrapper.find( 'iframe' ).remove();

	if ( $wrapper.hasClass( 'slim-likes-widget' ) ) {
		$wrapper.find( '.post-likes-widget-placeholder' ).after( '<iframe class="post-likes-widget jetpack-likes-widget" name="' + $wrapper.data( 'name' ) + '" height="22px" width="68px" frameBorder="0" scrolling="no" src="' + $wrapper.data( 'src' ) + '"></iframe>' );
	} else {
		$wrapper.find( '.post-likes-widget-placeholder' ).after( '<iframe class="post-likes-widget jetpack-likes-widget" name="' + $wrapper.data( 'name' ) + '" height="55px" width="100%" frameBorder="0" src="' + $wrapper.data( 'src' ) + '"></iframe>' );
	}

	$wrapper.removeClass( 'jetpack-likes-widget-unloaded' ).addClass( 'jetpack-likes-widget-loading' );

	$wrapper.find( 'iframe' ).load( function( e ) {
		var $iframe = jQuery( e.target );
		$wrapper.removeClass( 'jetpack-likes-widget-loading' ).addClass( 'jetpack-likes-widget-loaded' );

		JetpackLikespostMessage( { event: 'loadLikeWidget', name: $iframe.attr( 'name' ), width: $iframe.width(), domain: window.location.hostname }, window.frames[ 'likes-master' ] );

		if ( $wrapper.hasClass( 'slim-likes-widget' ) ) {
			$wrapper.find( 'iframe' ).Jetpack( 'resizeable' );
		}
	});
	setTimeout( JetpackLikesWidgetQueueHandler, 250 );
}
JetpackLikesWidgetQueueHandler();
;
/*
 * Swipe 2.0
 *
 * Brad Birdsall
 * Copyright 2013, MIT License
 *
*/

function Swipe(container, options) {

  "use strict";

  // utilities
  var noop = function() {}; // simple no operation function
  var offloadFn = function(fn) { setTimeout(fn || noop, 0) }; // offload a functions execution
  
  // check browser capabilities
  var browser = {
    addEventListener: !!window.addEventListener,
    touch: ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch,
    transitions: (function(temp) {
      var props = ['transitionProperty', 'WebkitTransition', 'MozTransition', 'OTransition', 'msTransition'];
      for ( var i in props ) if (temp.style[ props[i] ] !== undefined) return true;
      return false;
    })(document.createElement('swipe'))
  };

  // quit if no root element
  if (!container) return;
  var element = container.children[0];
  var slides, slidePos, width, length;
  options = options || {};
  var index = parseInt(options.startSlide, 10) || 0;
  var speed = options.speed || 300;
  options.continuous = options.continuous !== undefined ? options.continuous : true;

  function setup() {

    // cache slides
    slides = element.children;
    length = slides.length;

    // set continuous to false if only one slide
    if (slides.length < 2) options.continuous = false;

    //special case if two slides
    if (browser.transitions && options.continuous && slides.length < 3) {
      element.appendChild(slides[0].cloneNode(true));
      element.appendChild(element.children[1].cloneNode(true));
      slides = element.children;
    }

    // create an array to store current positions of each slide
    slidePos = new Array(slides.length);

    // determine width of each slide
    width = container.getBoundingClientRect().width || container.offsetWidth;

    element.style.width = (slides.length * width) + 'px';

    // stack elements
    var pos = slides.length;
    while(pos--) {

      var slide = slides[pos];

      slide.style.width = width + 'px';
      slide.setAttribute('data-index', pos);

      if (browser.transitions) {
        slide.style.left = (pos * -width) + 'px';
        move(pos, index > pos ? -width : (index < pos ? width : 0), 0);
      }

    }

    // reposition elements before and after index
    if (options.continuous && browser.transitions) {
      move(circle(index-1), -width, 0);
      move(circle(index+1), width, 0);
    }

    if (!browser.transitions) element.style.left = (index * -width) + 'px';

    container.style.visibility = 'visible';

  }

  function prev() {

    if (options.continuous) slide(index-1);
    else if (index) slide(index-1);

  }

  function next() {

    if (options.continuous) slide(index+1);
    else if (index < slides.length - 1) slide(index+1);

  }

  function circle(index) {

    // a simple positive modulo using slides.length
    return (slides.length + (index % slides.length)) % slides.length;

  }

  function slide(to, slideSpeed) {

    // do nothing if already on requested slide
    if (index == to) return;
    
    if (browser.transitions) {

      var direction = Math.abs(index-to) / (index-to); // 1: backward, -1: forward

      // get the actual position of the slide
      if (options.continuous) {
        var natural_direction = direction;
        direction = -slidePos[circle(to)] / width;

        // if going forward but to < index, use to = slides.length + to
        // if going backward but to > index, use to = -slides.length + to
        if (direction !== natural_direction) to =  -direction * slides.length + to;

      }

      var diff = Math.abs(index-to) - 1;

      // move all the slides between index and to in the right direction
      while (diff--) move( circle((to > index ? to : index) - diff - 1), width * direction, 0);
            
      to = circle(to);

      move(index, width * direction, slideSpeed || speed);
      move(to, 0, slideSpeed || speed);

      if (options.continuous) move(circle(to - direction), -(width * direction), 0); // we need to get the next in place
      
    } else {     
      
      to = circle(to);
      animate(index * -width, to * -width, slideSpeed || speed);
      //no fallback for a circular continuous if the browser does not accept transitions
    }

    index = to;
    offloadFn(options.callback && options.callback(index, slides[index]));
  }

  function move(index, dist, speed) {

    translate(index, dist, speed);
    slidePos[index] = dist;

  }

  function translate(index, dist, speed) {

    var slide = slides[index];
    var style = slide && slide.style;

    if (!style) return;

    style.webkitTransitionDuration = 
    style.MozTransitionDuration = 
    style.msTransitionDuration = 
    style.OTransitionDuration = 
    style.transitionDuration = speed + 'ms';

    style.webkitTransform = 'translate(' + dist + 'px,0)' + 'translateZ(0)';
    style.msTransform = 
    style.MozTransform = 
    style.OTransform = 'translateX(' + dist + 'px)';

  }

  function animate(from, to, speed) {

    // if not an animation, just reposition
    if (!speed) {

      element.style.left = to + 'px';
      return;

    }
    
    var start = +new Date;
    
    var timer = setInterval(function() {

      var timeElap = +new Date - start;
      
      if (timeElap > speed) {

        element.style.left = to + 'px';

        if (delay) begin();

        options.transitionEnd && options.transitionEnd.call(event, index, slides[index]);

        clearInterval(timer);
        return;

      }

      element.style.left = (( (to - from) * (Math.floor((timeElap / speed) * 100) / 100) ) + from) + 'px';

    }, 4);

  }

  // setup auto slideshow
  var delay = options.auto || 0;
  var interval;

  function begin() {

    interval = setTimeout(next, delay);

  }

  function stop() {

    delay = 0;
    clearTimeout(interval);

  }


  // setup initial vars
  var start = {};
  var delta = {};
  var isScrolling;      

  // setup event capturing
  var events = {

    handleEvent: function(event) {

      switch (event.type) {
        case 'touchstart': this.start(event); break;
        case 'touchmove': this.move(event); break;
        case 'touchend': offloadFn(this.end(event)); break;
        case 'webkitTransitionEnd':
        case 'msTransitionEnd':
        case 'oTransitionEnd':
        case 'otransitionend':
        case 'transitionend': offloadFn(this.transitionEnd(event)); break;
        case 'resize': offloadFn(setup.call()); break;
      }

      if (options.stopPropagation) event.stopPropagation();

    },
    start: function(event) {

      var touches = event.touches[0];

      // measure start values
      start = {

        // get initial touch coords
        x: touches.pageX,
        y: touches.pageY,

        // store time to determine touch duration
        time: +new Date

      };
      
      // used for testing first move event
      isScrolling = undefined;

      // reset delta and end measurements
      delta = {};

      // attach touchmove and touchend listeners
      element.addEventListener('touchmove', this, false);
      element.addEventListener('touchend', this, false);

    },
    move: function(event) {

      // ensure swiping with one touch and not pinching
      if ( event.touches.length > 1 || event.scale && event.scale !== 1) return

      if (options.disableScroll) event.preventDefault();

      var touches = event.touches[0];

      // measure change in x and y
      delta = {
        x: touches.pageX - start.x,
        y: touches.pageY - start.y
      }

      // determine if scrolling test has run - one time test
      if ( typeof isScrolling == 'undefined') {
        isScrolling = !!( isScrolling || Math.abs(delta.x) < Math.abs(delta.y) );
      }

      // if user is not trying to scroll vertically
      if (!isScrolling) {

        // prevent native scrolling 
        event.preventDefault();

        // stop slideshow
        stop();

        // increase resistance if first or last slide
        if (options.continuous) { // we don't add resistance at the end

          translate(circle(index-1), delta.x + slidePos[circle(index-1)], 0);
          translate(index, delta.x + slidePos[index], 0);
          translate(circle(index+1), delta.x + slidePos[circle(index+1)], 0);

        } else {

          delta.x = 
            delta.x / 
              ( (!index && delta.x > 0               // if first slide and sliding left
                || index == slides.length - 1        // or if last slide and sliding right
                && delta.x < 0                       // and if sliding at all
              ) ?                      
              ( Math.abs(delta.x) / width + 1 )      // determine resistance level
              : 1 );                                 // no resistance if false
          
          // translate 1:1
          translate(index-1, delta.x + slidePos[index-1], 0);
          translate(index, delta.x + slidePos[index], 0);
          translate(index+1, delta.x + slidePos[index+1], 0);
        }

      }

    },
    end: function(event) {

      // measure duration
      var duration = +new Date - start.time;

      // determine if slide attempt triggers next/prev slide
      var isValidSlide = 
            Number(duration) < 250               // if slide duration is less than 250ms
            && Math.abs(delta.x) > 20            // and if slide amt is greater than 20px
            || Math.abs(delta.x) > width/2;      // or if slide amt is greater than half the width

      // determine if slide attempt is past start and end
      var isPastBounds = 
            !index && delta.x > 0                            // if first slide and slide amt is greater than 0
            || index == slides.length - 1 && delta.x < 0;    // or if last slide and slide amt is less than 0

      if (options.continuous) isPastBounds = false;
      
      // determine direction of swipe (true:right, false:left)
      var direction = delta.x < 0;

      // if not scrolling vertically
      if (!isScrolling) {

        if (isValidSlide && !isPastBounds) {

          if (direction) {

            if (options.continuous) { // we need to get the next in this direction in place

              move(circle(index-1), -width, 0);
              move(circle(index+2), width, 0);

            } else {
              move(index-1, -width, 0);
            }

            move(index, slidePos[index]-width, speed);
            move(circle(index+1), slidePos[circle(index+1)]-width, speed);
            index = circle(index+1);  
                      
          } else {
            if (options.continuous) { // we need to get the next in this direction in place

              move(circle(index+1), width, 0);
              move(circle(index-2), -width, 0);

            } else {
              move(index+1, width, 0);
            }

            move(index, slidePos[index]+width, speed);
            move(circle(index-1), slidePos[circle(index-1)]+width, speed);
            index = circle(index-1);

          }

          options.callback && options.callback(index, slides[index]);

        } else {

          if (options.continuous) {

            move(circle(index-1), -width, speed);
            move(index, 0, speed);
            move(circle(index+1), width, speed);

          } else {

            move(index-1, -width, speed);
            move(index, 0, speed);
            move(index+1, width, speed);
          }

        }

      }

      // kill touchmove and touchend event listeners until touchstart called again
      element.removeEventListener('touchmove', events, false)
      element.removeEventListener('touchend', events, false)

    },
    transitionEnd: function(event) {

      if (parseInt(event.target.getAttribute('data-index'), 10) == index) {
        
        if (delay) begin();

        options.transitionEnd && options.transitionEnd.call(event, index, slides[index]);

      }

    }

  }

  // trigger setup
  setup();

  // start auto slideshow if applicable
  if (delay) begin();


  // add event listeners
  if (browser.addEventListener) {
    
    // set touchstart event on element    
    if (browser.touch) element.addEventListener('touchstart', events, false);

    if (browser.transitions) {
      element.addEventListener('webkitTransitionEnd', events, false);
      element.addEventListener('msTransitionEnd', events, false);
      element.addEventListener('oTransitionEnd', events, false);
      element.addEventListener('otransitionend', events, false);
      element.addEventListener('transitionend', events, false);
    }

    // set resize event on window
    window.addEventListener('resize', events, false);

  } else {

    window.onresize = function () { setup() }; // to play nice with old IE

  }

  // expose the Swipe API
  return {
    setup: function() {

      setup();

    },
    slide: function(to, speed) {
      
      // cancel slideshow
      stop();
      
      slide(to, speed);

    },
    prev: function() {

      // cancel slideshow
      stop();

      prev();

    },
    next: function() {

      // cancel slideshow
      stop();

      next();

    },
    getPos: function() {

      // return current index position
      return index;

    },
    getNumSlides: function() {
      
      // return total number of slides
      return length;
    },
    kill: function() {

      // cancel slideshow
      stop();

      // reset element
      element.style.width = 'auto';
      element.style.left = 0;

      // reset slides
      var pos = slides.length;
      while(pos--) {

        var slide = slides[pos];
        slide.style.width = '100%';
        slide.style.left = 0;

        if (browser.transitions) translate(pos, 0, 0);

      }

      // removed event listeners
      if (browser.addEventListener) {

        // remove current event listeners
        element.removeEventListener('touchstart', events, false);
        element.removeEventListener('webkitTransitionEnd', events, false);
        element.removeEventListener('msTransitionEnd', events, false);
        element.removeEventListener('oTransitionEnd', events, false);
        element.removeEventListener('otransitionend', events, false);
        element.removeEventListener('transitionend', events, false);
        window.removeEventListener('resize', events, false);

      }
      else {

        window.onresize = null;

      }

    }
  }

}


if ( window.jQuery || window.Zepto ) {
  (function($) {
    $.fn.Swipe = function(params) {
      return this.each(function() {
        $(this).data('Swipe', new Swipe($(this)[0], params));
      });
    }
  })( window.jQuery || window.Zepto )
}
;
/**
 * Comment Likes - JavaScript
 *
 * This handles liking and unliking comments, as well as viewing who has
 * liked a particular comment.
 *
 * @dependency  jQuery
 * @dependency  Swipe
 *
 * @package     Comment_Likes
 * @subpackage  JavaScript
 */
jQuery( function() {
	var $ = jQuery;
	var extWin;
	var extWinCheck;
	var commentLikeEvent;

	// The O2 theme re-injects this script into the DOM when somebody
	// creates a new thread and the page is already open, but we don't
	// want to run this script a second time.
	if ( window.comment_likes_loaded ) return;
	window.comment_likes_loaded = true;

	// Client-side cache of who liked a particular comment to avoid
	// having to hit the server multiple times for the same data.
	var comment_like_cache = {};

	/**
	 * Parse the comment ID from a comment like link.
	 */
	var get_comment_id = function( $link ) {
		var comment_id = $link.attr( 'href' ).split( 'like_comment=' );
		return comment_id[1].split( '&_wpnonce=' )[0];
	};

	/**
	 * Handle an ajax action on the comment like link.
	 */
	var handle_link_action = function( $link, action, comment_id, callback ) {
		var nonce = $link.attr( 'href' ).split( '_wpnonce=' )[1];

		$.post( '/wp-admin/admin-ajax.php', {
			'action': action,
			'_wpnonce': nonce,
			'like_comment': comment_id,
			'blog_id': Number( $link.data( 'blog' ) )
		}, callback, 'json' );
	};

	// Overlay used for displaying comment like info.
	var overlay = {

		// Overlay element.
		$el: $( '<div/>' )
			.appendTo( 'body' )
			.addClass( 'comment-likes-overlay' )
			.hide()
			.mouseenter( function() {
				// Don't hide the overlay if the user is mousing over it.
				overlay.cancel_hide();
			} ).mouseleave( function() {
				overlay.request_hide();
			} ),

		// Inner contents of overlay.
		$inner: null,

		// Instance of the Swipe library.
		swipe: null,

		// Initialise the overlay for use, removing any old content.
		clear: function() {
			// Unload any previous instance of Swipe (to avoid leaking a global
			// event handler). This is done before clearing the contents of the
			// overlay because Swipe expects the slides to still be present.
			if ( this.swipe ) {
				this.swipe.kill();
				this.swipe = null;
			}
			this.$el.html( '' );
			this.$inner = $( '<div/>' ).addClass( 'inner' ).appendTo( this.$el );
		},

		/**
		 * Construct a list (<ul>) of user (gravatar, name) details.
		 *
		 * @param  data     liker data returned from the server
		 * @param  klass    CSS class to apply to the <ul> element
		 * @param  start    index of user to start at
		 * @param  length   number of users to include in the list
		 *
		 * @return          HTML for the list
		 */
		get_user_bits: function( data, klass, start, length ) {
			start = start || 0;
			var last = start + ( length || data.length );
			last = ( last > data.length ) ? data.length : last;
			var html = '<div class="liker-list"><ul class="' + ( klass || '' ) + '">';
			for ( var i = start; i < last; ++i ) {
				var user = data[ i ];
				html += '<li>';
				html += '<a rel="nofollow" title="' + user.display_name_esc + '" href="' + user.profile_url_esc + '"><img src="' + user.avatar_url_esc + '" alt="' + user.display_name_esc + '"  /> <span class="user-name">' + user.display_name_esc + '</span></a>';
				html += '</li>';
			}
			html += '</ul></div>';
			return html;
		},

		/**
		 * Render the display of who has liked this comment. The type of
		 * display depends on how many people have liked the comment.
		 * If more than 10 people have liked the comment, this function
		 * renders navigation controls and sets up the Swipe library for
		 * changing between pages.
		 *
		 * @param link  the element over which the user is hovering
		 * @param data  the results retrieved from the server
		 */
		show_likes: function( $link, data ) {
			this.clear();

			$link.data( 'likeCount', data.length );
			if ( 0 === data.length ) {
				// No likers after all.
				return this.$el.hide();
			}

			this.$inner.css( 'padding', 12 );

			if ( data.length < 6 ) {
				// Only one column needed.
				this.$inner.css( 'max-width', 200 );
				this.$inner.html( this.get_user_bits( data, 'single' ) );

			} else if ( data.length < 11 ) {
				// Two columns, but only one page.
				this.$inner.html( this.get_user_bits( data, 'double' ) );

			} else {
				// Multiple pages.
				this.render_likes_with_pagination( data );
			}

			// Move the overlay into the correct position and then show it.
			this.set_position( $link );
		},

		/**
		 * Render multiple pages of likes with pagination controls.
		 * This function is intended to be called by `show_likes` above.
		 *
		 * @param data  the results retrieved from the server
		 */
		render_likes_with_pagination: function( data ) {
			var page_count = Math.ceil( data.length / 10 );
			// Swipe requires two nested containers.
			var $swipe = $( '<div/>' ).addClass( 'swipe' ).appendTo( this.$inner );
			var $div = $( '<div/>' ).addClass( 'swipe-wrap' ).appendTo( $swipe );
			for ( var i = 0; i < page_count; ++i ) {
				$( this.get_user_bits( data, 'double', i * 10, 10 ) ).appendTo( $div );
			}

			/** Navigation controls.
			 *  This is based on the Newdash controls found in
			 *    reader/recommendations-templates.php
			 */
			var nav_html = '<nav class="slider-nav"><a href="#" class="prev"><span class="noticon noticon-previous" title="Previous" alt="<"></span></a><span class="position">';
			for ( var i = 0; i < page_count; ++i ) {
				nav_html += '<em data-page="' + i + '" class="' + ( ( i === 0 ) ? 'on' : '' ) + '">&bull;</em>';
			}
			nav_html += '</span><a href="#" class="next"><span class="noticon noticon-next" title="Next" alt=">"></span></a></nav>';
			var $nav = $( nav_html ).appendTo( this.$inner );

			/** Set up Swipe. **/

			// Swipe cannot be set up successfully unless its container
			// is visible, so we show it now.
			this.$el.show();

			var swipe = this.swipe = new Swipe( $swipe[0], {
				callback: function( pos ) {
					// Update the pagination indicators.
					//
					// If there are exactly two pages, Swipe has a weird
					// special case where it duplicates both pages and
					// can return index 2 and 3 even though those aren't
					// real pages (see swipe.js, line 47). To deal with
					// this, we use the expression `pos % page_count`.
					pos = pos % page_count;
					$nav.find( 'em' ).each( function() {
						var page = Number( $( this ).data( 'page' ) );
						$( this ).attr( 'class', ( pos === page ) ? 'on' : '' );
					} );
				}
			} );
			$nav.find( 'em' ).on( 'click', function( $e ) {
				// Go to the page corresponding to the indicator clicked.
				swipe.slide( Number( $( this ).data( 'page' ) ) );
				$e.preventDefault();
			} );
			// Previous and next buttons.
			$nav.find( '.prev' ).on( 'click', function( $e ) {
				swipe.prev();
				$e.preventDefault();
			} );
			$nav.find( '.next' ).on( 'click', function( $e ) {
				swipe.next();
				$e.preventDefault();
			} );
		},

		/**
		 * Open the overlay and show a loading message.
		 */
		show_loading_message: function( $link ) {
			this.clear();
			this.$inner.text( comment_like_text.loading );
			this.set_position( $link );
		},

		/**
		 * Position the overlay near the current comment.
		 *
		 * @param $link  element near which to position the overlay
		 */
		set_position: function( $link ) {
			// Prepare a down arrow icon for the bottom of the overlay.
			var $icon = $( '<span/>' )
				.appendTo( this.$el )
				.addClass( 'icon noticon noticon-downarrow' )
				.css( 'text-shadow', '0px 1px 1px rgb(223, 223, 223)' );

			var offset = $link.offset();
			var left = offset.left - ( this.$el.width() - $link.width() ) / 2;
			left = left < 5 ? 5 : left;
			var top = offset.top - this.$el.height() + 5;

			// Check if the overlay would appear off the screen.
			if ( top < ( $( window ).scrollTop() + ( $( '#wpadminbar' ).height() || 0 ) ) ) {
				// We'll display the overlay beneath the link instead.
				top = offset.top + $link.height();
				// Instead of using the down arrow icon, use an up arrow.
				$icon.remove().prependTo( this.$el )
					.removeClass( 'noticon-downarrow')
					.addClass( 'noticon-uparrow' )
					.css( {
						'text-shadow': '0px -1px 1px rgb(223, 223, 223)',
						'vertical-align': 'bottom'
					} );
			}

			this.$el.css( { 'left': left, 'top': top } ).show();

			$icon.css( {
				// The height of the arrow icon differs slightly between browsers,
				// so we compute the margin here to make sure it isn't disjointed
				// from the overlay.
				'margin-top': $icon[0].scrollHeight - 26,
				'margin-bottom': 20 - $icon[0].scrollHeight,

				// Position the arrow to be horizontally centred on the link.
				'padding-left': offset.left - left + ( $link.width() - $icon[0].scrollWidth ) / 2
			} );
		},

		/**
		 * Return whether the overlay is visible.
		 */
		is_visible: function() {
			return ( 'none' !== this.$el.css( 'display' ) );
		},

		// Timeout used for hiding the overlay.
		hide_timeout: null,

		/**
		 * Request that the overlay be hidden after a short delay.
		 */
		request_hide: function() {
			if ( null !== this.hide_timeout ) {
				return;
			}
			var self = this;
			this.hide_timeout = setTimeout( function() {
				self.$el.hide();
				self.clear();
			}, 300 );
		},

		/**
		 * Cancel a request to hide the overlay.
		 */
		cancel_hide: function() {
			if ( null !== this.hide_timeout ) {
				clearTimeout( this.hide_timeout );
				this.hide_timeout = null;
			}
		}
	};

	// The most recent comment for which the user has requested to see
	// who liked it.
	var relevant_comment;

	// Precache after this timeout.
	var precache_timeout = null;

	/**
	 * Fetch the like data for a particular comment.
	 */
	var fetch_like_data = function( $link, comment_id ) {
		comment_like_cache[ comment_id ] = null;

		var $star = $link.parent().parent().find( 'a.comment-like-link' );
		handle_link_action( $star, 'view_comment_likes', comment_id, function( data ) {
			// Populate the cache.
			comment_like_cache[ comment_id ] = data;

			// Only show the overlay if the user is interested.
			if ( overlay.is_visible() && ( relevant_comment === comment_id ) ) {
				overlay.show_likes( $link, data );
			}
		} );
	};

	function readCookie( c ) {
		var nameEQ = c + '=',
			cookieStrings = document.cookie.split( ';' ),
			i, cookieString, num, chunk, pairs, pair, cookie_data;
		for ( i = 0; i < cookieStrings.length; i++ ) {
			cookieString = cookieStrings[ i ];
			while ( cookieString.charAt( 0 ) === ' ' ) {
				cookieString = cookieString.substring( 1, cookieString.length );
			}
			if ( cookieString.indexOf( nameEQ ) === 0 ) {
				chunk = cookieString.substring( nameEQ.length, cookieString.length );
				pairs = chunk.split( '&' );
				cookie_data = {};
				for ( num = pairs.length - 1; num >= 0; num-- ) {
					pair = pairs[ num ].split( '=' );
					cookie_data[ pair[0] ] = decodeURIComponent( pair[1] );
				}
				return cookie_data;
			}
		}
		return null;
	}

	function getServiceData() {
		var data = readCookie( 'wpc_wpc' );
		if ( null === data || 'undefined' === typeof data.access_token || ! data.access_token ) {
			return false;
		}
		return data;
	}

	function readMessage( event ) {
		if ( 'undefined' == typeof event.event ) {
			return;
		}

		if ( 'login' == event.event && event.success ) {
			extWinCheck = setInterval( function() {
				if ( ! extWin || extWin.closed ) {
					clearInterval( extWinCheck );
					if ( getServiceData() ) {

						// Load page in an iframe to get the current comment nonce
						var nonceIframe = document.createElement( 'iframe' );
						nonceIframe.id = 'wp-login-comment-nonce-iframe';
						nonceIframe.style.display = 'none';
						nonceIframe.src = commentLikeEvent + '';
						document.body.appendChild( nonceIframe );

						var commentLikeId = ( commentLikeEvent + '' ).split( 'like_comment=' )[1].split( '&_wpnonce=' )[0];
						var c = false;

						// Set a 5 second timeout to redirect to the comment page without doing the Like as a fallback
						var commentLikeTimeout = setTimeout( function() {
							window.location = commentLikeEvent;
						}, 5000 );

						// Check for a new nonced redirect and use that if available before timing out
						var commentLikeCheck = setInterval( function() {
							c = $( '#wp-login-comment-nonce-iframe' ).contents().find( '#comment-like-' + commentLikeId + ' .comment-like-link' );
							if ( 'undefined' !== typeof c && 'undefined' !== typeof c[0] && 'undefined' !== typeof c[0].href ) {
								clearTimeout( commentLikeTimeout );
								clearInterval( commentLikeCheck );
								window.location = c[0].href;
							}
						}, 100 );
					}
				}
			}, 100 );

			if ( extWin ) {
				if ( ! extWin.closed ) {
					extWin.close();
				}
				extWin = false;
			}

			$( '#wp-login-polling-iframe' ).remove();
		}
	}

	if ( 'undefined' != typeof window.pm ) {
		pm.bind( 'loginMessage', function( e ) { readMessage( e ); } );
	}

	$( 'body' ).on( 'click', 'a.comment-like-link', function( $e ) {
		if ( $( $e.target ).hasClass( 'needs-login' ) ) {
			$e.preventDefault();
			commentLikeEvent = $e.target;
			if ( extWin ) {
				if ( ! extWin.closed ) {
					extWin.close();
				}
				extWin = false;
			}

			$( '#wp-login-polling-iframe' ).remove();

			var url = 'https://wordpress.com/public.api/connect/?action=request&service=wordpress';
			extWin = window.open( url, 'likeconn', 'status=0,toolbar=0,location=1,menubar=0,directories=0,resizable=1,scrollbars=1,height=560,width=500' );

			// Append cookie polling login iframe to this window to wait for user to finish logging in (or cancel)
			var loginIframe = $( "<iframe id='wp-login-polling-iframe'></iframe>" );
			loginIframe.attr( "src", "https://wordpress.com/public.api/connect/?iframe=true" );
			loginIframe.css( "display", "none" );
			$( document.body ).append( loginIframe );

			return false;
		}

		// Record that the user likes or does not like this comment.
		var $star = $( this );
		var comment_id = get_comment_id( $star );
		$star.addClass( 'loading' );
		// Determine whether to like or unlike based on whether the comment is
		// currently liked.
		var action = ( $( 'p#comment-like-' + comment_id ).data( 'liked' ) === 'comment-liked' ) ? 'unlike_comment' : 'like_comment';
		handle_link_action( $star, action, comment_id, function( data ) {
			// Invalidate the like cache for this comment.
			delete comment_like_cache[ comment_id ];

			$( '#comment-like-count-' + data.context ).html( data.display );

			if ( 'like_comment' === action ) {
				$( 'p#comment-like-' + data.context ).removeClass( 'comment-not-liked' )
					.addClass( 'comment-liked' )
					.data( 'liked', 'comment-liked' );
			} else {
				$( 'p#comment-like-' + data.context ).removeClass( 'comment-liked' )
					.addClass( 'comment-not-liked' )
					.data( 'liked', 'comment-not-liked' );
			}

			// Prefetch new data for this comment (if there are likers left).
			var $link = $star.parent().find( 'a.view-likers' );
			if ( 0 !== $link.length ) {
				fetch_like_data( $link, comment_id );
			}

			$star.removeClass( 'loading' );
		} );
		$e.preventDefault();
		$e.stopPropagation();

	} ).on( 'click', 'p.comment-not-liked', function() {
		// When a comment hasn't been liked, make the text clickable, too
		$( this ).find( 'a.comment-like-link' ).click();

	} ).on( 'mouseenter', 'p.comment-likes a.view-likers', function() {
		// Show the user a list of who has liked this comment.

		var $link = $( this );
		if ( 0 === Number( $link.data( 'likeCount' ) || 0 ) ) {
			// No one has liked this comment.
			return;
		}

		// Don't hide the overlay.
		overlay.cancel_hide();

		// Get the comment ID.
		var $star = $link.parent().parent().find( 'a.comment-like-link' );
		var comment_id = relevant_comment = get_comment_id( $star );

		// Check if the list of likes for this comment is already in
		// the cache.
		if ( comment_id in comment_like_cache ) {
			var entry = comment_like_cache[ comment_id ];
			// Only display the likes if the ajax request is
			// actually done.
			if ( null !== entry ) {
				overlay.show_likes( $link, entry );
			} else {
				// Make sure the overlay is visible (in case
				// the user moved the mouse away while loading
				// but then came back before it finished
				// loading).
				overlay.show_loading_message( $link );
			}
			return;
		}

		// Position the "Loading..." overlay.
		overlay.show_loading_message( $link );

		// Fetch the data.
		fetch_like_data( $link, comment_id );

	} ).on( 'mouseleave', 'p.comment-likes a.view-likers', function() {
		// User has moved cursor away - hide the overlay.
		overlay.request_hide();

	} ).on( 'click', 'p.comment-likes a.view-likers', function( $e ) {
		// Don't do anything when clicking on the text.
		$e.preventDefault();

	} ).on( 'mouseenter', '.comment:has(a.comment-like-link)', function() {
		// User is moving over a comment - precache the comment like data.
		if ( null !== precache_timeout ) {
			clearTimeout( precache_timeout );
			precache_timeout = null;
		}

		var $star = $( this ).find( 'a.comment-like-link' );
		var $link = $star.parent().find( 'a.view-likers' );
		if ( 0 === Number( $link.data( 'likeCount' ) || 0 ) ) {
			// No likes.
			return;
		}
		var comment_id = get_comment_id( $star );
		if ( comment_id in comment_like_cache ) {
			// Already in cache.
			return;
		}

		precache_timeout = setTimeout( function() {
			precache_timeout = null;
			if ( comment_id in comment_like_cache ) {
				// Was cached in the interim.
				return;
			}
			fetch_like_data( $link, comment_id );
		}, 1000 );
	} );
} );
;
/*! Backstretch - v2.0.4 - 2013-06-19
* http://srobbin.com/jquery-plugins/backstretch/
* Copyright (c) 2013 Scott Robbin; Licensed MIT */

;(function ($, window, undefined) {
	'use strict';

	/* PLUGIN DEFINITION
	 * ========================= */

	$.fn.backstretch = function (images, options) {
		// We need at least one image or method name
		if (images === undefined || images.length === 0) {
			$.error("No images were supplied for Backstretch");
		}

		/*
		 * Scroll the page one pixel to get the right window height on iOS
		 * Pretty harmless for everyone else
		*/
		if ($(window).scrollTop() === 0 ) {
			window.scrollTo(0, 0);
		}

		return this.each(function () {
			var $this = $(this)
				, obj = $this.data('backstretch');

			// Do we already have an instance attached to this element?
			if (obj) {

				// Is this a method they're trying to execute?
				if (typeof images == 'string' && typeof obj[images] == 'function') {
					// Call the method
					obj[images](options);

					// No need to do anything further
					return;
				}

				// Merge the old options with the new
				options = $.extend(obj.options, options);

				// Remove the old instance
				obj.destroy(true);
			}

			obj = new Backstretch(this, images, options);
			$this.data('backstretch', obj);
		});
	};

	// If no element is supplied, we'll attach to body
	$.backstretch = function (images, options) {
		// Return the instance
		return $('body')
					.backstretch(images, options)
					.data('backstretch');
	};

	// Custom selector
	$.expr[':'].backstretch = function(elem) {
		return $(elem).data('backstretch') !== undefined;
	};

	/* DEFAULTS
	 * ========================= */

	$.fn.backstretch.defaults = {
		centeredX: true	 // Should we center the image on the X axis?
		, centeredY: true	 // Should we center the image on the Y axis?
		, duration: 5000		// Amount of time in between slides (if slideshow)
		, fade: 0					 // Speed of fade transition between slides
	};

	/* STYLES
	 *
	 * Baked-in styles that we'll apply to our elements.
	 * In an effort to keep the plugin simple, these are not exposed as options.
	 * That said, anyone can override these in their own stylesheet.
	 * ========================= */
	var styles = {
		wrap: {
			left: 0
			, top: 0
			, overflow: 'hidden'
			, margin: 0
			, padding: 0
			, height: '100%'
			, width: '100%'
			, zIndex: -999999
		}
		, img: {
			position: 'absolute'
			, display: 'none'
			, margin: 0
			, padding: 0
			, border: 'none'
			, width: 'auto'
			, height: 'auto'
			, maxHeight: 'none'
			, maxWidth: 'none'
			, zIndex: -999999
		}
	};

	/* CLASS DEFINITION
	 * ========================= */
	var Backstretch = function (container, images, options) {
		this.options = $.extend({}, $.fn.backstretch.defaults, options || {});

		/* In its simplest form, we allow Backstretch to be called on an image path.
		 * e.g. $.backstretch('/path/to/image.jpg')
		 * So, we need to turn this back into an array.
		 */
		this.images = $.isArray(images) ? images : [images];

		// Preload images
		$.each(this.images, function () {
			$('<img />')[0].src = this;
		});

		// Convenience reference to know if the container is body.
		this.isBody = container === document.body;

		/* We're keeping track of a few different elements
		 *
		 * Container: the element that Backstretch was called on.
		 * Wrap: a DIV that we place the image into, so we can hide the overflow.
		 * Root: Convenience reference to help calculate the correct height.
		 */
		this.$container = $(container);
		this.$root = this.isBody ? supportsFixedPosition ? $(window) : $(document) : this.$container;

		// Don't create a new wrap if one already exists (from a previous instance of Backstretch)
		var $existing = this.$container.children(".backstretch").first();
		this.$wrap = $existing.length ? $existing : $('<div class="backstretch"></div>').css(styles.wrap).appendTo(this.$container);

		// Non-body elements need some style adjustments
		if (!this.isBody) {
			// If the container is statically positioned, we need to make it relative,
			// and if no zIndex is defined, we should set it to zero.
			var position = this.$container.css('position')
				, zIndex = this.$container.css('zIndex');

			this.$container.css({
				position: position === 'static' ? 'relative' : position
				, zIndex: zIndex === 'auto' ? 0 : zIndex
				, background: 'none'
			});

			// Needs a higher z-index
			this.$wrap.css({zIndex: -999998});
		}

		// Fixed or absolute positioning?
		this.$wrap.css({
			position: this.isBody && supportsFixedPosition ? 'fixed' : 'absolute'
		});

		// Set the first image
		this.index = 0;
		this.show(this.index);

		// Listen for resize
		$(window).on('resize.backstretch', $.proxy(this.resize, this))
				.on('orientationchange.backstretch', $.proxy(function () {
						// Need to do this in order to get the right window height
						if (this.isBody && window.pageYOffset === 0) {
							window.scrollTo(0, 1);
							this.resize();
						}
				}, this));
	};

	/* PUBLIC METHODS
	 * ========================= */
	Backstretch.prototype = {
		resize: function () {
			try {
				var bgCSS = {left: 0, top: 0}
					, rootWidth = this.isBody ? this.$root.width() : this.$root.innerWidth()
					, bgWidth = rootWidth
					, rootHeight = this.isBody ? ( window.innerHeight ? window.innerHeight : this.$root.height() ) : this.$root.innerHeight()
					, bgHeight = bgWidth / this.$img.data('ratio')
					, bgOffset;

					// Make adjustments based on image ratio
					if (bgHeight >= rootHeight) {
							bgOffset = (bgHeight - rootHeight) / 2;
							if(this.options.centeredY) {
								bgCSS.top = '-' + bgOffset + 'px';
							}
					} else {
							bgHeight = rootHeight;
							bgWidth = bgHeight * this.$img.data('ratio');
							bgOffset = (bgWidth - rootWidth) / 2;
							if(this.options.centeredX) {
								bgCSS.left = '-' + bgOffset + 'px';
							}
					}

					this.$wrap.css({width: rootWidth, height: rootHeight})
										.find('img:not(.deleteable)').css({width: bgWidth, height: bgHeight}).css(bgCSS);
			} catch(err) {
					// IE7 seems to trigger resize before the image is loaded.
					// This try/catch block is a hack to let it fail gracefully.
			}

			return this;
		}

		// Show the slide at a certain position
		, show: function (newIndex) {

			// Validate index
			if (Math.abs(newIndex) > this.images.length - 1) {
				return;
			}

			// Vars
			var self = this
				, oldImage = self.$wrap.find('img').addClass('deleteable')
				, evtOptions = { relatedTarget: self.$container[0] };

			// Trigger the "before" event
			self.$container.trigger($.Event('backstretch.before', evtOptions), [self, newIndex]);

			// Set the new index
			this.index = newIndex;

			// Pause the slideshow
			clearInterval(self.interval);

			// New image
			self.$img = $('<img />')
				.css(styles.img)
				.bind('load', function (e) {
					var imgWidth = this.width || $(e.target).width()
						, imgHeight = this.height || $(e.target).height();

					// Save the ratio
					$(this).data('ratio', imgWidth / imgHeight);

					// Show the image, then delete the old one
					// "speed" option has been deprecated, but we want backwards compatibilty
					$(this).fadeIn(self.options.speed || self.options.fade, function () {
						oldImage.remove();

						// Resume the slideshow
						if (!self.paused) {
							self.cycle();
						}

						// Trigger the "after" and "show" events
						// "show" is being deprecated
						$(['after', 'show']).each(function () {
							self.$container.trigger($.Event('backstretch.' + this, evtOptions), [self, newIndex]);
						});
					});

					// Resize
					self.resize();
				})
				.appendTo(self.$wrap);

			// Hack for IE img onload event
			self.$img.attr('src', self.images[newIndex]);
			return self;
		}

		, next: function () {
			// Next slide
			return this.show(this.index < this.images.length - 1 ? this.index + 1 : 0);
		}

		, prev: function () {
			// Previous slide
			return this.show(this.index === 0 ? this.images.length - 1 : this.index - 1);
		}

		, pause: function () {
			// Pause the slideshow
			this.paused = true;
			return this;
		}

		, resume: function () {
			// Resume the slideshow
			this.paused = false;
			this.next();
			return this;
		}

		, cycle: function () {
			// Start/resume the slideshow
			if(this.images.length > 1) {
				// Clear the interval, just in case
				clearInterval(this.interval);

				this.interval = setInterval($.proxy(function () {
					// Check for paused slideshow
					if (!this.paused) {
						this.next();
					}
				}, this), this.options.duration);
			}
			return this;
		}

		, destroy: function (preserveBackground) {
			// Stop the resize events
			$(window).off('resize.backstretch orientationchange.backstretch');

			// Clear the interval
			clearInterval(this.interval);

			// Remove Backstretch
			if(!preserveBackground) {
				this.$wrap.remove();
			}
			this.$container.removeData('backstretch');
		}
	};

	/* SUPPORTS FIXED POSITION?
	 *
	 * Based on code from jQuery Mobile 1.1.0
	 * http://jquerymobile.com/
	 *
	 * In a nutshell, we need to figure out if fixed positioning is supported.
	 * Unfortunately, this is very difficult to do on iOS, and usually involves
	 * injecting content, scrolling the page, etc.. It's ugly.
	 * jQuery Mobile uses this workaround. It's not ideal, but works.
	 *
	 * Modified to detect IE6
	 * ========================= */

	var supportsFixedPosition = (function () {
		var ua = navigator.userAgent
			, platform = navigator.platform
				// Rendering engine is Webkit, and capture major version
			, wkmatch = ua.match( /AppleWebKit\/([0-9]+)/ )
			, wkversion = !!wkmatch && wkmatch[ 1 ]
			, ffmatch = ua.match( /Fennec\/([0-9]+)/ )
			, ffversion = !!ffmatch && ffmatch[ 1 ]
			, operammobilematch = ua.match( /Opera Mobi\/([0-9]+)/ )
			, omversion = !!operammobilematch && operammobilematch[ 1 ]
			, iematch = ua.match( /MSIE ([0-9]+)/ )
			, ieversion = !!iematch && iematch[ 1 ];

		return !(
			// iOS 4.3 and older : Platform is iPhone/Pad/Touch and Webkit version is less than 534 (ios5)
			((platform.indexOf( "iPhone" ) > -1 || platform.indexOf( "iPad" ) > -1	|| platform.indexOf( "iPod" ) > -1 ) && wkversion && wkversion < 534) ||

			// Opera Mini
			(window.operamini && ({}).toString.call( window.operamini ) === "[object OperaMini]") ||
			(operammobilematch && omversion < 7458) ||

			//Android lte 2.1: Platform is Android and Webkit version is less than 533 (Android 2.2)
			(ua.indexOf( "Android" ) > -1 && wkversion && wkversion < 533) ||

			// Firefox Mobile before 6.0 -
			(ffversion && ffversion < 6) ||

			// WebOS less than 3
			("palmGetResource" in window && wkversion && wkversion < 534) ||

			// MeeGo
			(ua.indexOf( "MeeGo" ) > -1 && ua.indexOf( "NokiaBrowser/8.5.0" ) > -1) ||

			// IE6
			(ieversion && ieversion <= 6)
		);
	}());

}(jQuery, window));
;
/**
 * Eighties JavaScript
 *
 * The main JavaScript file for Eighties. Sets up
 * the navigation and sidebar toggles and footer
 * widget area layout.
*/
( function( $ ) {

	/**
	 * If we've made it this far, JavaScript is working.
	 * We should set the main navigation css to display
	 * block. Don't worry, if JavaScript is not working
	 * the menu is handled a bit differently, as the
	 * toggle functionality would not work anyway.
	*/
	$( '#site-navigation, #secondary' ).css( 'display', 'block' );

	/**
	 * Set up the main navigation toggle. This sets
	 * up a toggle for navitaion to overlay the window.
	*/
	$( '.main-navigation-toggle, #mobile-menu-close' ).on( 'click', function( event ) {
		event.preventDefault();

		$( 'html' ).toggleClass( 'disable-scroll' );
		$( 'body' ).toggleClass( 'main-navigation-open' );
	});

	/**
	 * Set up the widget area toggle. This sets
	 * up a toggle for sidebar to overlay the window.
	*/
	$( '.widget-area-toggle' ).on( 'click', function( event ) {
		event.preventDefault();

		$( 'html' ).toggleClass( 'disable-scroll' );
		$( 'body' ).toggleClass( 'widget-area-open' );
		$( '#secondary' ).trigger( 'resize' );
	});

	/**
	 * Closes the main navigation or sidebar when
	 * the esc key is pressed.
	*/
	$( document ).keyup( function( event ) {
		if ( event.keyCode == 27 ) {
			if ( $( 'body' ).hasClass( 'main-navigation-open' ) ) {
				$( 'html' ).removeClass( 'disable-scroll' );
				$( 'body' ).removeClass( 'main-navigation-open' );
			} else if ( $( 'body' ).hasClass( 'widget-area-open' ) ) {
				$( 'html' ).removeClass( 'disable-scroll' );
				$( 'body' ).removeClass( 'widget-area-open' );
			}
		}
	});

	/**
	 * Set up the footer widget area. This sets
	 * up the columns based upon how many widget areas
	 * are currently active.
	*/
	var columnCount = $( '.widget-area' ).children( '.column' ).length;

	if ( $( '.site-footer' ).has( '.widget-area' ) ) {
		$( '.widget-area' ).addClass( 'column' + columnCount.toString( 10 ) );
		$( '.widget-area' ).trigger( 'resize' );
	}

	/**
	 * Change and adjust menu and sticky post
	 * background styles based on custom-background
	 * style values.
	*/
	if ( $( 'body' ).hasClass( 'has-custom-background' ) ) {
		var customStyles = $( 'body.custom-background' ).css( [
			'background-attachment',
			'background-color',
			'background-image',
			'background-position',
			'background-repeat'
		] );

		$( '#site-navigation, #secondary, #colophon, .sticky' ).css( customStyles );
	}
} )( jQuery );
;
( function() {
	var is_webkit = navigator.userAgent.toLowerCase().indexOf( 'webkit' ) > -1,
		is_opera  = navigator.userAgent.toLowerCase().indexOf( 'opera' )  > -1,
		is_ie     = navigator.userAgent.toLowerCase().indexOf( 'msie' )   > -1;

	if ( ( is_webkit || is_opera || is_ie ) && 'undefined' !== typeof( document.getElementById ) ) {
		var eventMethod = ( window.addEventListener ) ? 'addEventListener' : 'attachEvent';
		window[ eventMethod ]( 'hashchange', function() {
			var element = document.getElementById( location.hash.substring( 1 ) );

			if ( element ) {
				if ( ! /^(?:a|select|input|button|textarea)$/i.test( element.tagName ) )
					element.tabIndex = -1;

				element.focus();
			}
		}, false );
	}
})();
;
/*! This file is auto-generated */
window.addComment=function(v){var I,C,h,E=v.document,b={commentReplyClass:"comment-reply-link",commentReplyTitleId:"reply-title",cancelReplyId:"cancel-comment-reply-link",commentFormId:"commentform",temporaryFormId:"wp-temp-form-div",parentIdFieldId:"comment_parent",postIdFieldId:"comment_post_ID"},e=v.MutationObserver||v.WebKitMutationObserver||v.MozMutationObserver,r="querySelector"in E&&"addEventListener"in v,n=!!E.documentElement.dataset;function t(){d(),e&&new e(o).observe(E.body,{childList:!0,subtree:!0})}function d(e){if(r&&(I=g(b.cancelReplyId),C=g(b.commentFormId),I)){I.addEventListener("touchstart",l),I.addEventListener("click",l);var t=function(e){if((e.metaKey||e.ctrlKey)&&13===e.keyCode)return C.removeEventListener("keydown",t),e.preventDefault(),C.submit.click(),!1};C&&C.addEventListener("keydown",t);for(var n,d=function(e){var t=b.commentReplyClass;e&&e.childNodes||(e=E);t=E.getElementsByClassName?e.getElementsByClassName(t):e.querySelectorAll("."+t);return t}(e),o=0,i=d.length;o<i;o++)(n=d[o]).addEventListener("touchstart",a),n.addEventListener("click",a)}}function l(e){var t,n,d=g(b.temporaryFormId);d&&h&&(g(b.parentIdFieldId).value="0",t=d.textContent,d.parentNode.replaceChild(h,d),this.style.display="none",n=(d=(n=g(b.commentReplyTitleId))&&n.firstChild)&&d.nextSibling,d&&d.nodeType===Node.TEXT_NODE&&t&&(n&&"A"===n.nodeName&&n.id!==b.cancelReplyId&&(n.style.display=""),d.textContent=t),e.preventDefault())}function a(e){var t=g(b.commentReplyTitleId),n=t&&t.firstChild.textContent,d=this,o=m(d,"belowelement"),i=m(d,"commentid"),r=m(d,"respondelement"),t=m(d,"postid"),n=m(d,"replyto")||n;o&&i&&r&&t&&!1===v.addComment.moveForm(o,i,r,t,n)&&e.preventDefault()}function o(e){for(var t=e.length;t--;)if(e[t].addedNodes.length)return void d()}function m(e,t){return n?e.dataset[t]:e.getAttribute("data-"+t)}function g(e){return E.getElementById(e)}return r&&"loading"!==E.readyState?t():r&&v.addEventListener("DOMContentLoaded",t,!1),{init:d,moveForm:function(e,t,n,d,o){var i=g(e);h=g(n);var r,l,a,m,c=g(b.parentIdFieldId),s=g(b.postIdFieldId),y=g(b.commentReplyTitleId),p=y&&y.firstChild,u=p&&p.nextSibling;if(i&&h&&c){void 0===o&&(o=p&&p.textContent),m=h,e=b.temporaryFormId,n=g(e),y=(y=g(b.commentReplyTitleId))?y.firstChild.textContent:"",n||((n=E.createElement("div")).id=e,n.style.display="none",n.textContent=y,m.parentNode.insertBefore(n,m)),d&&s&&(s.value=d),c.value=t,I.style.display="",i.parentNode.insertBefore(h,i.nextSibling),p&&p.nodeType===Node.TEXT_NODE&&(u&&"A"===u.nodeName&&u.id!==b.cancelReplyId&&(u.style.display="none"),p.textContent=o),I.onclick=function(){return!1};try{for(var f=0;f<C.elements.length;f++)if(r=C.elements[f],l=!1,"getComputedStyle"in v?a=v.getComputedStyle(r):E.documentElement.currentStyle&&(a=r.currentStyle),(r.offsetWidth<=0&&r.offsetHeight<=0||"hidden"===a.visibility)&&(l=!0),"hidden"!==r.type&&!r.disabled&&!l){r.focus();break}}catch(e){}return!1}}}}(window);;
/**
 * Scripts for the custom header.
*/
(function( $ ) {
	// Set backstretch, because it's more browser friendly for setting a background image.
	$( '#masthead' ).backstretch( $( '#masthead .screen-reader-text' ).data( 'backstretch' ) );

	// Set the height of the masthead. We use this height below.
	$( '#masthead' ).data( 'height', $( '#masthead' ).outerHeight() );

	$( window ).scroll( function( event ) {

		if ( $( window ).width() > 800 ) {
			var position = window.scrollY,
				bottom   = window.innerHeight - document.getElementById( 'colophon' ).offsetHeight,
				height   = $( '#masthead' ).data( 'height' ),
				content  = $( '#content' ).offset().top,
				footer   = $( '#colophon' ).offset().top - position;

			if ( position > 0 && content > position && footer > bottom ) {
				if ( position < height ) {
					$( '#masthead' ).css({
						'height' : height - position + 'px',
						'overflow' : 'hidden'
					});

					$( '.site-branding' ).css({
						'opacity' : ( 1 - position / height * 2 )
					});
				} else {
					$( '#masthead' ).css({
						'height' : '0px'
					});
				}
			} else if ( position <= 0 ) {
				$( '#masthead' ).css({
					'height' : height
				});

				$( '.site-branding' ).css({
					'opacity' : 1
				});
			}
		} else {
			$( '#masthead' ).css({
				'height' : height + "px"
			});

			$( '.site-branding' ).css({
				'opacity' : 1
			});
		}
	});

	// In the case that the main title is very long, i.e, > 32 chars,
	// shrink the font size down a little so it's not so overbearing (only on desktop).
	var $siteTitle= $( '.site-title' ),
		siteTitleText = $siteTitle.find( 'a' ).text();

	var updateText = function() {
		if ( ( $( window ).width() > 1000 ) ) {
			$siteTitle.css( 'font-size', '6.388888889rem' );
		} else {
			$siteTitle.css( 'font-size', '' );
		}
	};

	// Run on document ready:
	$( function() {
		if ( siteTitleText.length > 32 ) {
			updateText();
			$( window ).resize( updateText );
		}
	} );

}( jQuery ));
;
( function( $ ) {
	var cookieValue = document.cookie.replace( /(?:(?:^|.*;\s*)eucookielaw\s*\=\s*([^;]*).*$)|^.*$/, '$1' ),
		overlay = $( '#eu-cookie-law' ),
		container = $( '.widget_eu_cookie_law_widget' ),
		initialScrollPosition,
		scrollFunction;

	if ( overlay.hasClass( 'ads-active' ) ) {
		var adsCookieValue = document.cookie.replace( /(?:(?:^|.*;\s*)personalized-ads-consent\s*\=\s*([^;]*).*$)|^.*$/, '$1' );
		if ( '' !== cookieValue && '' !== adsCookieValue ) {
			overlay.remove();
		}
	} else if ( '' !== cookieValue ) {
		overlay.remove();
	}

	$( '.widget_eu_cookie_law_widget' ).appendTo( 'body' ).fadeIn();

	overlay.find( 'form' ).on( 'submit', accept );

	if ( overlay.hasClass( 'hide-on-scroll' ) ) {
		initialScrollPosition = $( window ).scrollTop();
		scrollFunction = function() {
			if ( Math.abs( $( window ).scrollTop() - initialScrollPosition ) > 50 ) {
				accept();
			}
		};
		$( window ).on( 'scroll', scrollFunction );
	} else if ( overlay.hasClass( 'hide-on-time' ) ) {
		setTimeout( accept, overlay.data( 'hide-timeout' ) * 1000 );
	}

	var accepted = false;
	function accept( event ) {
		if ( accepted ) {
			return;
		}
		accepted = true;

		if ( event && event.preventDefault ) {
			event.preventDefault();
		}

		if ( overlay.hasClass( 'hide-on-scroll' ) ) {
			$( window ).off( 'scroll', scrollFunction );
		}

		var expireTime = new Date();
		expireTime.setTime( expireTime.getTime() + ( overlay.data( 'consent-expiration' ) * 24 * 60 * 60 * 1000 ) );

		document.cookie = 'eucookielaw=' + expireTime.getTime() + ';path=/;expires=' + expireTime.toGMTString();
		if ( overlay.hasClass( 'ads-active' ) && overlay.hasClass( 'hide-on-button' ) ) {
			document.cookie = 'personalized-ads-consent=' + expireTime.getTime() + ';path=/;expires=' + expireTime.toGMTString();
		}

		overlay.fadeOut( 400, function() {
			overlay.remove();
			container.remove();
		} );
	}
} )( jQuery );
;
/* globals JSON */
( function () {
	var eventName = 'wpcom_masterbar_click';

	var linksTracksEvents = {
		// top level items
		'wp-admin-bar-blog'                        : 'my_sites',
		'wp-admin-bar-newdash'                     : 'reader',
		'wp-admin-bar-ab-new-post'                 : 'write_button',
		'wp-admin-bar-my-account'                  : 'my_account',
		'wp-admin-bar-notes'                       : 'notifications',
		// my sites - top items
		'wp-admin-bar-switch-site'                 : 'my_sites_switch_site',
		'wp-admin-bar-blog-info'                   : 'my_sites_site_info',
		'wp-admin-bar-site-view'                   : 'my_sites_view_site',
		'wp-admin-bar-blog-stats'                  : 'my_sites_site_stats',
		'wp-admin-bar-plan'                        : 'my_sites_plan',
		'wp-admin-bar-plan-badge'                  : 'my_sites_plan_badge',
		// my sites - manage
		'wp-admin-bar-edit-page'                   : 'my_sites_manage_site_pages',
		'wp-admin-bar-new-page-badge'              : 'my_sites_manage_add_page',
		'wp-admin-bar-edit-post'                   : 'my_sites_manage_blog_posts',
		'wp-admin-bar-new-post-badge'              : 'my_sites_manage_add_post',
		'wp-admin-bar-edit-attachment'             : 'my_sites_manage_media',
		'wp-admin-bar-new-attachment-badge'        : 'my_sites_manage_add_media',
		'wp-admin-bar-comments'                    : 'my_sites_manage_comments',
		'wp-admin-bar-edit-jetpack-testimonial'    : 'my_sites_manage_testimonials',
		'wp-admin-bar-new-jetpack-testimonial'     : 'my_sites_manage_add_testimonial',
		'wp-admin-bar-edit-jetpack-portfolio'      : 'my_sites_manage_portfolio',
		'wp-admin-bar-new-jetpack-portfolio'       : 'my_sites_manage_add_portfolio',
		// my sites - personalize
		'wp-admin-bar-themes'                      : 'my_sites_personalize_themes',
		'wp-admin-bar-cmz'                         : 'my_sites_personalize_themes_customize',
		// my sites - configure
		'wp-admin-bar-sharing'                     : 'my_sites_configure_sharing',
		'wp-admin-bar-people'                      : 'my_sites_configure_people',
		'wp-admin-bar-people-add'                  : 'my_sites_configure_people_add_button',
		'wp-admin-bar-plugins'                     : 'my_sites_configure_plugins',
		'wp-admin-bar-domains'                     : 'my_sites_configure_domains',
		'wp-admin-bar-domains-add'                 : 'my_sites_configure_add_domain',
		'wp-admin-bar-blog-settings'               : 'my_sites_configure_settings',
		'wp-admin-bar-legacy-dashboard'            : 'my_sites_configure_wp_admin',
		// reader
		'wp-admin-bar-followed-sites'              : 'reader_followed_sites',
		'wp-admin-bar-reader-followed-sites-manage': 'reader_manage_followed_sites',
		'wp-admin-bar-discover-discover'           : 'reader_discover',
		'wp-admin-bar-discover-search'             : 'reader_search',
		'wp-admin-bar-my-activity-my-likes'        : 'reader_my_likes',
		// account
		'wp-admin-bar-user-info'                   : 'my_account_user_name',
		// account - profile
		'wp-admin-bar-my-profile'                  : 'my_account_profile_my_profile',
		'wp-admin-bar-account-settings'            : 'my_account_profile_account_settings',
		'wp-admin-bar-billing'                     : 'my_account_profile_manage_purchases',
		'wp-admin-bar-security'                    : 'my_account_profile_security',
		'wp-admin-bar-notifications'               : 'my_account_profile_notifications',
		// account - special
		'wp-admin-bar-get-apps'                    : 'my_account_special_get_apps',
		'wp-admin-bar-next-steps'                  : 'my_account_special_next_steps',
		'wp-admin-bar-help'                        : 'my_account_special_help',
	};

	var notesTracksEvents = {
		openSite: function ( data ) {
			return {
				clicked: 'masterbar_notifications_panel_site',
				site_id: data.siteId
			};
		},
		openPost: function ( data ) {
			return {
				clicked: 'masterbar_notifications_panel_post',
				site_id: data.siteId,
				post_id: data.postId
			};
		},
		openComment: function ( data ) {
			return {
				clicked: 'masterbar_notifications_panel_comment',
				site_id: data.siteId,
				post_id: data.postId,
				comment_id: data.commentId
			};
		}
	};

	// Element.prototype.matches as a standalone function, with old browser fallback
	function matches( node, selector ) {
		if ( ! node ) {
			return undefined;
		}

		if ( ! Element.prototype.matches && ! Element.prototype.msMatchesSelector ) {
			throw new Error( 'Unsupported browser' );
		}

		return Element.prototype.matches ? node.matches( selector ) : node.msMatchesSelector( selector );
	}

	// Element.prototype.closest as a standalone function, with old browser fallback
	function closest( node, selector ) {
		if ( ! node ) {
			return undefined;
		}

		if ( Element.prototype.closest ) {
			return node.closest( selector );
		}

		do {
			if ( matches( node, selector ) ) {
				return node;
			}

			node = node.parentElement || node.parentNode;
		} while ( node !== null && node.nodeType === 1 );

		return null;
	}

	function recordTracksEvent( eventProps ) {
		eventProps = eventProps || {};
		window._tkq = window._tkq || [];
		window._tkq.push( [ 'recordEvent', eventName, eventProps ] );
	}

	function parseJson( s, defaultValue ) {
		try {
			return JSON.parse( s );
		} catch ( e ) {
			return defaultValue;
		}
	}

	function createTrackableLinkEventHandler( link ) {
		return function () {
			var parent = closest( link, 'li' );

			if ( ! parent ) {
				return;
			}

			var trackingId = link.getAttribute( 'ID' ) || parent.getAttribute( 'ID' );

			if ( ! linksTracksEvents.hasOwnProperty( trackingId ) ) {
				return;
			}

			var eventProps = { 'clicked': linksTracksEvents[ trackingId ] };
			recordTracksEvent( eventProps );
		}
	}

	function init() {
		var trackableLinkSelector = '.mb-trackable .ab-item:not(div),' +
			'#wp-admin-bar-notes .ab-item,' +
			'#wp-admin-bar-user-info .ab-item,' +
			'.mb-trackable .ab-secondary';

		var trackableLinks = document.querySelectorAll( trackableLinkSelector );

		for ( var i = 0; i < trackableLinks.length; i++ ) {
			var link = trackableLinks[ i ];
			var handler = createTrackableLinkEventHandler( link );

			link.addEventListener( 'click', handler );
			link.addEventListener( 'touchstart', handler );
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

	// listen for postMessage events from the notifications iframe
	window.addEventListener( 'message', function ( event ) {
		if ( event.origin !== 'https://widgets.wp.com' ) {
			return;
		}

		var data = ( typeof event.data === 'string' ) ? parseJson( event.data, {} ) : event.data;
		if ( data.type !== 'notesIframeMessage' ) {
			return;
		}

		var eventData = notesTracksEvents[ data.action ];
		if ( ! eventData ) {
			return;
		}

		recordTracksEvent( eventData( data ) );
	}, false );

} )();
;
/* global jetpackCarouselStrings, DocumentTouch */

// @start-hide-in-jetpack
if (typeof wpcom === 'undefined') {
	var wpcom = {};
}
wpcom.carousel = (function (/*$*/) {
	var prebuilt_widths = jetpackCarouselStrings.widths;
	var pageviews_stats_args = jetpackCarouselStrings.stats_query_args;

	var findFirstLargeEnoughWidth = function (original_w, original_h, dest_w, dest_h) {
		var inverse_ratio = original_h / original_w;

		for ( var i = 0; i < prebuilt_widths.length; ++i ) {
			if ( prebuilt_widths[i] >= dest_w || prebuilt_widths[i] * inverse_ratio >= dest_h ) {
				return prebuilt_widths[i];
			}
		}

		return original_w;
	};

	var removeResizeFromImageURL = function ( url ) {
		return removeArgFromURL( url, 'resize' );
	};

	var removeArgFromURL = function ( url, arg ) {
		var re = new RegExp( '[\\?&]' + arg + '(=[^?&]+)?' );
		if ( url.match( re ) ) {
			return url.replace( re, '' );
		}
		return url;
	};

	var addWidthToImageURL = function (url, width) {
		width = parseInt(width, 10);
		// Give devices with a higher devicePixelRatio higher-res images (Retina display = 2, Android phones = 1.5, etc)
		if ('undefined' !== typeof window.devicePixelRatio && window.devicePixelRatio > 1) {
			width = Math.round( width * window.devicePixelRatio );
		}
		url = addArgToURL(url, 'w', width);
		url = addArgToURL(url, 'h', '');
		return url;
	};

	var addArgToURL = function (url, arg, value) {
		var re = new RegExp(arg+'=[^?&]+');
		if ( url.match(re) ) {
			return url.replace(re, arg + '=' + value);
		} else {
			var divider = url.indexOf('?') !== -1 ? '&' : '?';
			return url + divider + arg + '=' + value;
		}
	};

	var stat = function ( names ) {
		if ( typeof names !== 'string' ) {
			names = names.join( ',' );
		}

		new Image().src = window.location.protocol +
			'//pixel.wp.com/g.gif?v=wpcom-no-pv' +
			'&x_carousel=' + names +
			'&baba=' + Math.random();
	};

	var pageview = function ( post_id ) {
		new Image().src = window.location.protocol +
			'//pixel.wp.com/g.gif?host=' + encodeURIComponent( window.location.host ) +
			'&ref=' + encodeURIComponent( document.referrer ) +
			'&rand=' + Math.random() +
			'&' + pageviews_stats_args +
			'&post=' + encodeURIComponent( post_id );
	};


	return {
		findFirstLargeEnoughWidth: findFirstLargeEnoughWidth,
		removeResizeFromImageURL: removeResizeFromImageURL,
		addWidthToImageURL: addWidthToImageURL,
		stat: stat,
		pageview: pageview
	};

})(jQuery);
// @end-hide-in-jetpack
jQuery( document ).ready( function ( $ ) {
	// gallery faded layer and container elements
	var overlay,
		gallery,
		container,
		info,
		transitionBegin,
		caption,
		resizeTimeout,
		photo_info,
		commentInterval,
		lastSelectedSlide,
		screenPadding,
		originalOverflow = $( 'body' ).css( 'overflow' ),
		originalHOverflow = $( 'html' ).css( 'overflow' ),
		proportion = 85,
		last_known_location_hash = '',
		imageMeta,
		titleAndDescription,
		commentForm,
		leftColWrapper,
		scrollPos;

	var keyListener = function ( e ) {
		switch ( e.which ) {
			case 38: // up
				e.preventDefault();
				container.scrollTop( container.scrollTop() - 100 );
				break;
			case 40: // down
				e.preventDefault();
				container.scrollTop( container.scrollTop() + 100 );
				break;
			case 39: // right
				e.preventDefault();
				gallery.jp_carousel( 'next' );
				break;
			case 37: // left
			case 8: // backspace
				e.preventDefault();
				gallery.jp_carousel( 'previous' );
				break;
			case 27: // escape
				e.preventDefault();
				container.jp_carousel( 'close' );
				break;
			default:
				// making jslint happy
				break;
		}
	};

	var calculatePadding = function() {
		var baseScreenPadding = 110;
		screenPadding = baseScreenPadding;

		if ( window.innerWidth <= 760 ) {
			screenPadding = Math.round( ( window.innerWidth / 760 ) * baseScreenPadding );
			var isTouch = 'ontouchstart' in window || ( window.DocumentTouch && document instanceof DocumentTouch );

			if ( screenPadding < 40 && isTouch ) {
				screenPadding = 0;
			}
		}
	}

	var resizeListener = function (/*e*/) {
		// Don't animate if user prefers reduced motion.
		var shouldAnimate = window.matchMedia && ! window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

		clearTimeout( resizeTimeout );
		resizeTimeout = setTimeout( function () {
			calculatePadding();
			gallery.jp_carousel( 'slides' ).jp_carousel( 'fitSlide', shouldAnimate );
			gallery.jp_carousel( 'updateSlidePositions', shouldAnimate );
			gallery.jp_carousel( 'fitMeta', shouldAnimate );
		}, 200 );
	};

	var prepareGallery = function (/*dataCarouselExtra*/) {
		if ( ! overlay ) {
			container = $( '.jp-carousel-wrap' );
			overlay = container.find( '.jp-carousel-overlay' );

			gallery = container.find( '.jp-carousel' );
			caption = container.find( '.jp-carousel-caption' );
			photo_info = container.find( '.jp-carousel-photo-info' );
			info = container.find( '.jp-carousel-info' );
			commentForm = container.find( '.jp-carousel-comment-form-container' );
			commentsLoading = container.find( '.jp-carousel-comments-loading' );
			imageMeta = container.find( '.jp-carousel-image-meta' );
			leftColWrapper = container.find( '.jp-carousel-left-column-wrapper' );
			titleAndDescription = container.find( '.jp-carousel-titleanddesc' );
			buttons = container.find( '.jp-carousel-buttons' );

			var nextButton = container.find( '.jp-carousel-next-button' );
			var previousButton = container.find( '.jp-carousel-previous-button' );

			calculatePadding();
			gallery.jp_carousel( 'fitMeta', false );

			container.click( function ( e ) {
				var target = $( e.target ),
					wrap = target.parents( 'div.jp-carousel-wrap' ),
					data = wrap.data( 'carousel-extra' ),
					slide = wrap.find( 'div.selected' ),
					attachment_id = slide.data( 'attachment-id' );
				data = data || [];

				if ( target.is( gallery ) || target.parents().add( target ).is( container.find( '.jp-carousel-close-hint' ) ) ) {
					if ( ! window.matchMedia( '(max-device-width: 760px)' ).matches ) {
						container.jp_carousel( 'close' );
					} else {
						if ( target.parents().add( target ).is( container.find( '.jp-carousel-close-hint' ) ) ) {
							container.jp_carousel( 'close' );
						}

						if ( e.pageX <= 70 ) {
							container.jp_carousel( 'previous' );
						}
						if ( $( window ).width() - e.pageX <= 70 ) {
							container.jp_carousel( 'next' );
						}
					}
// @start-hide-in-jetpack
				} else if ( target.hasClass('jp-carousel-reblog') ) {
					e.preventDefault();
					e.stopPropagation();
					if ( !target.hasClass('reblogged') ) {
						target.jp_carousel('show_reblog_box');
						wpcom.carousel.stat('reblog_show_box');
					}
				} else if ( target.parents('#carousel-reblog-box').length ) {
					if ( target.is('a.cancel') ) {
						e.preventDefault();
						e.stopPropagation();
						target.jp_carousel('hide_reblog_box');
						wpcom.carousel.stat('reblog_cancel');
					} else if ( target.is( 'input[type="submit"]' ) ) {
						e.preventDefault();
						e.stopPropagation();

						var note = $('#carousel-reblog-box textarea').val();
						if ( jetpackCarouselStrings.reblog_add_thoughts === note ) {
							note = '';
						}

						$('#carousel-reblog-submit').val( jetpackCarouselStrings.reblogging );
						$('#carousel-reblog-submit').prop('disabled', true);
						$( '#carousel-reblog-box div.submit span.canceltext' ).show();

						$.post( jetpackCarouselStrings.ajaxurl, {
							'action': 'post_reblog',
							'reblog_source': 'carousel',
							'original_blog_id': $('#carousel-reblog-box input#carousel-reblog-blog-id').val(),
							'original_post_id': $('.jp-carousel div.selected').data('attachment-id'),
							'blog_id': $('#carousel-reblog-box select').val(),
							'blog_url': $('#carousel-reblog-box input#carousel-reblog-blog-url').val(),
							'blog_title': $('#carousel-reblog-box input#carousel-reblog-blog-title').val(),
							'post_url': $('#carousel-reblog-box input#carousel-reblog-post-url').val(),
							'post_title': slide.data( 'caption' ) || $('#carousel-reblog-box input#carousel-reblog-post-title').val(),
							'note': note,
							'_wpnonce': $('#carousel-reblog-box #_wpnonce').val()
						},
						function (/*result*/) {
							$('#carousel-reblog-box').css({ 'height': $('#carousel-reblog-box').height() + 'px' }).slideUp('fast');
							$('a.jp-carousel-reblog').html( jetpackCarouselStrings.reblogged ).removeClass( 'reblog' ).addClass( 'reblogged' );
							$( '#carousel-reblog-box div.submit span.canceltext' ).hide();
							$('#carousel-reblog-submit').val( jetpackCarouselStrings.post_reblog );
							$('div.jp-carousel-info').children().not('#carousel-reblog-box').fadeIn('fast');
							slide.data('reblogged', 1);
							$('div.gallery').find('img[data-attachment-id="' + slide.data('attachment-id') + '"]').data('reblogged', 1);


						}, 'json' );
						wpcom.carousel.stat('reblog_submit');
					}
				} else if ( target.hasClass( 'jp-carousel-image-download' ) ) {
					wpcom.carousel.stat( 'download_original_click' );
// @end-hide-in-jetpack
				} else if ( target.hasClass( 'jp-carousel-commentlink' ) ) {
					e.preventDefault();
					e.stopPropagation();
					$( window ).unbind( 'keydown', keyListener );
					container.animate( { scrollTop: parseInt( info.position()[ 'top' ], 10 ) }, 'fast' );
					$( '#jp-carousel-comment-form-submit-and-info-wrapper' ).slideDown( 'fast' );
					$( '#jp-carousel-comment-form-comment-field' ).focus();
				} else if ( target.hasClass( 'jp-carousel-comment-login' ) ) {
					var url = jetpackCarouselStrings.login_url + '%23jp-carousel-' + attachment_id;

					window.location.href = url;
				} else if ( target.parents( '#jp-carousel-comment-form-container' ).length ) {
					var textarea = $( '#jp-carousel-comment-form-comment-field' )
						.blur( function () {
							$( window ).bind( 'keydown', keyListener );
						} )
						.focus( function () {
							$( window ).unbind( 'keydown', keyListener );
						} );

					var emailField = $( '#jp-carousel-comment-form-email-field' )
						.blur( function () {
							$( window ).bind( 'keydown', keyListener );
						} )
						.focus( function () {
							$( window ).unbind( 'keydown', keyListener );
						} );

					var authorField = $( '#jp-carousel-comment-form-author-field' )
						.blur( function () {
							$( window ).bind( 'keydown', keyListener );
						} )
						.focus( function () {
							$( window ).unbind( 'keydown', keyListener );
						} );

					var urlField = $( '#jp-carousel-comment-form-url-field' )
						.blur( function () {
							$( window ).bind( 'keydown', keyListener );
						} )
						.focus( function () {
							$( window ).unbind( 'keydown', keyListener );
						} );

					if ( textarea && textarea.attr( 'id' ) === target.attr( 'id' ) ) {
						// For first page load
						$( window ).unbind( 'keydown', keyListener );
						$( '#jp-carousel-comment-form-submit-and-info-wrapper' ).slideDown( 'fast' );
					} else if ( target.is( 'input[type="submit"]' ) ) {
						e.preventDefault();
						e.stopPropagation();

						$( '#jp-carousel-comment-form-spinner' ).show();

						var ajaxData = {
							action: 'post_attachment_comment',
							nonce: jetpackCarouselStrings.nonce,
							blog_id: data[ 'blog_id' ],
							id: attachment_id,
							comment: textarea.val(),
						};

						if ( ! ajaxData[ 'comment' ].length ) {
							gallery.jp_carousel( 'postCommentError', {
								field: 'jp-carousel-comment-form-comment-field',
								error: jetpackCarouselStrings.no_comment_text,
							} );
							return;
						}

						if ( 1 !== Number( jetpackCarouselStrings.is_logged_in ) ) {
							ajaxData[ 'email' ] = emailField.val();
							ajaxData[ 'author' ] = authorField.val();
							ajaxData[ 'url' ] = urlField.val();

							if ( 1 === Number( jetpackCarouselStrings.require_name_email ) ) {
								if ( ! ajaxData[ 'email' ].length || ! ajaxData[ 'email' ].match( '@' ) ) {
									gallery.jp_carousel( 'postCommentError', {
										field: 'jp-carousel-comment-form-email-field',
										error: jetpackCarouselStrings.no_comment_email,
									} );
									return;
								} else if ( ! ajaxData[ 'author' ].length ) {
									gallery.jp_carousel( 'postCommentError', {
										field: 'jp-carousel-comment-form-author-field',
										error: jetpackCarouselStrings.no_comment_author,
									} );
									return;
								}
							}
						}

						$.ajax( {
							type: 'POST',
							url: jetpackCarouselStrings.ajaxurl,
							data: ajaxData,
							dataType: 'json',
							success: function ( response /*, status, xhr*/ ) {
								if ( 'approved' === response.comment_status ) {
									$( '#jp-carousel-comment-post-results' )
										.slideUp( 'fast' )
										.html(
											'<span class="jp-carousel-comment-post-success">' +
												jetpackCarouselStrings.comment_approved +
												'</span>'
										)
										.slideDown( 'fast' );
								} else if ( 'unapproved' === response.comment_status ) {
									$( '#jp-carousel-comment-post-results' )
										.slideUp( 'fast' )
										.html(
											'<span class="jp-carousel-comment-post-success">' +
												jetpackCarouselStrings.comment_unapproved +
												'</span>'
										)
										.slideDown( 'fast' );
								} else {
									// 'deleted', 'spam', false
									$( '#jp-carousel-comment-post-results' )
										.slideUp( 'fast' )
										.html(
											'<span class="jp-carousel-comment-post-error">' +
												jetpackCarouselStrings.comment_post_error +
												'</span>'
										)
										.slideDown( 'fast' );
								}
								gallery.jp_carousel( 'clearCommentTextAreaValue' );
								gallery.jp_carousel( 'getComments', {
									attachment_id: attachment_id,
									offset: 0,
									clear: true,
								} );
								$( '#jp-carousel-comment-form-button-submit' ).val(
									jetpackCarouselStrings.post_comment
								);
								$( '#jp-carousel-comment-form-spinner' ).hide();
							},
							error: function (/*xhr, status, error*/) {
								// TODO: Add error handling and display here
								gallery.jp_carousel( 'postCommentError', {
									field: 'jp-carousel-comment-form-comment-field',
									error: jetpackCarouselStrings.comment_post_error,
								} );
								return;
							},
						} );
					}
				} else if ( ! target.parents( '.jp-carousel-info' ).length ) {
					if ( window.matchMedia( '(max-device-width: 760px)' ).matches ) {
						if ( e.pageX <= 70 ) {
							container.jp_carousel( 'previous' );
						}
						if ( $( window ).width() - e.pageX <= 70 ) {
							container.jp_carousel( 'next' );
						}
					} else {
						container.jp_carousel( 'next' );
					}
				}
			} )
			.bind( 'jp_carousel.afterOpen', function () {
				$( window ).bind( 'keydown', keyListener );
				$( window ).bind( 'resize', resizeListener );
				gallery.opened = true;

				resizeListener();
			} )
			.bind( 'jp_carousel.beforeClose', function () {
				var scroll = $( window ).scrollTop();

				$( window ).unbind( 'keydown', keyListener );
				$( window ).unbind( 'resize', resizeListener );
				$( window ).scrollTop( scroll );
				$( '.jp-carousel-previous-button' ).hide();
				$( '.jp-carousel-next-button' ).hide();
				// Set height to original value
				// Fix some themes where closing carousel brings view back to top
				$( 'html' ).css( 'height', '' );
				gallery.jp_carousel( 'hide_reblog_box' ); // @hide-in-jetpack
			} )
			.bind( 'jp_carousel.afterClose', function () {
				if ( window.location.hash && history.back ) {
					history.back();
				}
				last_known_location_hash = '';
				gallery.opened = false;
			} )
			.on( 'transitionend.jp-carousel ', '.jp-carousel-slide', function ( e ) {
				// If the movement transitions take more than twice the allotted time, disable them.
				// There is some wiggle room in the 2x, since some of that time is taken up in
				// JavaScript, setting up the transition and calling the events.
				if ( 'transform' === e.originalEvent.propertyName ) {
					var transitionMultiplier =
						( Date.now() - transitionBegin ) / 1000 / e.originalEvent.elapsedTime;

					container.off( 'transitionend.jp-carousel' );

					if ( transitionMultiplier >= 2 ) {
						$( '.jp-carousel-transitions' ).removeClass( 'jp-carousel-transitions' );
					}
				}
			} );

			container.touchwipe( {
				wipeLeft: function ( e ) {
					e.preventDefault();
					gallery.jp_carousel( 'next' );
				},
				wipeRight: function ( e ) {
					e.preventDefault();
					gallery.jp_carousel( 'previous' );
				},
				preventDefaultEvents: false,
			} );

			nextButton.add( previousButton ).click( function ( e ) {
				e.preventDefault();
				e.stopPropagation();
				if ( nextButton.is( this ) ) {
					gallery.jp_carousel( 'next' );
				} else {
					gallery.jp_carousel( 'previous' );
				}
			} );
		}
	};

	var processSingleImageGallery = function () {
		// process links that contain img tag with attribute data-attachment-id
		$( 'a img[data-attachment-id]' ).each( function () {
			var container = $( this ).parent();

			// skip if image was already added to gallery by shortcode
			if ( container.parent( '.gallery-icon' ).length ) {
				return;
			}

			// skip if the container is not a link
			if ( 'undefined' === typeof $( container ).attr( 'href' ) ) {
				return;
			}

			var valid = false;

			// if link points to 'Media File' (ignoring GET parameters) and flag is set allow it
			if (
				$( container ).attr( 'href' ).split( '?' )[ 0 ] ===
					$( this ).attr( 'data-orig-file' ).split( '?' )[ 0 ] &&
				1 === Number( jetpackCarouselStrings.single_image_gallery_media_file )
			) {
				valid = true;
			}

			// if link points to 'Attachment Page' allow it
			if ( $( container ).attr( 'href' ) === $( this ).attr( 'data-permalink' ) ) {
				valid = true;
			}

			// links to 'Custom URL' or 'Media File' when flag not set are not valid
			if ( ! valid ) {
				return;
			}

			// make this node a gallery recognizable by event listener above
			$( container ).addClass( 'single-image-gallery' );
			// blog_id is needed to allow posting comments to correct blog
			$( container ).data( 'carousel-extra', {
				blog_id: Number( jetpackCarouselStrings.blog_id ),
			} );
		} );
	};

	var methods = {
		testForData: function ( gallery ) {
			gallery = $( gallery );
			return ! ( ! gallery.length || ! gallery.data( 'carousel-extra' ) );
		},

		testIfOpened: function () {
			return !! (
				'undefined' !== typeof gallery &&
				'undefined' !== typeof gallery.opened &&
				gallery.opened
			);
		},

		openOrSelectSlide: function ( index ) {
			// The `open` method triggers an asynchronous effect, so we will get an
			// error if we try to use `open` then `selectSlideAtIndex` immediately
			// after it. We can only use `selectSlideAtIndex` if the carousel is
			// already open.
			if ( ! $( this ).jp_carousel( 'testIfOpened' ) ) {
				// The `open` method selects the correct slide during the
				// initialization.
				$( this ).jp_carousel( 'open', { start_index: index } );
			} else {
				gallery.jp_carousel( 'selectSlideAtIndex', index );
			}
		},

		open: function ( options ) {
			var settings = {
					items_selector:
						'.gallery-item [data-attachment-id], .tiled-gallery-item [data-attachment-id], img[data-attachment-id]',
					start_index: 0,
				},
				data = $( this ).data( 'carousel-extra' );

			if ( ! data ) {
				return; // don't run if the default gallery functions weren't used
			}

			prepareGallery( data );

			if ( gallery.jp_carousel( 'testIfOpened' ) ) {
				return; // don't open if already opened
			}

			// make sure to stop the page from scrolling behind the carousel overlay, so we don't trigger
			// infiniscroll for it when enabled (Reader, theme infiniscroll, etc).
			originalOverflow = $( 'body' ).css( 'overflow' );
			$( 'body' ).css( 'overflow', 'hidden' );
			// prevent html from overflowing on some of the new themes.
			originalHOverflow = $( 'html' ).css( 'overflow' );
			$( 'html' ).css( 'overflow', 'hidden' );
			scrollPos = $( window ).scrollTop();

			container.data( 'carousel-extra', data );
// @start-hide-in-jetpack
			wpcom.carousel.stat( ['open', 'view_image'] );
// @end-hide-in-jetpack

			return this.each( function () {
				// If options exist, lets merge them
				// with our default settings
				var $this = $( this );

				if ( options ) {
					$.extend( settings, options );
				}
				if ( -1 === settings.start_index ) {
					settings.start_index = 0; //-1 returned if can't find index, so start from beginning
				}

				container.trigger( 'jp_carousel.beforeOpen' ).fadeIn( 'fast', function () {
					container.trigger( 'jp_carousel.afterOpen' );
					gallery
						.jp_carousel(
							'initSlides',
							$this.find( settings.items_selector ),
							settings.start_index
						)
						.jp_carousel( 'selectSlideAtIndex', settings.start_index );
				} );
				gallery.html( '' );
			} );
		},

		selectSlideAtIndex: function ( index ) {
			var slides = this.jp_carousel( 'slides' ),
				selected = slides.eq( index );

			if ( 0 === selected.length ) {
				selected = slides.eq( 0 );
			}

			gallery.jp_carousel( 'selectSlide', selected, false );
			return this;
		},

		close: function () {
			// make sure to let the page scroll again
			$( 'body' ).css( 'overflow', originalOverflow );
			$( 'html' ).css( 'overflow', originalHOverflow );
			this.jp_carousel( 'clearCommentTextAreaValue' );
			return container.trigger( 'jp_carousel.beforeClose' ).fadeOut( 'fast', function () {
				container.trigger( 'jp_carousel.afterClose' );
				$( window ).scrollTop( scrollPos );
			} );
		},

		next: function () {
			this.jp_carousel( 'previousOrNext', 'nextSlide' );
            gallery.jp_carousel( 'hide_reblog_box' ); // @hide-in-jetpack
		},

		previous: function () {
			this.jp_carousel( 'previousOrNext', 'prevSlide' );
            gallery.jp_carousel( 'hide_reblog_box' ); // @hide-in-jetpack
		},

		previousOrNext: function ( slideSelectionMethodName ) {
			if ( ! this.jp_carousel( 'hasMultipleImages' ) ) {
				return false;
			}

			var slide = gallery.jp_carousel( slideSelectionMethodName );

			if ( slide ) {
				container.animate( { scrollTop: 0 }, 'fast' );
				this.jp_carousel( 'clearCommentTextAreaValue' );
				this.jp_carousel( 'selectSlide', slide );
                wpcom.carousel.stat( ['previous', 'view_image'] ); // @hide-in-jetpack
			}
		},

        // @start-hide-in-jetpack
       resetButtons : function (current) {
		   if ( current.data( 'reblogged' ) ) {
                $('.jp-carousel-buttons a.jp-carousel-reblog').addClass( 'reblogged' ).text( jetpackCarouselStrings.reblogged );
		   } else {
                $('.jp-carousel-buttons a.jp-carousel-reblog').removeClass( 'reblogged' ).text( jetpackCarouselStrings.reblog );
		   }
           // Must also take care of reblog/reblogged here
        },
        // @end-hide-in-jetpack
		selectedSlide: function () {
			return this.find( '.selected' );
		},

		setSlidePosition: function ( x ) {
			transitionBegin = Date.now();

			return this.css( {
				'-webkit-transform': 'translate3d(' + x + 'px,0,0)',
				'-moz-transform': 'translate3d(' + x + 'px,0,0)',
				'-ms-transform': 'translate(' + x + 'px,0)',
				'-o-transform': 'translate(' + x + 'px,0)',
				transform: 'translate3d(' + x + 'px,0,0)',
			} );
		},

		updateSlidePositions: function ( animate ) {
			var current = this.jp_carousel( 'selectedSlide' ),
				galleryWidth = gallery.width(),
				currentWidth = current.width(),
				previous = gallery.jp_carousel( 'prevSlide' ),
				next = gallery.jp_carousel( 'nextSlide' ),
				previousPrevious = previous.prev(),
				nextNext = next.next(),
				left = Math.floor( ( galleryWidth - currentWidth ) * 0.5 );

			current.jp_carousel( 'setSlidePosition', left ).show();

			// minimum width
			gallery.jp_carousel( 'fitInfo', animate );

			// prep the slides
			var direction = lastSelectedSlide.is( current.prevAll() ) ? 1 : -1;

			// Since we preload the `previousPrevious` and `nextNext` slides, we need
			// to make sure they technically visible in the DOM, but invisible to the
			// user. To hide them from the user, we position them outside the edges
			// of the window.
			//
			// This section of code only applies when there are more than three
			// slides. Otherwise, the `previousPrevious` and `nextNext` slides will
			// overlap with the `previous` and `next` slides which must be visible
			// regardless.
			if ( 1 === direction ) {
				if ( ! nextNext.is( previous ) ) {
					nextNext.jp_carousel( 'setSlidePosition', galleryWidth + next.width() ).show();
				}

				if ( ! previousPrevious.is( next ) ) {
					previousPrevious
						.jp_carousel( 'setSlidePosition', -previousPrevious.width() - currentWidth )
						.show();
				}
			} else {
				if ( ! nextNext.is( previous ) ) {
					nextNext.jp_carousel( 'setSlidePosition', galleryWidth + currentWidth ).show();
				}
			}

			previous
				.jp_carousel( 'setSlidePosition', Math.floor( -previous.width() + screenPadding * 0.75 ) )
				.show();
			next
				.jp_carousel( 'setSlidePosition', Math.ceil( galleryWidth - screenPadding * 0.75 ) )
				.show();
		},

		selectSlide: function ( slide, animate ) {
			lastSelectedSlide = this.find( '.selected' ).removeClass( 'selected' );

			var slides = gallery.jp_carousel( 'slides' ).css( { position: 'fixed' } ),
				current = $( slide ).addClass( 'selected' ).css( { position: 'relative' } ),
				attachmentId = current.data( 'attachment-id' ),
				previous = gallery.jp_carousel( 'prevSlide' ),
				next = gallery.jp_carousel( 'nextSlide' ),
				previousPrevious = previous.prev(),
				nextNext = next.next(),
				animated,
				captionHtml;

			// center the main image
			gallery.jp_carousel( 'loadFullImage', current );

			caption.hide();

			if ( next.length === 0 && slides.length <= 2 ) {
				$( '.jp-carousel-next-button' ).hide();
			} else {
				$( '.jp-carousel-next-button' ).show();
			}

			if ( previous.length === 0 && slides.length <= 2 ) {
				$( '.jp-carousel-previous-button' ).hide();
			} else {
				$( '.jp-carousel-previous-button' ).show();
			}

			animated = current
				.add( previous )
				.add( previousPrevious )
				.add( next )
				.add( nextNext )
				.jp_carousel( 'loadSlide' );

			// slide the whole view to the x we want
			slides.not( animated ).hide();

			gallery.jp_carousel( 'updateSlidePositions', animate );
			gallery.jp_carousel( 'resetButtons', current ); // @hide-in-jetpack

			container.trigger( 'jp_carousel.selectSlide', [ current ] );

			gallery.jp_carousel( 'getTitleDesc', {
				title: current.data( 'title' ),
				desc: current.data( 'desc' ),
			} );

			var imageMeta = current.data( 'image-meta' );
			gallery.jp_carousel( 'updateExif', imageMeta );
			gallery.jp_carousel( 'updateFullSizeLink', current );

			if ( 1 === +jetpackCarouselStrings.display_comments ) {
				gallery.jp_carousel( 'testCommentsOpened', current.data( 'comments-opened' ) );
				gallery.jp_carousel( 'getComments', {
					attachment_id: attachmentId,
					offset: 0,
					clear: true,
				} );
				$( '#jp-carousel-comment-post-results' ).slideUp();
			}

			// $('<div />').text(sometext).html() is a trick to go to HTML to plain
			// text (including HTML entities decode, etc)
			if ( current.data( 'caption' ) ) {
				captionHtml = $( '<div />' ).text( current.data( 'caption' ) ).html();

				if ( captionHtml === $( '<div />' ).text( current.data( 'title' ) ).html() ) {
					$( '.jp-carousel-titleanddesc-title' ).fadeOut( 'fast' ).empty();
				}

				if ( captionHtml === $( '<div />' ).text( current.data( 'desc' ) ).html() ) {
					$( '.jp-carousel-titleanddesc-desc' ).fadeOut( 'fast' ).empty();
				}

				caption.html( current.data( 'caption' ) ).fadeIn( 'slow' );
			} else {
				caption.fadeOut( 'fast' ).empty();
			}

			// Record pageview in WP Stats, for each new image loaded full-screen.
			if ( jetpackCarouselStrings.stats ) {
				new Image().src =
					document.location.protocol +
					'//pixel.wp.com/g.gif?' +
					jetpackCarouselStrings.stats +
					'&post=' +
					encodeURIComponent( attachmentId ) +
					'&rand=' +
					Math.random();
			}

			wpcom.carousel.pageview( attachmentId ); // @hide-in-jetpack
			// Load the images for the next and previous slides.
			$( next )
				.add( previous )
				.each( function () {
					gallery.jp_carousel( 'loadFullImage', $( this ) );
				} );

			window.location.hash = last_known_location_hash = '#jp-carousel-' + attachmentId;
		},

		slides: function () {
			return this.find( '.jp-carousel-slide' );
		},

		slideDimensions: function () {
			return {
				width: $( window ).width() - screenPadding * 2,
				height: Math.floor( ( $( window ).height() / 100 ) * proportion - 60 ),
			};
		},

		loadSlide: function () {
			return this.each( function () {
				var slide = $( this );
				slide.find( 'img' ).one( 'load', function () {
					// set the width/height of the image if it's too big
					slide.jp_carousel( 'fitSlide', false );
				} );
			} );
		},

		bestFit: function () {
			var max = gallery.jp_carousel( 'slideDimensions' ),
				orig = this.jp_carousel( 'originalDimensions' ),
				orig_ratio = orig.width / orig.height,
				w_ratio = 1,
				h_ratio = 1,
				width,
				height;

			if ( orig.width > max.width ) {
				w_ratio = max.width / orig.width;
			}
			if ( orig.height > max.height ) {
				h_ratio = max.height / orig.height;
			}

			if ( w_ratio < h_ratio ) {
				width = max.width;
				height = Math.floor( width / orig_ratio );
			} else if ( h_ratio < w_ratio ) {
				height = max.height;
				width = Math.floor( height * orig_ratio );
			} else {
				width = orig.width;
				height = orig.height;
			}

			return {
				width: width,
				height: height,
			};
		},

		fitInfo: function (/*animated*/) {
			var current = this.jp_carousel( 'selectedSlide' );
			var	size = current.jp_carousel( 'bestFit' );

			photo_info.css( {
				left: Math.floor( ( info.width() - size.width ) * 0.5 ),
				width: Math.floor( size.width ),
			} );

			return this;
		},

		fitMeta: function ( animated ) {
			var newInfoPos = {
				left: screenPadding + 'px',
				right: screenPadding + 'px'
			};

			if ( animated ) {
				info.animate( newInfoPos );
			} else {
				info.css( newInfoPos );
			}
		},

		fitSlide: function (/*animated*/) {
			return this.each( function () {
				var $this = $( this ),
					dimensions = $this.jp_carousel( 'bestFit' ),
					method = 'css',
					max = gallery.jp_carousel( 'slideDimensions' );

				dimensions.left = 0;
				dimensions.top = Math.floor( ( max.height - dimensions.height ) * 0.5 ) + 40;
				$this[ method ]( dimensions );
			} );
		},

		texturize: function ( text ) {
			text = '' + text; // make sure we get a string. Title "1" came in as int 1, for example, which did not support .replace().
			text = text
				.replace( /'/g, '&#8217;' )
				.replace( /&#039;/g, '&#8217;' )
				.replace( /[\u2019]/g, '&#8217;' );
			text = text
				.replace( /"/g, '&#8221;' )
				.replace( /&#034;/g, '&#8221;' )
				.replace( /&quot;/g, '&#8221;' )
				.replace( /[\u201D]/g, '&#8221;' );
			text = text.replace( /([\w]+)=&#[\d]+;(.+?)&#[\d]+;/g, '$1="$2"' ); // untexturize allowed HTML tags params double-quotes
			return $.trim( text );
		},

		initSlides: function ( items, start_index ) {
			if ( items.length < 2 ) {
				$( '.jp-carousel-next-button, .jp-carousel-previous-button' ).hide();
			} else {
				$( '.jp-carousel-next-button, .jp-carousel-previous-button' ).show();
			}

			// Calculate the new src.
			items.each( function (/*i*/) {
				var src_item = $( this ),
					orig_size = src_item.data( 'orig-size' ) || '',
					max = gallery.jp_carousel( 'slideDimensions' ),
					parts = orig_size.split( ',' ),
					medium_file = src_item.data( 'medium-file' ) || '',
					large_file = src_item.data( 'large-file' ) || '',
					src;
				orig_size = { width: parseInt( parts[ 0 ], 10 ), height: parseInt( parts[ 1 ], 10 ) };

// @start-hide-in-jetpack
				 if ( 'undefined' !== typeof wpcom ) {
					src = src_item.attr('src') || src_item.attr('original') || src_item.data('original') || src_item.data('lazy-src');
					if (src.indexOf('imgpress') !== -1) {
						src = src_item.data('orig-file');
					}
					// Square/Circle galleries use a resize param that needs to be removed.
					src = wpcom.carousel.removeResizeFromImageURL( src );
					src = wpcom.carousel.addWidthToImageURL( src, wpcom.carousel.findFirstLargeEnoughWidth( orig_size.width, orig_size.height, max.width, max.height ) );
				} else {

// @end-hide-in-jetpack
				src = src_item.data( 'orig-file' );

				src = gallery.jp_carousel( 'selectBestImageSize', {
					orig_file: src,
					orig_width: orig_size.width,
					orig_height: orig_size.height,
					max_width: max.width,
					max_height: max.height,
					medium_file: medium_file,
					large_file: large_file,
				} );
// @start-hide-in-jetpack
				 } // end else of if ( 'undefined' != typeof wpcom )
// @end-hide-in-jetpack

				// Set the final src
				$( this ).data( 'gallery-src', src );
			} );

			// If the start_index is not 0 then preload the clicked image first.
			if ( 0 !== start_index ) {
				$( '<img/>' )[ 0 ].src = $( items[ start_index ] ).data( 'gallery-src' );
			}

			var useInPageThumbnails =
				items.first().closest( '.tiled-gallery.type-rectangular' ).length > 0;

			// create the 'slide'
			items.each( function ( i ) {
				var src_item = $( this ),
					reblogged       = src_item.data( 'reblogged' ) || 0, // @hide-in-jetpack
					attachment_id = src_item.data( 'attachment-id' ) || 0,
					comments_opened = src_item.data( 'comments-opened' ) || 0,
					image_meta = src_item.data( 'image-meta' ) || {},
					orig_size = src_item.data( 'orig-size' ) || '',
					thumb_size = { width: src_item[ 0 ].naturalWidth, height: src_item[ 0 ].naturalHeight },
					title = src_item.data( 'image-title' ) || '',
					description = src_item.data( 'image-description' ) || '',
					caption = src_item.parents( '.gallery-item' ).find( '.gallery-caption' ).html() || '',
					src = src_item.data( 'gallery-src' ) || '',
					medium_file = src_item.data( 'medium-file' ) || '',
					large_file = src_item.data( 'large-file' ) || '',
					orig_file = src_item.data( 'orig-file' ) || '';

				var tiledCaption = src_item
					.parents( 'div.tiled-gallery-item' )
					.find( 'div.tiled-gallery-caption' )
					.html();
				if ( tiledCaption ) {
					caption = tiledCaption;
				}

				if ( attachment_id && orig_size.length ) {
					title = gallery.jp_carousel( 'texturize', title );
					description = gallery.jp_carousel( 'texturize', description );
					caption = gallery.jp_carousel( 'texturize', caption );

					// Initially, the image is a 1x1 transparent gif.  The preview is shown as a background image on the slide itself.
					var image = $( '<img/>' )
						.attr(
							'src',
							'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
						)
						.css( 'width', '100%' )
						.css( 'height', '100%' );

					var slide = $(
						'<div class="jp-carousel-slide" itemprop="associatedMedia" itemscope itemtype="https://schema.org/ImageObject"></div>'
					)
						.hide()
						.css( {
							//'position' : 'fixed',
							left: i < start_index ? -1000 : gallery.width(),
						} )
						.append( image )
						.appendTo( gallery )
						.data( 'src', src )
						.data( 'title', title )
						.data( 'desc', description )
						.data( 'caption', caption )
						.data( 'attachment-id', attachment_id )
						.data( 'permalink', src_item.parents( 'a' ).attr( 'href' ) )
						.data( 'orig-size', orig_size )
						.data( 'comments-opened', comments_opened )
						.data( 'image-meta', image_meta )
						.data( 'medium-file', medium_file )
						.data( 'large-file', large_file )
						.data( 'orig-file', orig_file )
						.data( 'reblogged', reblogged ) // @hide-in-jetpack
						.data( 'thumb-size', thumb_size );
					if ( useInPageThumbnails ) {
						// Use the image already loaded in the gallery as a preview.
						slide.data( 'preview-image', src_item.attr( 'src' ) ).css( {
							'background-image': 'url("' + src_item.attr( 'src' ) + '")',
							'background-size': '100% 100%',
							'background-position': 'center center',
						} );
					}

					slide.jp_carousel( 'fitSlide', false );
				}
			} );
			return this;
		},

		selectBestImageSize: function ( args ) {
			if ( 'object' !== typeof args ) {
				args = {};
			}

			if ( 'undefined' === typeof args.orig_file ) {
				return '';
			}

			if ( 'undefined' === typeof args.orig_width || 'undefined' === typeof args.max_width ) {
				return args.orig_file;
			}

			if ( 'undefined' === typeof args.medium_file || 'undefined' === typeof args.large_file ) {
				return args.orig_file;
			}

			// Check if the image is being served by Photon (using a regular expression on the hostname).

			var imageLinkParser = document.createElement( 'a' );
			imageLinkParser.href = args.large_file;

			var isPhotonUrl = /^i[0-2].wp.com$/i.test( imageLinkParser.hostname );

			var medium_size_parts = gallery.jp_carousel(
				'getImageSizeParts',
				args.medium_file,
				args.orig_width,
				isPhotonUrl
			);
			var large_size_parts = gallery.jp_carousel(
				'getImageSizeParts',
				args.large_file,
				args.orig_width,
				isPhotonUrl
			);

			var large_width = parseInt( large_size_parts[ 0 ], 10 ),
				large_height = parseInt( large_size_parts[ 1 ], 10 ),
				medium_width = parseInt( medium_size_parts[ 0 ], 10 ),
				medium_height = parseInt( medium_size_parts[ 1 ], 10 );

			// Assign max width and height.
			args.orig_max_width = args.max_width;
			args.orig_max_height = args.max_height;

			// Give devices with a higher devicePixelRatio higher-res images (Retina display = 2, Android phones = 1.5, etc)
			if ( 'undefined' !== typeof window.devicePixelRatio && window.devicePixelRatio > 1 ) {
				args.max_width = args.max_width * window.devicePixelRatio;
				args.max_height = args.max_height * window.devicePixelRatio;
			}

			if ( large_width >= args.max_width || large_height >= args.max_height ) {
				return args.large_file;
			}

			if ( medium_width >= args.max_width || medium_height >= args.max_height ) {
				return args.medium_file;
			}

			if ( isPhotonUrl ) {
				// args.orig_file doesn't point to a Photon url, so in this case we use args.large_file
				// to return the photon url of the original image.
				var largeFileIndex = args.large_file.lastIndexOf( '?' );
				var origPhotonUrl = args.large_file;
				if ( -1 !== largeFileIndex ) {
					origPhotonUrl = args.large_file.substring( 0, largeFileIndex );
					// If we have a really large image load a smaller version
					// that is closer to the viewable size
					if ( args.orig_width > args.max_width || args.orig_height > args.max_height ) {
						origPhotonUrl += '?fit=' + args.orig_max_width + '%2C' + args.orig_max_height;
					}
				}
				return origPhotonUrl;
			}

			return args.orig_file;
		},

		getImageSizeParts: function ( file, orig_width, isPhotonUrl ) {
			var size = isPhotonUrl
				? file.replace( /.*=([\d]+%2C[\d]+).*$/, '$1' )
				: file.replace( /.*-([\d]+x[\d]+)\..+$/, '$1' );

			var size_parts =
				size !== file
					? isPhotonUrl
						? size.split( '%2C' )
						: size.split( 'x' )
					: [ orig_width, 0 ];

			// If one of the dimensions is set to 9999, then the actual value of that dimension can't be retrieved from the url.
			// In that case, we set the value to 0.
			if ( '9999' === size_parts[ 0 ] ) {
				size_parts[ 0 ] = '0';
			}

			if ( '9999' === size_parts[ 1 ] ) {
				size_parts[ 1 ] = '0';
			}

			return size_parts;
		},

// @start-hide-in-jetpack
        show_reblog_box: function () {
            $('#carousel-reblog-box textarea').val(jetpackCarouselStrings.reblog_add_thoughts);
            //t.addClass('selected');
            $('#carousel-reblog-box p.response').remove();
            $('#carousel-reblog-box div.submit, #carousel-reblog-box div.submit span.canceltext').show();
            $('#carousel-reblog-box div.submit input[type=submit]').prop('disabled', false);

            var current = $('.jp-carousel div.selected');
            $('#carousel-reblog-box input#carousel-reblog-post-url').val( current.data('permalink') );
            $('#carousel-reblog-box input#carousel-reblog-post-title').val( $('div.jp-carousel-info').children('h2').text() );

            $('div.jp-carousel-info').append( $('#carousel-reblog-box') ).children().fadeOut('fast');
            $('#carousel-reblog-box').fadeIn('fast');
        },

        hide_reblog_box: function () {
            $( 'div.jp-carousel-info' ).children().not( '#carousel-reblog-box' ).fadeIn( 'fast' );
            $( '#carousel-reblog-box' ).fadeOut( 'fast' );
        },
// @end-hide-in-jetpack
		originalDimensions: function () {
			var splitted = $( this ).data( 'orig-size' ).split( ',' );
			return { width: parseInt( splitted[ 0 ], 10 ), height: parseInt( splitted[ 1 ], 10 ) };
		},

		format: function ( args ) {
			if ( 'object' !== typeof args ) {
				args = {};
			}
			if ( ! args.text || 'undefined' === typeof args.text ) {
				return;
			}
			if ( ! args.replacements || 'undefined' === typeof args.replacements ) {
				return args.text;
			}
			return args.text.replace( /{(\d+)}/g, function ( match, number ) {
				return typeof args.replacements[ number ] !== 'undefined'
					? args.replacements[ number ]
					: match;
			} );
		},

		/**
		 * Returns a number in a fraction format that represents the shutter speed.
		 * @param Number speed
		 * @return String
		 */
		shutterSpeed: function ( speed ) {
			var denominator;

			// round to one decimal if value > 1s by multiplying it by 10, rounding, then dividing by 10 again
			if ( speed >= 1 ) {
				return Math.round( speed * 10 ) / 10 + 's';
			}

			// If the speed is less than one, we find the denominator by inverting
			// the number. Since cameras usually use rational numbers as shutter
			// speeds, we should get a nice round number. Or close to one in cases
			// like 1/30. So we round it.
			denominator = Math.round( 1 / speed );

			return '1/' + denominator + 's';
		},

		parseTitleDesc: function ( value ) {
			if ( ! value.match( ' ' ) && value.match( '_' ) ) {
				return '';
			}

			return value;
		},

		getTitleDesc: function ( data ) {
			var title = '',
				desc = '',
				markup = '',
				target;

			target = $( 'div.jp-carousel-titleanddesc', 'div.jp-carousel-wrap' );
			target.hide();

			title = gallery.jp_carousel( 'parseTitleDesc', data.title ) || '';
			desc = gallery.jp_carousel( 'parseTitleDesc', data.desc ) || '';

			if ( title.length || desc.length ) {
				// Convert from HTML to plain text (including HTML entities decode, etc)
				if ( $( '<div />' ).html( title ).text() === $( '<div />' ).html( desc ).text() ) {
					title = '';
				}

				markup = title.length
					? '<div class="jp-carousel-titleanddesc-title">' + title + '</div>'
					: '';
				markup += desc.length
					? '<div class="jp-carousel-titleanddesc-desc">' + desc + '</div>'
					: '';

				target.html( markup ).fadeIn( 'slow' );
			}

			$( 'div#jp-carousel-comment-form-container' ).css( 'margin-top', '20px' );
			$( 'div#jp-carousel-comments-loading' ).css( 'margin-top', '20px' );
		},

		// updateExif updates the contents of the exif UL (.jp-carousel-image-exif)
		updateExif: function ( meta ) {
			if ( ! meta || 1 !== Number( jetpackCarouselStrings.display_exif ) ) {
				return false;
			}

			var $ul = $( "<ul class='jp-carousel-image-exif'></ul>" );

			$.each( meta, function ( key, val ) {
				if (
					0 === parseFloat( val ) ||
					! val.length ||
					-1 === $.inArray( key, $.makeArray( jetpackCarouselStrings.meta_data ) )
				) {
					return;
				}

				switch ( key ) {
					case 'focal_length':
						val = val + 'mm';
						break;
					case 'shutter_speed':
						val = gallery.jp_carousel( 'shutterSpeed', val );
						break;
					case 'aperture':
						val = 'f/' + val;
						break;
				}

				$ul.append( '<li><h5>' + jetpackCarouselStrings[ key ] + '</h5>' + val + '</li>' );
			} );

			// Update (replace) the content of the ul
			$( 'div.jp-carousel-image-meta ul.jp-carousel-image-exif' ).replaceWith( $ul );
		},

		// updateFullSizeLink updates the contents of the jp-carousel-image-download link
		updateFullSizeLink: function ( current ) {
			if ( ! current || ! current.data ) {
				return false;
			}
			var original,
				origSize = current.data( 'orig-size' ).split( ',' ),
				imageLinkParser = document.createElement( 'a' );

			imageLinkParser.href = current.data( 'src' ).replace( /\?.+$/, '' );

			// Is this a Photon URL?
			if ( imageLinkParser.hostname.match( /^i[\d]{1}.wp.com$/i ) !== null ) {
				original = imageLinkParser.href;
			} else {
				original = current.data( 'orig-file' ).replace( /\?.+$/, '' );
			}

			var permalink = $(
				'<a>' +
					gallery.jp_carousel( 'format', {
						text: jetpackCarouselStrings.download_original,
						replacements: origSize,
					} ) +
					'</a>'
			)
				.addClass( 'jp-carousel-image-download' )
				.attr( 'href', original )
				.attr( 'target', '_blank' );

			// Update (replace) the content of the anchor
			$( 'div.jp-carousel-image-meta a.jp-carousel-image-download' ).replaceWith( permalink );
		},

		testCommentsOpened: function ( opened ) {
			if ( 1 === parseInt( opened, 10 ) ) {
// @start-hide-in-jetpack
				if ( 1 === Number( jetpackCarouselStrings.is_logged_in ) ) {
					$('.jp-carousel-commentlink').fadeIn('fast');
				} else {
// @end-hide-in-jetpack
				$( '.jp-carousel-buttons' ).fadeIn( 'fast' );
// @start-hide-in-jetpack
				}
// @end-hide-in-jetpack
				commentForm.fadeIn( 'fast' );
			} else {
// @start-hide-in-jetpack
				if ( 1 === Number( jetpackCarouselStrings.is_logged_in ) ) {
					$('.jp-carousel-commentlink').fadeOut('fast');
				} else {
// @end-hide-in-jetpack
				$( '.jp-carousel-buttons' ).fadeOut( 'fast' );
// @start-hide-in-jetpack
				}
// @end-hide-in-jetpack
				commentForm.fadeOut( 'fast' );
			}
		},

		getComments: function ( args ) {
			clearInterval( commentInterval );

			if ( 'object' !== typeof args ) {
				return;
			}

			if ( 'undefined' === typeof args.attachment_id || ! args.attachment_id ) {
				return;
			}

			if ( ! args.offset || 'undefined' === typeof args.offset || args.offset < 1 ) {
				args.offset = 0;
			}

			var comments = $( '.jp-carousel-comments' ),
				commentsLoading = $( '#jp-carousel-comments-loading' ).show();

			if ( args.clear ) {
				comments.hide().empty();
			}

			$.ajax( {
				type: 'GET',
				url: jetpackCarouselStrings.ajaxurl,
				dataType: 'json',
				data: {
					action: 'get_attachment_comments',
					nonce: jetpackCarouselStrings.nonce,
					id: args.attachment_id,
					offset: args.offset,
				},
				success: function ( data /*, status, xhr*/ ) {
					if ( args.clear ) {
						comments.fadeOut( 'fast' ).empty();
					}

					$( data ).each( function () {
						var comment = $( '<div></div>' )
							.addClass( 'jp-carousel-comment' )
							.attr( 'id', 'jp-carousel-comment-' + this[ 'id' ] )
							.html(
								'<div class="comment-gravatar">' +
									this[ 'gravatar_markup' ] +
									'</div>' +
									'<div class="comment-author">' +
									this[ 'author_markup' ] +
									'</div>' +
									'<div class="comment-date">' +
									this[ 'date_gmt' ] +
									'</div>' +
									'<div class="comment-content">' +
									this[ 'content' ] +
									'</div>'
							);
						comments.append( comment );

						// Set the interval to check for a new page of comments.
						clearInterval( commentInterval );
						commentInterval = setInterval( function () {
							if (
								$( '.jp-carousel-overlay' ).height() - 150 <
								$( '.jp-carousel-wrap' ).scrollTop() + $( window ).height()
							) {
								gallery.jp_carousel( 'getComments', {
									attachment_id: args.attachment_id,
									offset: args.offset + 10,
									clear: false,
								} );
								clearInterval( commentInterval );
							}
						}, 300 );
					} );

					// Verify (late) that the user didn't repeatldy click the arrows really fast, in which case the requested
					// attachment id might no longer match the current attachment id by the time we get the data back or a now
					// registered infiniscroll event kicks in, so we don't ever display comments for the wrong image by mistake.
					var current = $( '.jp-carousel div.selected' );
					if ( current && current.data && current.data( 'attachment-id' ) != args.attachment_id ) {
						comments.fadeOut( 'fast' );
						comments.empty();
						return;
					}

					// Increase the height of the background, semi-transparent overlay to match the new length of the comments list.
					$( '.jp-carousel-overlay' ).height(
						$( window ).height() +
							titleAndDescription.height() +
							commentForm.height() +
							( comments.height() > 0 ? comments.height() : imageMeta.height() ) +
							200
					);

					comments.show();
					commentsLoading.hide();
				},
				error: function ( xhr, status, error ) {
					// TODO: proper error handling
					console.log( 'Comment get fail...', xhr, status, error );
					comments.fadeIn( 'fast' );
					commentsLoading.fadeOut( 'fast' );
				},
			} );
		},

		postCommentError: function ( args ) {
			if ( 'object' !== typeof args ) {
				args = {};
			}
			if (
				! args.field ||
				'undefined' === typeof args.field ||
				! args.error ||
				'undefined' === typeof args.error
			) {
				return;
			}
			$( '#jp-carousel-comment-post-results' )
				.slideUp( 'fast' )
				.html( '<span class="jp-carousel-comment-post-error">' + args.error + '</span>' )
				.slideDown( 'fast' );
			$( '#jp-carousel-comment-form-spinner' ).hide();
		},

		setCommentIframeSrc: function ( attachment_id ) {
			var iframe = $( '#jp-carousel-comment-iframe' );
			// Set the proper irame src for the current attachment id
			if ( iframe && iframe.length ) {
				iframe.attr( 'src', iframe.attr( 'src' ).replace( /(postid=)\d+/, '$1' + attachment_id ) );
				iframe.attr(
					'src',
					iframe.attr( 'src' ).replace( /(%23.+)?$/, '%23jp-carousel-' + attachment_id )
				);
			}
		},

		clearCommentTextAreaValue: function () {
			var commentTextArea = $( '#jp-carousel-comment-form-comment-field' );
			if ( commentTextArea ) {
				commentTextArea.val( '' );
			}
		},

		nextSlide: function () {
			var slides = this.jp_carousel( 'slides' );
			var selected = this.jp_carousel( 'selectedSlide' );

			if ( selected.length === 0 || ( slides.length > 2 && selected.is( slides.last() ) ) ) {
				return slides.first();
			}

			return selected.next();
		},

		prevSlide: function () {
			var slides = this.jp_carousel( 'slides' );
			var selected = this.jp_carousel( 'selectedSlide' );

			if ( selected.length === 0 || ( slides.length > 2 && selected.is( slides.first() ) ) ) {
				return slides.last();
			}

			return selected.prev();
		},

		loadFullImage: function ( slide ) {
			var image = slide.find( 'img:first' );

			if ( ! image.data( 'loaded' ) ) {
				// If the width of the slide is smaller than the width of the "thumbnail" we're already using,
				// don't load the full image.

				image.on( 'load.jetpack', function () {
					image.off( 'load.jetpack' );
					$( this ).closest( '.jp-carousel-slide' ).css( 'background-image', '' );
				} );

				if (
					! slide.data( 'preview-image' ) ||
					( slide.data( 'thumb-size' ) && slide.width() > slide.data( 'thumb-size' ).width )
				) {
					image
						.attr( 'src', image.closest( '.jp-carousel-slide' ).data( 'src' ) )
						.attr( 'itemprop', 'image' );
				} else {
					image.attr( 'src', slide.data( 'preview-image' ) ).attr( 'itemprop', 'image' );
				}

				image.data( 'loaded', 1 );
			}
		},

		hasMultipleImages: function () {
			return gallery.jp_carousel( 'slides' ).length > 1;
		},
	};

	$.fn.jp_carousel = function ( method ) {
		// ask for the HTML of the gallery
		// Method calling logic
		if ( methods[ method ] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ) );
		} else if ( typeof method === 'object' || ! method ) {
			return methods.open.apply( this, arguments );
		} else {
			$.error( 'Method ' + method + ' does not exist on jQuery.jp_carousel' );
		}
	};

	// register the event listener for starting the gallery
	$( document.body ).on(
		'click.jp-carousel',
		'div.gallery, div.tiled-gallery, ul.wp-block-gallery, ul.blocks-gallery-grid, figure.blocks-gallery-grid, div.wp-block-jetpack-tiled-gallery, a.single-image-gallery',
		function ( e ) {
			if ( ! $( this ).jp_carousel( 'testForData', e.currentTarget ) ) {
				return;
			}
			// If Gallery is made up of individual Image blocks check for custom link before
			// loading carousel.
			if ( $( e.target ).parents().eq( 1 ).hasClass( 'wp-block-image' ) ) {
				var parentHref = $( e.target ).parent().attr( 'href' );

				// If the link does not point to the attachment or media file then assume Image has
				// a custom link so don't load the carousel.
				if (
					parentHref.split( '?' )[ 0 ] !==
						$( e.target ).attr( 'data-orig-file' ).split( '?' )[ 0 ] &&
					parentHref !== $( e.target ).attr( 'data-permalink' )
				) {
					return;
				}
			}

			// Do not open the modal if we are looking at a gallery caption from before WP5, which may contain a link.
			if ( $( e.target ).parent().hasClass( 'gallery-caption' ) ) {
				return;
			}

			// Do not open the modal if we are looking at a caption of a gallery block, which may contain a link.
			if ( $( e.target ).parent().is( 'figcaption' ) ) {
				return;
			}

			// Set height to auto
			// Fix some themes where closing carousel brings view back to top
			$( 'html' ).css( 'height', 'auto' );

			e.preventDefault();

			// Stopping propagation in case there are parent elements
			// with .gallery or .tiled-gallery class
			e.stopPropagation();
			$( this ).jp_carousel( 'open', {
				start_index: $( this )
					.find(
						'.gallery-item, .tiled-gallery-item, .blocks-gallery-item, .tiled-gallery__item, .wp-block-image'
					)
					.index(
						$( e.target ).parents(
							'.gallery-item, .tiled-gallery-item, .blocks-gallery-item, .tiled-gallery__item, .wp-block-image'
						)
					),
			} );
		}
	);

	// handle lightbox (single image gallery) for images linking to 'Attachment Page'
	if ( 1 === Number( jetpackCarouselStrings.single_image_gallery ) ) {
		processSingleImageGallery();
		$( document.body ).on( 'post-load', function () {
			processSingleImageGallery();
		} );
	}

	// Makes carousel work on page load and when back button leads to same URL with carousel hash (ie: no actual document.ready trigger)
	$( window ).on( 'hashchange.jp-carousel', function () {
		var hashRegExp = /jp-carousel-(\d+)/,
			matches,
			attachmentId,
			galleries,
			selectedThumbnail;

		if ( ! window.location.hash || ! hashRegExp.test( window.location.hash ) ) {
			if ( gallery && gallery.opened ) {
				container.jp_carousel( 'close' );
			}

			return;
		}

		if ( window.location.hash === last_known_location_hash && gallery.opened ) {
			return;
		}

		if ( window.location.hash && gallery && ! gallery.opened && history.back ) {
			history.back();
			return;
		}

		last_known_location_hash = window.location.hash;
		matches = window.location.hash.match( hashRegExp );
		attachmentId = parseInt( matches[ 1 ], 10 );
		galleries = $(
			'div.gallery, div.tiled-gallery, a.single-image-gallery, ul.wp-block-gallery, div.wp-block-jetpack-tiled-gallery'
		);

		// Find the first thumbnail that matches the attachment ID in the location
		// hash, then open the gallery that contains it.
		galleries.each( function ( _, galleryEl ) {
			$( galleryEl )
				.find( 'img' )
				.each( function ( imageIndex, imageEl ) {
					if ( $( imageEl ).data( 'attachment-id' ) === parseInt( attachmentId, 10 ) ) {
						selectedThumbnail = { index: imageIndex, gallery: galleryEl };
						return false;
					}
				} );

			if ( selectedThumbnail ) {
				$( selectedThumbnail.gallery ).jp_carousel( 'openOrSelectSlide', selectedThumbnail.index );
				return false;
			}
		} );
	} );

	if ( window.location.hash ) {
		$( window ).trigger( 'hashchange' );
	}
} );

/**
 * jQuery Plugin to obtain touch gestures from iPhone, iPod Touch and iPad, should also work with Android mobile phones (not tested yet!)
 * Common usage: wipe images (left and right to show the previous or next image)
 *
 * @author Andreas Waltl, netCU Internetagentur (http://www.netcu.de)
 * Version 1.1.1, modified to pass the touchmove event to the callbacks.
 */
( function ( $ ) {
	$.fn.touchwipe = function ( settings ) {
		var config = {
			threshold: 150, // Required min distance traveled to be considered swipe.
			restraint: 100, // Maximum distance allowed at the same time in perpendicular direction.
			allowedTime: 300, // Maximum time allowed to travel that distance.
			wipeLeft: function (/*e*/) {},
			wipeRight: function (/*e*/) {},
			wipeUp: function (/*e*/) {},
			wipeDown: function (/*e*/) {},
			preventDefaultEvents: true,
		};
		var startTime, elapsedTime;
		if ( settings ) {
			$.extend( config, settings );
		}

		this.each( function () {
			var startX;
			var startY;
			var isMoving = false;

			function cancelTouch() {
				this.removeEventListener( 'touchmove', onTouchMove );
				startX = null;
				isMoving = false;
			}

			function onTouchMove( e ) {
				if ( config.preventDefaultEvents ) {
					e.preventDefault();
				}
				if ( isMoving ) {
					var x = e.touches[ 0 ].pageX;
					var y = e.touches[ 0 ].pageY;
					var dx = startX - x;
					var dy = startY - y;
					elapsedTime = new Date().getTime() - startTime;
					if ( elapsedTime <= config.allowedTime ) {
						if ( Math.abs( dx ) >= config.threshold && Math.abs( dy ) <= config.restraint ) {
							cancelTouch();
							if ( dx > 0 ) {
								config.wipeLeft( e );
							} else {
								config.wipeRight( e );
							}
						} else if ( Math.abs( dy ) >= config.threshold && Math.abs( dx ) <= config.restraint ) {
							cancelTouch();
							if ( dy > 0 ) {
								config.wipeDown( e );
							} else {
								config.wipeUp( e );
							}
						}
					}
				}
			}

			function onTouchStart( e ) {
				if ( e.touches.length === 1 ) {
					startTime = new Date().getTime();
					startX = e.touches[ 0 ].pageX;
					startY = e.touches[ 0 ].pageY;
					isMoving = true;
					this.addEventListener( 'touchmove', onTouchMove, false );
				}
			}
			if ( 'ontouchstart' in document.documentElement ) {
				this.addEventListener( 'touchstart', onTouchStart, false );
			}
		} );

		return this;
	};
} )( jQuery );
;
var ak_js = document.getElementById( "ak_js" );

if ( ! ak_js ) {
	ak_js = document.createElement( 'input' );
	ak_js.setAttribute( 'id', 'ak_js' );
	ak_js.setAttribute( 'name', 'ak_js' );
	ak_js.setAttribute( 'type', 'hidden' );
}
else {
	ak_js.parentNode.removeChild( ak_js );
}

ak_js.setAttribute( 'value', ( new Date() ).getTime() );

var commentForm = document.getElementById( 'commentform' );

if ( commentForm ) {
	commentForm.appendChild( ak_js );
}
else {
	var replyRowContainer = document.getElementById( 'replyrow' );

	if ( replyRowContainer ) {
		var children = replyRowContainer.getElementsByTagName( 'td' );

		if ( children.length > 0 ) {
			children[0].appendChild( ak_js );
		}
	}
};
/* global WPCOM_sharing_counts, grecaptcha */

// NOTE: This file intentionally does not make use of polyfills or libraries,
// including jQuery. Please keep all code as IE11-compatible vanilla ES5, and
// ensure everything is inside an IIFE to avoid global namespace pollution.
// Code follows WordPress browser support guidelines. For an up to date list,
// see https://make.wordpress.org/core/handbook/best-practices/browser-support/

( function () {
	var currentScript = document.currentScript;
	var recaptchaScriptAdded = false;

	// -------------------------- UTILITY FUNCTIONS -------------------------- //

	// Helper function to load an external script.
	function loadScript( url ) {
		var script = document.createElement( 'script' );
		var prev = currentScript || document.getElementsByTagName( 'script' )[ 0 ];
		script.setAttribute( 'async', true );
		script.setAttribute( 'src', url );
		prev.parentNode.insertBefore( script, prev );
	}

	// Helper matches function (not a polyfill), compatible with IE 11.
	function matches( el, sel ) {
		if ( Element.prototype.matches ) {
			return el.matches( sel );
		}

		if ( Element.prototype.msMatchesSelector ) {
			return el.msMatchesSelector( sel );
		}
	}

	// Helper closest parent node function (not a polyfill) based on
	// https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#Polyfill
	function closest( el, sel ) {
		if ( el.closest ) {
			return el.closest( sel );
		}

		var current = el;

		do {
			if ( matches( current, sel ) ) {
				return current;
			}
			current = current.parentElement || current.parentNode;
		} while ( current !== null && current.nodeType === 1 );

		return null;
	}

	// Helper function to iterate over a NodeList
	// (since IE 11 doesn't have NodeList.prototype.forEach)
	function forEachNode( list, fn ) {
		for ( var i = 0; i < list.length; i++ ) {
			var node = list[ i ];
			fn( node, i, list );
		}
	}

	// Helper function to remove a node from the DOM.
	function removeNode( node ) {
		if ( node && node.parentNode ) {
			node.parentNode.removeChild( node );
		}
	}

	// Helper functions to show/hide a node, and check its status.
	function hideNode( node ) {
		if ( node ) {
			node.style.display = 'none';
		}
	}

	function showNode( node ) {
		if ( node ) {
			node.style.removeProperty( 'display' );
		}
	}

	function isNodeHidden( node ) {
		return ! node || node.style.display === 'none';
	}

	// ------------------------------- CLASSES ------------------------------- //

	var PANE_SELECTOR = '.sharing-hidden .inner';
	var PANE_DATA_ATTR = 'data-sharing-more-button-id';

	// Implements a MoreButton class, which controls the lifecycle and behavior
	// of a "more" button and its dialog.
	function MoreButton( buttonEl ) {
		this.button = buttonEl;
		this.pane = closest( buttonEl, 'div' ).querySelector( PANE_SELECTOR );
		this.openedBy = null;
		this.recentlyOpenedByHover = false;

		MoreButton.instances.push( this );
		this.pane.setAttribute( PANE_DATA_ATTR, MoreButton.instances.length - 1 );

		this.attachHandlers();
	}

	// Keep a reference to each instance, so we can get back to it from the DOM.
	MoreButton.instances = [];

	// Delay time configs.
	MoreButton.hoverOpenDelay = 200;
	MoreButton.recentOpenDelay = 400;
	MoreButton.hoverCloseDelay = 300;

	// Use this to avoid creating new instances for buttons which already have one.
	MoreButton.instantiateOrReuse = function ( buttonEl ) {
		var pane = closest( buttonEl, 'div' ).querySelector( PANE_SELECTOR );
		var paneId = pane && pane.getAttribute( PANE_DATA_ATTR );

		var existingInstance = MoreButton.instances[ paneId ];
		if ( existingInstance ) {
			return existingInstance;
		}

		return new MoreButton( buttonEl );
	};

	// Retrieve a button instance from the pane DOM element.
	MoreButton.getButtonInstanceFromPane = function ( paneEl ) {
		var paneId = paneEl && paneEl.getAttribute( PANE_DATA_ATTR );
		return MoreButton.instances[ paneId ];
	};

	// Close all open More Button dialogs.
	MoreButton.closeAll = function () {
		for ( var i = 0; i < MoreButton.instances.length; i++ ) {
			MoreButton.instances[ i ].close();
		}
	};

	MoreButton.prototype.open = function () {
		var offset;
		var offsetParent;
		var parentOffset = [ 0, 0 ];

		function getOffsets( el ) {
			var rect = el.getBoundingClientRect();
			return [
				rect.left + ( window.scrollX || window.pageXOffset || 0 ),
				rect.top + ( window.scrollY || window.pageYOffset || 0 ),
			];
		}

		function getStyleValue( el, prop ) {
			return parseInt( getComputedStyle( el ).getPropertyValue( prop ) || 0 );
		}

		offset = getOffsets( this.button );
		offsetParent = this.button.offsetParent || document.documentElement;

		while (
			offsetParent &&
			( offsetParent === document.body || offsetParent === document.documentElement ) &&
			getComputedStyle( offsetParent ).getPropertyValue( 'position' ) === 'static'
		) {
			offsetParent = offsetParent.parentNode;
		}

		if ( offsetParent && offsetParent !== this.button && offsetParent.nodeType === 1 ) {
			parentOffset = getOffsets( offsetParent );
			parentOffset = [
				parentOffset[ 0 ] + getStyleValue( offsetParent, 'border-left-width' ),
				parentOffset[ 1 ] + getStyleValue( offsetParent, 'border-top-width' ),
			];
		}

		var positionLeft =
			offset[ 0 ] - parentOffset[ 0 ] - getStyleValue( this.button, 'margin-left' );
		var positionTop = offset[ 1 ] - parentOffset[ 1 ] - getStyleValue( this.button, 'margin-top' );

		this.pane.style.left = positionLeft + 'px';
		this.pane.style.top = positionTop + this.button.offsetHeight + 3 + 'px';

		showNode( this.pane );
	};

	MoreButton.prototype.close = function () {
		hideNode( this.pane );
		this.openedBy = null;
	};

	MoreButton.prototype.toggle = function () {
		if ( isNodeHidden( this.pane ) ) {
			this.open();
		} else {
			this.close();
		}
	};

	MoreButton.prototype.resetCloseTimer = function () {
		clearTimeout( this.closeTimer );
		this.closeTimer = setTimeout( this.close.bind( this ), MoreButton.hoverCloseDelay );
	};

	MoreButton.prototype.attachHandlers = function () {
		this.buttonClick = function ( event ) {
			event.preventDefault();
			event.stopPropagation();

			this.openedBy = 'click';
			clearTimeout( this.openTimer );
			clearTimeout( this.closeTimer );

			closeEmailDialog();

			if ( this.recentlyOpenedByHover ) {
				this.recentlyOpenedByHover = false;
				clearTimeout( this.hoverOpenTimer );
				this.open();
			} else {
				this.toggle();
			}
		}.bind( this );

		this.buttonEnter = function () {
			if ( ! this.openedBy ) {
				this.openTimer = setTimeout(
					function () {
						closeEmailDialog();
						this.open();
						this.openedBy = 'hover';
						this.recentlyOpenedByHover = true;
						this.hoverOpenTimer = setTimeout(
							function () {
								this.recentlyOpenedByHover = false;
							}.bind( this ),
							MoreButton.recentOpenDelay
						);
					}.bind( this ),
					MoreButton.hoverOpenDelay
				);
			}
			clearTimeout( this.closeTimer );
		}.bind( this );

		this.buttonLeave = function () {
			if ( this.openedBy === 'hover' ) {
				this.resetCloseTimer();
			}
			clearTimeout( this.openTimer );
		}.bind( this );

		this.paneEnter = function () {
			clearTimeout( this.closeTimer );
		}.bind( this );

		this.paneLeave = function () {
			if ( this.openedBy === 'hover' ) {
				this.resetCloseTimer();
			}
		}.bind( this );

		this.documentClick = function () {
			this.close();
		}.bind( this );

		this.button.addEventListener( 'click', this.buttonClick );
		document.addEventListener( 'click', this.documentClick );

		if ( document.ontouchstart === undefined ) {
			// Non-touchscreen device: use hover/mouseout with delay
			this.button.addEventListener( 'mouseenter', this.buttonEnter );
			this.button.addEventListener( 'mouseleave', this.buttonLeave );
			this.pane.addEventListener( 'mouseenter', this.paneEnter );
			this.pane.addEventListener( 'mouseleave', this.paneLeave );
		}
	};

	// ---------------------------- SHARE COUNTS ---------------------------- //

	if ( window.sharing_js_options && window.sharing_js_options.counts ) {
		var WPCOMSharing = {
			done_urls: [],
			get_counts: function () {
				var url, requests, id, service, service_request;

				if ( 'undefined' === typeof WPCOM_sharing_counts ) {
					return;
				}

				for ( url in WPCOM_sharing_counts ) {
					id = WPCOM_sharing_counts[ url ];

					if ( 'undefined' !== typeof WPCOMSharing.done_urls[ id ] ) {
						continue;
					}

					requests = {
						// Pinterest handles share counts for both http and https
						pinterest: [
							window.location.protocol +
								'//api.pinterest.com/v1/urls/count.json?callback=WPCOMSharing.update_pinterest_count&url=' +
								encodeURIComponent( url ),
						],
						// Facebook protocol summing has been shown to falsely double counts, so we only request the current URL
						facebook: [
							window.location.protocol +
								'//graph.facebook.com/?callback=WPCOMSharing.update_facebook_count&ids=' +
								encodeURIComponent( url ),
						],
					};

					for ( service in requests ) {
						if ( ! document.querySelector( 'a[data-shared=sharing-' + service + '-' + id + ']' ) ) {
							continue;
						}

						while ( ( service_request = requests[ service ].pop() ) ) {
							loadScript( service_request );
						}

						if ( window.sharing_js_options.is_stats_active ) {
							WPCOMSharing.bump_sharing_count_stat( service );
						}
					}

					WPCOMSharing.done_urls[ id ] = true;
				}
			},

			// get the version of the url that was stored in the dom
			get_permalink: function ( url ) {
				if ( 'https:' === window.location.protocol ) {
					url = url.replace( /^http:\/\//i, 'https://' );
				} else {
					url = url.replace( /^https:\/\//i, 'http://' );
				}

				return url;
			},
			update_facebook_count: function ( data ) {
				var url, permalink;

				if ( ! data ) {
					return;
				}

				for ( url in data ) {
					if (
						! Object.prototype.hasOwnProperty.call( data, url ) ||
						! data[ url ].share ||
						! data[ url ].share.share_count
					) {
						continue;
					}

					permalink = WPCOMSharing.get_permalink( url );

					if ( ! ( permalink in WPCOM_sharing_counts ) ) {
						continue;
					}

					WPCOMSharing.inject_share_count(
						'sharing-facebook-' + WPCOM_sharing_counts[ permalink ],
						data[ url ].share.share_count
					);
				}
			},
			update_pinterest_count: function ( data ) {
				if ( 'undefined' !== typeof data.count && data.count * 1 > 0 ) {
					WPCOMSharing.inject_share_count(
						'sharing-pinterest-' + WPCOM_sharing_counts[ data.url ],
						data.count
					);
				}
			},
			inject_share_count: function ( id, count ) {
				forEachNode( document.querySelectorAll( 'a[data-shared=' + id + '] > span' ), function (
					span
				) {
					var countNode = span.querySelector( '.share-count' );
					removeNode( countNode );
					var newNode = document.createElement( 'span' );
					newNode.className = 'share-count';
					newNode.textContent = WPCOMSharing.format_count( count );
					span.appendChild( newNode );
				} );
			},
			format_count: function ( count ) {
				if ( count < 1000 ) {
					return count;
				}
				if ( count >= 1000 && count < 10000 ) {
					return String( count ).substring( 0, 1 ) + 'K+';
				}
				return '10K+';
			},
			bump_sharing_count_stat: function ( service ) {
				new Image().src =
					document.location.protocol +
					'//pixel.wp.com/g.gif?v=wpcom-no-pv&x_sharing-count-request=' +
					service +
					'&r=' +
					Math.random();
			},
		};
		window.WPCOMSharing = WPCOMSharing;
	}

	// ------------------------ BUTTON FUNCTIONALITY ------------------------ //

	function shareIsEmail( val ) {
		return /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i.test(
			val
		);
	}

	function closeEmailDialog() {
		var dialog = document.querySelector( '#sharing_email' );
		hideNode( dialog );
	}

	// Sharing initialization.
	// Will run immediately or on `DOMContentLoaded`, depending on current page status.
	function init() {
		// Move email dialog to end of body.
		var emailDialog = document.querySelector( '#sharing_email' );
		if ( emailDialog ) {
			document.body.appendChild( emailDialog );
		}

		WPCOMSharing_do();
	}
	if ( document.readyState !== 'loading' ) {
		init();
	} else {
		document.addEventListener( 'DOMContentLoaded', init );
	}

	// Set up sharing again whenever a new post loads, to pick up any new buttons.
	document.body.addEventListener( 'is.post-load', WPCOMSharing_do );

	// Set up sharing, updating counts and adding all button functionality.
	function WPCOMSharing_do() {
		if ( window.WPCOMSharing ) {
			window.WPCOMSharing.get_counts();
		}

		forEachNode( document.querySelectorAll( '.sharedaddy a' ), function ( anchor ) {
			var href = anchor.getAttribute( 'href' );
			if ( href && href.indexOf( 'share=' ) !== -1 && href.indexOf( '&nb=1' ) === -1 ) {
				anchor.setAttribute( 'href', href + '&nb=1' );
			}
		} );

		// Show hidden buttons

		// Touchscreen device: use click.
		// Non-touchscreen device: use click if not already appearing due to a hover event

		forEachNode( document.querySelectorAll( '.sharedaddy a.sharing-anchor' ), function (
			buttonEl
		) {
			MoreButton.instantiateOrReuse( buttonEl );
		} );

		if ( document.ontouchstart !== undefined ) {
			document.body.classList.add( 'jp-sharing-input-touch' );
		}

		// Add click functionality
		forEachNode( document.querySelectorAll( '.sharedaddy ul' ), function ( group ) {
			if ( group.getAttribute( 'data-sharing-events-added' ) === 'true' ) {
				return;
			}
			group.setAttribute( 'data-sharing-events-added', 'true' );

			var printUrl = function ( uniqueId, urlToPrint ) {
				var iframe = document.createElement( 'iframe' );
				iframe.setAttribute(
					'style',
					'position:fixed; top:100; left:100; height:1px; width:1px; border:none;'
				);
				iframe.setAttribute( 'id', 'printFrame-' + uniqueId );
				iframe.setAttribute( 'name', iframe.getAttribute( 'id' ) );
				iframe.setAttribute( 'src', urlToPrint );
				iframe.setAttribute(
					'onload',
					'frames["printFrame-' +
						uniqueId +
						'"].focus();frames["printFrame-' +
						uniqueId +
						'"].print();'
				);
				document.body.appendChild( iframe );
			};

			// Print button
			forEachNode( group.querySelectorAll( 'a.share-print' ), function ( printButton ) {
				printButton.addEventListener( 'click', function ( event ) {
					event.preventDefault();
					event.stopPropagation();

					var ref = printButton.getAttribute( 'href' ) || '';
					var doPrint = function () {
						if ( ref.indexOf( '#print' ) === -1 ) {
							var uid = new Date().getTime();
							printUrl( uid, ref );
						} else {
							window.print();
						}
					};

					// Is the button in a dropdown?
					var pane = closest( printButton, PANE_SELECTOR );
					if ( pane ) {
						var moreButton = MoreButton.getButtonInstanceFromPane( pane );
						if ( moreButton ) {
							moreButton.close();
							doPrint();
						}
					} else {
						doPrint();
					}
				} );
			} );

			// Press This button
			forEachNode( group.querySelectorAll( 'a.share-press-this' ), function ( pressThisButton ) {
				pressThisButton.addEventListener( 'click', function ( event ) {
					event.preventDefault();
					event.stopPropagation();

					var s = '';

					if ( window.getSelection ) {
						s = window.getSelection();
					} else if ( document.getSelection ) {
						s = document.getSelection();
					} else if ( document.selection ) {
						s = document.selection.createRange().text;
					}

					if ( s ) {
						var href = pressThisButton.getAttribute( 'href' );
						pressThisButton.setAttribute( 'href', href + '&sel=' + encodeURI( s ) );
					}

					if (
						! window.open(
							pressThisButton.getAttribute( 'href' ),
							't',
							'toolbar=0,resizable=1,scrollbars=1,status=1,width=720,height=570'
						)
					) {
						document.location.href = pressThisButton.getAttribute( 'href' );
					}
				} );
			} );

			// Email button
			forEachNode( group.querySelectorAll( 'a.share-email' ), function ( emailButton ) {
				var dialog = document.querySelector( '#sharing_email' );

				emailButton.addEventListener( 'click', function ( event ) {
					event.preventDefault();
					event.stopPropagation();

					// Load reCAPTCHA if needed.
					if ( typeof grecaptcha !== 'object' && ! recaptchaScriptAdded ) {
						var configEl = document.querySelector( '.g-recaptcha' );

						if ( configEl && configEl.getAttribute( 'data-lazy' ) === 'true' ) {
							recaptchaScriptAdded = true;
							loadScript( decodeURI( configEl.getAttribute( 'data-url' ) ) );
						}
					}

					var url = emailButton.getAttribute( 'href' );
					var currentDomain = window.location.protocol + '//' + window.location.hostname + '/';
					if ( url.indexOf( currentDomain ) !== 0 ) {
						return true;
					}

					if ( ! isNodeHidden( dialog ) ) {
						closeEmailDialog();
						return;
					}

					removeNode( document.querySelector( '#sharing_email .response' ) );

					var form = document.querySelector( '#sharing_email form' );
					showNode( form );
					form.querySelector( 'input[type=submit]' ).removeAttribute( 'disabled' );
					showNode( form.querySelector( 'a.sharing_cancel' ) );

					// Reset reCATPCHA if exists.
					if (
						'object' === typeof grecaptcha &&
						'function' === typeof grecaptcha.reset &&
						window.___grecaptcha_cfg.count
					) {
						grecaptcha.reset();
					}

					// Show dialog
					var rect = emailButton.getBoundingClientRect();
					var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || 0;
					var scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
					dialog.style.left = scrollLeft + rect.left + 'px';
					dialog.style.top = scrollTop + rect.top + rect.height + 'px';
					showNode( dialog );

					// Close all open More Button dialogs.
					MoreButton.closeAll();
				} );

				// Hook up other buttons
				dialog.querySelector( 'a.sharing_cancel' ).addEventListener( 'click', function ( event ) {
					event.preventDefault();
					event.stopPropagation();

					hideNode( dialog.querySelector( '.errors' ) );
					hideNode( dialog );
					hideNode( document.querySelector( '#sharing_background' ) );
				} );

				var submitButton = dialog.querySelector( 'input[type=submit]' );
				submitButton.addEventListener( 'click', function ( event ) {
					event.preventDefault();
					event.stopPropagation();

					var form = closest( submitButton, 'form' );
					var source_email_input = form.querySelector( 'input[name=source_email]' );
					var target_email_input = form.querySelector( 'input[name=target_email]' );

					// Disable buttons + enable loading icon
					submitButton.setAttribute( 'disabled', true );
					hideNode( form.querySelector( 'a.sharing_cancel' ) );
					forEachNode( form.querySelectorAll( 'img.loading' ), function ( img ) {
						showNode( img );
					} );

					hideNode( form.querySelector( '.errors' ) );

					forEachNode( form.querySelectorAll( '.error' ), function ( node ) {
						node.classList.remove( 'error' );
					} );

					if ( ! shareIsEmail( source_email_input.value ) ) {
						source_email_input.classList.add( 'error' );
					}

					if ( ! shareIsEmail( target_email_input.value ) ) {
						target_email_input.classList.add( 'error' );
					}

					if ( ! form.querySelector( '.error' ) ) {
						// Encode form data. This would be much easier if we could rely on URLSearchParams...
						var params = [];
						for ( var i = 0; i < form.elements.length; i++ ) {
							if ( form.elements[ i ].name ) {
								// Encode each form element into a URI-compatible string.
								var encoded =
									encodeURIComponent( form.elements[ i ].name ) +
									'=' +
									encodeURIComponent( form.elements[ i ].value );
								// In x-www-form-urlencoded, spaces should be `+`, not `%20`.
								params.push( encoded.replace( '%20', '+' ) );
							}
						}
						var data = params.join( '&' );

						// AJAX send the form
						var request = new XMLHttpRequest();
						request.open( 'POST', emailButton.getAttribute( 'href' ), true );
						request.setRequestHeader(
							'Content-Type',
							'application/x-www-form-urlencoded; charset=UTF-8'
						);
						request.setRequestHeader( 'x-requested-with', 'XMLHttpRequest' );

						request.onreadystatechange = function () {
							if ( this.readyState === XMLHttpRequest.DONE && this.status === 200 ) {
								forEachNode( form.querySelectorAll( 'img.loading' ), function ( img ) {
									hideNode( img );
								} );

								if ( this.response === '1' || this.response === '2' || this.response === '3' ) {
									showNode( dialog.querySelector( '.errors-' + this.response ) );
									dialog.querySelector( 'input[type=submit]' ).removeAttribute( 'disabled' );
									showNode( dialog.querySelector( 'a.sharing_cancel' ) );

									if ( typeof grecaptcha === 'object' && typeof grecaptcha.reset === 'function' ) {
										grecaptcha.reset();
									}
								} else {
									hideNode( form );
									var temp = document.createElement( 'div' );
									temp.innerHTML = this.response;
									dialog.appendChild( temp.firstChild );
									showNode( dialog.querySelector( 'a.sharing_cancel' ) );
									var closeButton = dialog.querySelector( '.response a.sharing_cancel' );
									if ( closeButton ) {
										closeButton.addEventListener( 'click', function ( event ) {
											event.preventDefault();
											event.stopPropagation();

											closeEmailDialog();
											hideNode( document.querySelector( '#sharing_background' ) );
										} );
									}
								}
							}
						};

						request.send( data );

						return;
					}

					forEachNode( dialog.querySelectorAll( 'img.loading' ), function ( img ) {
						hideNode( img );
					} );
					submitButton.removeAttribute( 'disabled' );
					showNode( dialog.querySelector( 'a.sharing_cancel' ) );
					forEachNode( dialog.querySelectorAll( '.errors-1' ), function ( error ) {
						showNode( error );
					} );
				} );
			} );
		} );

		forEachNode(
			document.querySelectorAll( 'li.share-email, li.share-custom a.sharing-anchor' ),
			function ( node ) {
				node.classList.add( 'share-service-visible' );
			}
		);
	}
} )();
;
