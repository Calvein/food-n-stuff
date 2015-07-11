import { getMap, getCoords } from '../map'
import { element } from 'deku'

const id = '1BHnaan3YfSDq9_LzjthDXjj5dzJZANjLSb8JHPl5'


let lat
let lng
let radius = 300
function render(component) {
    getCoords().then((coords) => {
        lat = coords.lat
        lng = coords.lng
        getSpecials()
    })
    return (
        <form>
            <input onChange={changeRange} type="range" step="100" value={radius} min="100" max="5000" />
        </form>
    )
}


let fusionTablesLayer
let posMarker
let circleLayer
function getSpecials() {
    getMap().then((map) => {
        let query = {
            select: 'address'
          , from: id
          , where: `ST_INTERSECTS(address,
                CIRCLE(LATLNG(${lat}, ${lng}), ${radius}))
            `
        }

        if (!fusionTablesLayer) {
            fusionTablesLayer = new google.maps.FusionTablesLayer({
                map: map
            })

            posMarker = new google.maps.Marker({
                map: map
              , clickable: false
              , draggable: true
            })
            posMarker.addListener('dragend', markerDragged)

            circleLayer = new google.maps.Circle({
                map: map
              , strokeColor: '#00f'
              , strokeWeight: 2
              , fillColor: '#00f'
              , fillOpacity: .35
              , clickable: false
            })
        }
        fusionTablesLayer.setQuery(query)

        posMarker.setPosition(new google.maps.LatLng(lat, lng))

        circleLayer.setCenter(new google.maps.LatLng(lat, lng))
        circleLayer.setRadius(radius)

        map.fitBounds(circleLayer.getBounds())
    })
}


/* Events */
function changeRange(e) {
    radius = e.delegateTarget.valueAsNumber
    getSpecials()
}

function markerDragged(e) {
    lat = e.latLng.lat()
    lng = e.latLng.lng()
    getSpecials()
}


export default { render }