import { element } from 'deku'
import { getCoords } from '../../modules/geolocation'
import { updateMap } from '../map'

const id = '1BHnaan3YfSDq9_LzjthDXjj5dzJZANjLSb8JHPl5'


// Query variables
let lat
let lng
let radius = 300

getCoords().then((coords) => {
    lat = coords.lat
    lng = coords.lng
    getSpecials()
})

function render(component) {
    return (
        <form>
            <input
                onInput={changeRadiusRange}
                name="radius-range"
                class="mdl-slider mdl-js-slider"
                type="range"
                step="100"
                min="100"
                max="5000"
                value={radius}
            />
            <input
                onInput={changeRadiusInput}
                name="radius-number"
                type="number"
                step="50"
                min="100"
                max="5000"
                value={radius}
            />
            <label> Food:
                <input
                    name="food"
                    type="checkbox"
                    checked
                />
            </label>
            <label> Drink:
                <input
                    name="food"
                    type="checkbox"
                    checked
                />
            </label>
        </form>
    )
}

let el
function afterRender(component, _el) {
    el = _el
}

function getSpecials() {
    let query = {
        select: 'address'
      , from: id
      , where: `ST_INTERSECTS(address,
            CIRCLE(LATLNG(${lat}, ${lng}), ${radius}))
        `
    }
    updateMap(lat, lng, radius, query)
}


/* Events */
function changeRadiusRange(e) {
    radius = e.delegateTarget.valueAsNumber
    el.querySelector('[name=radius-number]').value = radius

    getSpecials()
}

function changeRadiusInput(e) {
    radius = e.delegateTarget.valueAsNumber
    el.querySelector('[name=radius-range]').value = radius

    getSpecials()
}

function markerDragged(e) {
    lat = e.latLng.lat()
    lng = e.latLng.lng()
    getSpecials()
}


export { markerDragged }
export default { render, afterRender }