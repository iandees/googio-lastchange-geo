 /*!
 * jQuery UI Map 0.1.2
 * http://code.google.com/p/jquery-ui-map/
 *
 * Copyright (c) 2010 Johan Säll Larsson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Depends:
 *      jquery.ui.core.js
 *      jquery.ui.widget.js
 */

( function($) {
	
	jQuery.fn.extend( {
		
		click: function(callback) { 
			return this.addEventListener('click', callback);
		},
		
		rightclick: function(callback) {
			return this.addEventListener('rightclick', callback);
		},
		
		dblclick: function(callback) {
			return this.addEventListener('dblclick', callback);
		},
		
		mouseover: function(callback) {
			return this.addEventListener('mouseover', callback);
		},
		
		mouseout: function(callback) {
			return this.addEventListener('mouseout', callback);
		},
		
		drag: function(callback) {
			return this.addEventListener('drag', callback );
		},
		
		dragend: function(callback) {
			return this.addEventListener('dragend', callback );
		},
		/*
		hide: function() {
			if ( this.get(0) instanceof google.maps.MVCObject ) {
				this.get(0).setVisible(false);
			} else {
				this.css('display', 'none')
			}
		},
		
		show: function() {
			if ( this.get(0) instanceof google.maps.MVCObject ) {
				this.get(0).setVisible(true);
			} else {
				this.css('display', 'block')
			}	
		},*/
		
		triggerEvent: function(type) {
			google.maps.event.trigger(this.get(0), type);		
		},
		
		addEventListener: function(type, callback) {
			if ( this.get(0) instanceof google.maps.MVCObject ) {
				google.maps.event.addListener(this.get(0), type, callback );
			} else {
				this.bind(type, callback);	
			}
			return this;
		},
		
		addListenerOnce: function(type, callback) {
			if ( this.get(0) instanceof google.maps.MVCObject ) {
				google.maps.event.addListenerOnce(this.get(0), type, callback );
			}
			return this;
		}
		
	});

	var maps = [], markers = [], layers = [], bounds = [], directions = [], dservices = [];
	
	function unwrap(el) {
		if ( el instanceof jQuery ) {
			return el.get(0);
		} else if ( el instanceof Object ) {
			return el;
		}
		return document.getElementById(el);
	}
	
	function invoke( callback ) {
		if ( $.isFunction(callback) ) {
			callback.apply(this, Array.prototype.slice.call(arguments, 1));
			return true;
		} else {
			return false;
		}
	}
	
	$.widget( "ui.gmap", {
			
			options: {
				backgroundColor : null,
				center: new google.maps.LatLng(0.0, 0.0),
				disableDefaultUI: false,
				disableDoubleClickZoom: false,
				draggable: true,
				draggableCursor: null,
				draggingCursor: null,
				keyboardShortcuts: true,
				mapTypeControl: true,
				mapTypeControlOptions: null,
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				navigationControl: true,
				navigationControlOptions: null,
				noClear: false,
				scaleControl: false,
				scaleControlOptions: null,
				scrollwheel: false,
				streetViewControl: true,
				streetViewControlOptions: null,
				zoom: 5,
				callback: null
			},
			
			_create: function() {
				var id = this.element.attr('id');
				maps[id] = new google.maps.Map( this.element.get(0), this.options );
				markers[id] = new Array;
				bounds[id] = new google.maps.LatLngBounds();
				directions[id] = new google.maps.DirectionsRenderer();
				dservices[id] = new google.maps.DirectionsService();
				return $(maps[id]);
			},
			
			_init: function() {
				//var self = this;
				//google.maps.event.addListenerOnce(self.getMap(), 'bounds_changed', function() {
					invoke(this.options.callback, this.getMap() );
				//});
			},
			
			addSidebar: function(panel, position) {
				this.getMap().controls[position].push(unwrap(panel));
			},
			
			addMarker: function( markerOptions, callback ) {
				var marker = new google.maps.Marker( jQuery.extend( { 'map': this.getMap(), 'bound':false }, markerOptions) );
				invoke(callback, this.getMap(), marker );
				this.getMarkers().push( marker );
				if ( marker.bound ) {
					this.addBound(marker.getPosition());
				}
				return $(marker);
			},
			
			addInfoWindow: function (infoWindowOptions, callback) {
				var iw = new google.maps.InfoWindow(infoWindowOptions);
				invoke(callback, iw);
				return $(iw);
			},
			
			loadJSON: function( url, data, callback ) {
				$.getJSON( url, data, function(data) { 
					$.each( data.markers, function(i, m) {
						invoke(callback, i, m );
					});
				});
			},
			
			loadHTML: function ( type, clazz, callback ) {
				var self = this;
				switch ( type ) {
					//FIXME error in rdfa
					//http://www.google.com/support/webmasters/bin/answer.py?hl=sv&answer=146861
					case 'rdfa':
						var geoPoints = [];
						$(clazz+' [property="geo:lat_long"]').each( function() {
							geoPoints.push(($(this).attr('content')).split(','));												
						});
						$(clazz).each( function(index) {
							var node = $(this);
							var markerOptions = { 'position': new google.maps.LatLng(geoPoints[index][0], geoPoints[index][1]) };
							if ( !invoke(callback, markerOptions, node, index) ) {
								var summary = node.find('.summary');
								self.addMarker( markerOptions, function(map, marker) {
									var iw = self.addInfoWindow({ 'position':marker.getPosition(), 'content': summary.html() });
									$(marker).click(function() {
										iw.get(0).open(self.getMap(), marker);
										map.panTo(marker.getPosition());
									});
									summary.click( function() {
										$(marker).triggerEvent('click');
										return false;
									});
								});
							}
						});
					break;
					case 'microformat':
						$(clazz).each( function(index) {
							var node = $(this);
							var markerOptions = { 'position': new google.maps.LatLng(node.find('.latitude').attr('title'), node.find('.longitude').attr('title')) };
							if ( !invoke(callback, markerOptions, node, index) ) {
								var summary = node.find('.summary');
								self.addMarker( markerOptions, function(map, marker) {
									var iw = self.addInfoWindow({ 'position':marker.getPosition(), 'content': summary.html() });
									$(marker).click(function() {
										iw.get(0).open(self.getMap(), marker);
										map.panTo(marker.getPosition());
									});
									summary.click( function() {
										$(marker).triggerEvent('click');
										return false;
									});
								});
							}
						});
					break;
					//FIXME: Seriously fix this
					case 'microdata':
						$(clazz).each( function() {
							var node = $(this);
							$(node).children().each( function(index) {
								if ( $(this).attr('itemprop') == 'geo' ) {
									var latlng = $(this).html().split(';');
									var markerOptions = { 'position': new google.maps.LatLng(latlng[0], latlng[1]) };
									if ( !invoke(callback, markerOptions, node, index) ) {
										var summary = node.find('.summary');
										self.addMarker( markerOptions, function(map, marker) {
											var iw = self.addInfoWindow({ 'position':marker.getPosition(), 'content': summary.html() });
											$(marker).click(function() {
												iw.get(0).open(map, marker);
												map.panTo(marker.getPosition());
											});
											summary.click( function() {
												$(marker).triggerEvent('click');
												return false;
											});
										});
									}
									
								}
							});
						});
					break;
				}
				
			},
			
			loadFusion: function(id, fusionTablesLayerOptions) {
				var layer = new google.maps.FusionTablesLayer(id, fusionTablesLayerOptions);
				layer.setMap(this.getMap());
			},
			
			//FIXME: Should be diff. params
			loadDirections: function(panel, directionsOpts, successCallback, errorCallback) { 
				var self = this;
				var directionsDisplay = directions[this.element.attr('id')];
				var directionsService = dservices[this.element.attr('id')];
				directionsService.route( directionsOpts, function(response, status) {
					if ( status == google.maps.DirectionsStatus.OK ) {
						directionsDisplay.setMap(self.getMap());
						directionsDisplay.setPanel(unwrap(panel));
						directionsDisplay.setDirections(response);
						invoke(successCallback, response);
					} else {
						directionsDisplay.setMap(null);
						invoke(errorCallback, status);
					}
				});
			},
			
			loadStreetViewPanorama: function(panel, streetViewPanoramaOptions) {
				var panorama = new google.maps.StreetViewPanorama(unwrap(panel), streetViewPanoramaOptions);
				this.getMap().setStreetView(panorama);
			},
			
			search: function(request, successCallback, errorCallback) {
				var geocoder = new google.maps.Geocoder();
				geocoder.geocode( request, function(results, status) {
					if ( status == google.maps.GeocoderStatus.OK ) {
						invoke(successCallback, results);
					} else {
						invoke(errorCallback, status);
					}
				});
			},
			
			clearMarkers: function() {
				var markers = this.getMarkers();
				$.each( markers, function(i, v) { 
					google.maps.event.clearInstanceListeners(markers[i]);
					markers[i].setMap( null );
				});
				markers = new Array();
			},
			
			toggleByCategory: function(category, isCategoryCallback, nonCategoryCallback) {
				var markers = this.getMarkers();
				$.each( markers, function(i, marker) { 
					if ( marker.category == category ) {
						invoke(isCategoryCallback, marker);
					} else {
						invoke(nonCategoryCallback, marker);
					}
				});
			},
			
			getMap: function() {
				return maps[this.element.attr('id')];
			},
			
			getMarkers: function() {
				return markers[this.element.attr('id')];
			},
			
			addBound: function(latLng) {
				var bound = bounds[this.element.attr('id')];
				bound.extend(latLng);
				this.getMap().fitBounds(bound);
			},
						
			destroy: function() {
				this.clearMarkers();
				$.Widget.prototype.destroy.call( this );
			},
			
			_setOption: function(key, value) {
				switch (key) {
					case "backgroundColor":
						this.options.backgroundColor = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "disableDefaultUI":
						this.options.disableDefaultUI = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "disableDoubleClickZoom":
						this.options.disableDoubleClickZoom = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "draggable":
						this.options.draggable = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "draggableCursor":
						this.options.draggableCursor = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "draggingCursor":
						this.options.draggingCursor = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "keyboardShortcuts":
						this.options.keyboardShortcuts = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "mapTypeControl":
						this.options.mapTypeControl = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "mapTypeControlOptions":
						this.options.mapTypeControlOptions = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "navigationControl":
						this.options.navigationControl = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "navigationControlOptions":
						this.options.navigationControlOptions = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "noClear":
						this.options.noClear = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "scaleControl":
						this.options.scaleControl = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "scaleControlOptions":
						this.options.scaleControlOptions = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "scrollwheel":
						this.options.scrollwheel = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "streetViewControl":
						this.options.streetViewControl = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "streetViewControlOptions":
						this.options.streetViewControlOptions = value;
                    	this.getMap().setOptions(this.options);
					break;
					case "center":
						this.options.center = value;
                    	this.getMap().setOptions(this.options);
					break;
					case 'mapTypeId':
						this.options.mapTypeId = value;
						this.getMap().setOptions(this.options);
					break;
					case 'zoom':
						this.options.zoom = value;
                    	this.getMap().setOptions(this.options);
					break;
				}
				$.Widget.prototype._setOption.apply(this, arguments);
			}
			
	});

} (jQuery) );