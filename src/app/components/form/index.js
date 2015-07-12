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
            <div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">
                <input
                    class="mdl-textfield__input"
                    onInput={changeRadiusInput}
                    name="radius-number"
                    type="number"
                    step="50"
                    min="100"
                    max="5000"
                    value={radius}
                />
                <label class="mdl-textfield__label">Distance (m)</label>
            </div>
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
            <label class="mdl-icon-toggle mdl-js-icon-toggle mdl-js-ripple-effect">
                <input
                    name="food"
                    type="checkbox"
                    class="mdl-icon-toggle__input"
                    checked
                />
                <i class="mdl-icon-toggle__label material-icons">local_dining</i>
            </label>
            <label class="mdl-icon-toggle mdl-js-icon-toggle mdl-js-ripple-effect">
                <input
                    name="food"
                    type="checkbox"
                    class="mdl-icon-toggle__input"
                    checked
                />
                <i class="mdl-icon-toggle__label material-icons">local_bar</i>
            </label>
        </form>
    )
}

let radiusSlider
let radiusNumber
function afterRender(component, el) {
    radiusSlider = el.querySelector('[name=radius-range]')
    radiusNumber = el.querySelector('[name=radius-number]')
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
    radius = radiusSlider.valueAsNumber
    radiusNumber.value = radius

    getSpecials()
}

function changeRadiusInput(e) {
    let value = radiusNumber.valueAsNumber

    // Prevent non numbers values
    if (isNaN(value)) {
        radiusNumber.value = radiusNumber.value
        return
    }

    // Clamp value
    if (value > radiusNumber.max) value = +radiusNumber.max
    if (value < radiusNumber.min) value = +radiusNumber.min
    radius = value

    radiusNumber.value = radius
    radiusSlider.MaterialSlider.change(radius)

    getSpecials()
}

function markerDragged(e) {
    lat = e.latLng.lat()
    lng = e.latLng.lng()
    getSpecials()
}


export { markerDragged }
export default { render, afterRender }