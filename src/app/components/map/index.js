import { element } from 'deku'

function render(component) {
    let { props, state } = component
    return <div class="map"></div>
}

let map
function afterMount(component, el, setState) {
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

function getCoords() {
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(function(geo) {
            let { latitude, longitude } = geo.coords
            resolve({ lat: latitude, lng: longitude })
        })
    })
}

export default { render, afterMount, getMap, getCoords }