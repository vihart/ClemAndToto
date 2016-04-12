var pages = [
	'2_horse/index.html',
	'3_apartment/index.html',
  	'4_orbit/index.html',
    '5_whitevideo/index.html',
    '6_escape/index.html',
    '7_water/index.html'];

var newestPage = pages[pages.length-1];
var getRandomPage = function getRandomInt(){
  	return pages[Math.floor(Math.random() * pages.length)];
  };