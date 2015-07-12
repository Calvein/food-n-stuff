import { element } from 'deku'
import { eventDispatcher } from '../..'
import { getCoords } from '../../modules/geolocation'


const TABLE_ID = '1BHnaan3YfSDq9_LzjthDXjj5dzJZANjLSb8JHPl5'

let defaultProps = {
    lat: 0
  , lng: 0
  , radius: 0
  , types: ['food', 'drinks']
  , query: {
        select: 'address'
      , from: TABLE_ID
      , where: null
    }
}

function render({ props }) {
    return <div class="map"></div>
}

function afterRender({ props }, el) {
    getMap(el, props).then(() => getSpecials(props))

    // Listeners
    eventDispatcher.on('changes:types', (types) => {
        props.types = types
        getSpecials(props)
    })
    eventDispatcher.on('change:radius', (radius) => {
        props.radius = radius
        getSpecials(props)
    })
}

function getSpecials(props) {
    props.query.where = `ST_INTERSECTS(address,
        CIRCLE(LATLNG(${props.lat}, ${props.lng}), ${props.radius}))
        AND type IN ('${props.types.join('\',\'')}')
    `
    updateMap(props)
}

let map
function getMap(el, props) {
    return new Promise((resolve) => {
        if (el) {
            getCoords().then((coords) => {
                props.lat = coords.lat
                props.lng = coords.lng
                map = new google.maps.Map(el, {
                    center: { lat: props.lat, lng: props.lng }
                  , zoom: 16
                })

                google.maps.event.addListenerOnce(map, 'idle', () => {
                    resolve(map)
                })
            })
        } else {
            resolve(map)
        }
    })
}

let fusionTablesLayer
let posMarker
let circleLayer
function updateMap(props) {
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
            posMarker.addListener('dragend', markerDragged(props))

            circleLayer = new google.maps.Circle({
                map: map
              , strokeColor: '#3f51b5'
              , strokeWeight: 2
              , fillColor: '#3f51b5'
              , fillOpacity: .35
              , clickable: false
            })
        }
        fusionTablesLayer.setQuery(props.query)

        posMarker.setPosition(new google.maps.LatLng(props.lat, props.lng))

        circleLayer.setCenter(new google.maps.LatLng(props.lat, props.lng))
        circleLayer.setRadius(props.radius)

        map.fitBounds(circleLayer.getBounds())
    })
}

function markerDragged(props) { return (e) => {
    props.lat = e.latLng.lat()
    props.lng = e.latLng.lng()
    getSpecials(props)
}}


export default { defaultProps, render, afterRender }