import { element } from 'deku'
import { getCoords } from '../../modules/geolocation'
import { markerDragged } from '../form'

const id = '1BHnaan3YfSDq9_LzjthDXjj5dzJZANjLSb8JHPl5'

function render(component) {
    let { props, state } = component
    return <div class="map"></div>
}

let map
function afterRender(component, el, setState) {
    map = getMap(el)
}

function getMap(el) {
    return new Promise((resolve) => {
        if (el) {
            getCoords().then((coords) => {
                map = new google.maps.Map(el, {
                    center: { lat: coords.lat, lng: coords.lng }
                  , zoom: 16
                })

                resolve(map)
            })
        } else {
            resolve(map)
        }
    })
}

let fusionTablesLayer
let posMarker
let circleLayer
function updateMap(lat, lng, radius, query) {
    getMap().then((map) => {
        if (!fusionTablesLayer) {
            fusionTablesLayer = new google.maps.FusionTablesLayer({
                map: map
            })

            posMarker = new google.maps.Marker({
                map: map
              , clickable: false
              , draggable: true
              , animation: google.maps.Animation.DROP
            })
            posMarker.addListener('dragend', markerDragged)

            circleLayer = new google.maps.Circle({
                map: map
              , strokeColor: '#3f51b5'
              , strokeWeight: 2
              , fillColor: '#3f51b5'
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

export { updateMap }
export default { render, afterRender }