// Establishments
// https://www.google.com/fusiontables/data?docid=1gsRNLtgJbavTOtN7gO3QAS-eix0PTCU7SkQll-M4
// Specials
// https://www.google.com/fusiontables/data?docid=1d7PNTg6cs2DlD9-mJXuM7yjqJC1Zd61FW5RTVg-7
// Merge
// https://www.google.com/fusiontables/data?docid=1BHnaan3YfSDq9_LzjthDXjj5dzJZANjLSb8JHPl5


var center = new google.maps.LatLng(-33.87, 151.185)
var id = '1BHnaan3YfSDq9_LzjthDXjj5dzJZANjLSb8JHPl5'

// Rad req

var map = new google.maps.Map(document.querySelector('main'), {
    center: center
  , zoom: 12
})


function getSpecials(lat, lng, radius) {
    var layer = new google.maps.FusionTablesLayer({
        map: map
      , query: {
            select: 'address'
          , from: id
          , where: 'ST_INTERSECTS(address, CIRCLE(LATLNG(' + lat + ', ' + lng + '), ' + radius + '))'
        }
    })
}

navigator.geolocation.getCurrentPosition(function(geo) {
    getSpecials(geo.coords.latitude, geo.coords.longitude, 3000)
})