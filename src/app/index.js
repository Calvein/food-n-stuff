import { EventEmitter } from 'events'
import Header from './components/header'
import Drawer from './components/drawer'
import MapComponent from './components/map'
import Radius from './components/radius'
import { element } from 'deku'

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
let emitter = new EventEmitter

export { emitter as eventDispatcher }
export default { render }