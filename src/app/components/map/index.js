import { dom } from 'deku'
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
    getMap(el, props).then((map) => {
        getSpecials(props)

        eventDispatcher.on('resize', () => {
            map.setCenter(new google.maps.LatLng(props.lat, props.lng))
        })
    })

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
            fusionTablesLayer.addListener('click', (e) => {
                let getVal = (col) => {
                    let value = e.row[col].value
                    if (col === 'from' || col === 'to') {
                        value = value.replace(/(..)$/, ':$1')
                    }

                    return value
                }

                e.infoWindowHtml = `
                    <div class="infowindow">
                        <div class="infowindow__name">${getVal('establishment')}</div>
                        <div class="infowindow__address">${getVal('address')}</div>
                        <div class="infowindow__description">${getVal('description')}</div>
                        <div class="infowindow__time">From ${getVal('from')} to ${getVal('to')}</div>
                    </div>
                `
            })

            posMarker = new google.maps.Marker({
                map: map
              , clickable: false
              , draggable: true
              , animation: google.maps.Animation.DROP
            })
            posMarker.addListener('dragend', (e) => {
                props.lat = e.latLng.lat()
                props.lng = e.latLng.lng()
                getSpecials(props)
            })

            circleLayer = new google.maps.Circle({
                map: map
              , strokeColor: '#3f51b5'
              , strokeWeight: 2
              , fillColor: '#3f51b5'
              , fillOpacity: .2
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


export default { defaultProps, render, afterRender }