import { element } from 'deku'
import { eventDispatcher } from '../..'


let defaultProps = {
    radius: 0
}
function render({ props }) {
    return (
        <div class="radius">
            <input
                onInput={changeRadiusRange}
                name="radius-range"
                class="mdl-slider mdl-js-slider"
                type="range"
                step="100"
                min="100"
                max="5000"
                value={props.radius}
            />
            <div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">
                <input
                    class="mdl-textfield__input"
                    onInput={changeRadiusInput}
                    name="radius-number"
                    type="number"
                    step="50"
                    min="100"
                    max="5000"
                    value={props.radius}
                />
                <label class="mdl-textfield__label">Distance (m)</label>
            </div>
        </div>
    )


    /* Events */
    function changeRadiusRange(e) {
        props.radius = radiusSlider.valueAsNumber
        radiusNumber.value = props.radius

        sendRadius(props.radius)
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
        props.radius = value

        radiusNumber.value = props.radius
        radiusSlider.MaterialSlider.change(props.radius)

        sendRadius(props.radius)
    }
}

let radiusSlider
let radiusNumber
function afterRender(component, el) {
    radiusSlider = el.querySelector('[name=radius-range]')
    radiusNumber = el.querySelector('[name=radius-number]')
}

function sendRadius(radius) {
    eventDispatcher.emit('change:radius', radius)
}


export default { defaultProps, render, afterRender }