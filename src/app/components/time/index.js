import { dom } from 'deku'

const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
let now = new Date()
let hours = '' + now.getHours()
if (hours < 10) hours = '0' + hours
let minutes = '' + now.getMinutes()
if (minutes < 10) minutes = '0' + minutes
let defaultProps = {
    day: days[now.getDay()]
  , time: hours + minutes
}
function beforeMount({ props }) {
    sendTime(props)
}

function render({ props }) {
    let options = days.map((day) =>
        <option value={day} selected={day === props.day}>{day}</option>
    )
    // Put Sunday last
    options.push(options.shift())

    return (
        <div class="time">
            <select
                onChange={changeDay}
                name="day"
            >
                {options}
            </select>
            <input
                onInput={changeTime}
                value={props.time.replace(/^(..)/, '$1:')}
                name="time"
                type="time"
            />
        </div>
    )

    /* Events */
    function changeDay(e) {
        props.day = day.value

        sendTime(props)
    }

    function changeTime(e) {
        props.time = time.value.replace(':', '')

        sendTime(props)
    }
}

let day
let time
function afterRender(component, el) {
    day = el.querySelector('[name=day]')
    time = el.querySelector('[name=time]')
}

function sendTime(props) {
    props.ed.emit('change:time', props.day, props.time)
}


export default { defaultProps, beforeMount, render, afterRender }