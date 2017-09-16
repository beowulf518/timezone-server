var express = require('express');
var router = express.Router();
var http = require('http');
var fs = require("fs");

var fileurl = __dirname + '/../data/countriesToCitiesV2.json';

router.get('/current', function(req, res, next) {
	var now = new Date();
	// convert local to utc time
	var now_server = now.getTime() - (now.getTimezoneOffset() * 60000);
	res.send({ timestamp: now.getTime(), server: new Date(now_server).getTime() });
});

router.get('/cities', function(req, res, next) {
	var file = fs.readFileSync(fileurl, 'utf8');
	var json = JSON.parse(file);
	var limit = req.query.limit || 15;

	if(req.query.city) {
		var cities = {};
		for(let country in json) {
			if(typeof json[country].cities[req.query.city] !== 'undefined') {
				var citylist = [];
				for(city in json[country].cities) {
					citylist.push(json[country].cities[city]);
				}
				cities = {
					country: country,
					cities: citylist.sort(function() {
					  return .5 - Math.random();
					}).slice(0, Math.min(limit, citylist.length) )
				};
				break;
			}
		}
		res.send(cities);
	} else if(req.query.country) {
		var citylist = [];
		for(city in json[req.query.country].cities) {
			citylist.push(json[req.query.country].cities[city]);
		}
		let cities = {
			country: req.query.country,
			cities: citylist.sort(function() {
			  return .5 - Math.random();
			}).slice(0, Math.min(limit, citylist.length) )
		};
		res.send(cities);
	} else {
		res.send(json);	
	}
});

router.post('/update', function(req, res, next) {
	
	var file = fs.readFileSync(fileurl, 'utf8');
	var json = JSON.parse(file);
	
	var country = req.body.country;
	var city = req.body.city;
	var timezone = req.body.timezone;
	var location = req.body.location;

	if(json[country] && json[country].cities[city]) {
		json[country].cities[city].location = location;
		json[country].cities[city].timezone = timezone;
	}

	fs.writeFileSync(fileurl, JSON.stringify(json), 'utf8');
	
	res.header({'Content-Type': 'application/json'});
	res.send({updated: true});
});

router.get('/search_cities', function(req, res, next){
	var file = fs.readFileSync(fileurl, 'utf8');
	var json = JSON.parse(file);
   
	var q = req.query.q || '';
	var lat = parseFloat(req.query.lat);
	var lng = parseFloat(req.query.lng);
	lat = isNaN(lat) ? false : lat;
	lng = isNaN(lng) ? false : lng;

	var limit = req.query.limit || 20;
	var found = [];
	if(q !== 'none') {
		for (let c in json) {
			if(found.length > limit) {
				break;
			}
			for (let ct in json[c].cities) {
				if(found.length > limit) {
					break;
				}
				if(q.length === 0 && lat !== false && lng !== false) {
					var city = json[c].cities[ct];
					city.country = c;
					if(city.location && city.location.results) {
						clat = city.location.results["0"].geometry.lat;
						clng = city.location.results["0"].geometry.lng;
						if(clat == lat && clng == lng ) {
							found.push(city);
							break;
						}
					}
				} else {
					let regexp = new RegExp(q.toLowerCase());
					if(regexp.test(json[c].cities[ct].city.toLowerCase()) || regexp.test(c.toLowerCase())) {
						var city = json[c].cities[ct];
						city.country = c;
						found.push(city);
					}
				}
			}
		}
	} else {
		var temp = [];
		for (let c in json) {
			for (let ct in json[c].cities) {
				var city = json[c].cities[ct];
				city.country = c;
				temp.push(city);
			}
		}
		temp.sort(function() {
			  return .5 - Math.random();
			});
		found = temp;
	}

	res.header({'Content-Type': 'application/json'});
	res.send({cities: found.slice(0, Math.min(limit, found.length) ), found: found.length});
});

module.exports = router;
