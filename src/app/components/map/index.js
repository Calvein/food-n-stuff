import { dom } from 'deku'
import marked from 'marked'
import { getCoords } from '../../modules/geolocation'


const TABLE_ID = '1VNEAFcgkdBs1nYgQFqoteeuSsxQJKMOPtxww1DAY'

let defaultProps = {
    lat: 0
  , lng: 0
  , radius: 0
  , types: ['food', 'drink']
  , day: null
  , time: null
  , query: {
        select: 'address'
      , from: TABLE_ID
      , where: null
    }
}

function beforeMount({ props }) {
    // Listeners
    props.ed.on('changes:types', (types) => {
        props.types = types
        getSpecials(props)
    })
    props.ed.on('change:radius', (radius) => {
        props.radius = radius
        getSpecials(props)
    })
    props.ed.on('change:time', (day, time) => {
        props.day = day
        props.time = time
        getSpecials(props)
    })
}

function render({ props }) {
    return <div class="map"></div>
}

function afterRender({ props }, el) {
    getMap(el, props).then((map) => {
        getSpecials(props)

        props.ed.on('resize', () => {
            map.setCenter(new google.maps.LatLng(props.lat, props.lng))
            google.maps.event.trigger(map, 'resize')
        })
    })
}

function getSpecials(props) {
    props.query.where = `
        ST_INTERSECTS(address, CIRCLE(LATLNG(${props.lat}, ${props.lng}), ${props.radius}))
        AND type IN ('${props.types.join('\',\'')}')
        AND days CONTAINS '${props.day}'
        AND start <= ${props.time}
        AND end >= ${props.time}
    `
    if (map) updateMap(props)
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
                    if (col === 'start' || col === 'end') {
                        value = value.replace(/(..)$/, ':$1')
                    }

                    return value
                }

                e.infoWindowHtml = `
                    <div class="infowindow">
                        <h3 class="infowindow__title">${getVal('title')}</h3>
                        <div class="infowindow__description">${marked(getVal('description'))}</div>
                        <div class="infowindow__name">${getVal('establishment')}</div>
                        <div class="infowindow__address">${getVal('address')}</div>
                        <time class="infowindow__time">From ${getVal('start')} to ${getVal('end')}</time>
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


export default { defaultProps, beforeMount, render, afterRender }