import { element, dom } from 'deku'
import { EventEmitter } from 'events'
import debounce from 'debounce'
import Header from './components/header'
import Drawer from './components/drawer'
import MapComponent from './components/map'
import Radius from './components/radius'

function render(component) {
    let radius = 300

    return (
        <div class="mdl-layout mdl-js-layout mdl-layout--fixed-header">
            <Header />
            <Drawer />
            <main class="mdl-layout__content">
                <div class="page-content">
                    <MapComponent radius={radius} />
                    <Radius radius={radius} />
                </div>
            </main>
        </div>
    )
}

// Global event emitter
let eventDispatcher = new EventEmitter
window.addEventListener('resize', debounce(resize, 200))
function resize(e) {
    eventDispatcher.emit('resize')
}


export { eventDispatcher }
export default { render }