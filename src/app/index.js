import { dom } from 'deku'
import { EventEmitter } from 'events'
import debounce from 'debounce'
import Header from './components/header'
import Drawer from './components/drawer'
import MapComponent from './components/map'
import Time from './components/time'
import Radius from './components/radius'

// Global event dispatcher, passed to components to prevent singleton
let ed = new EventEmitter

function render(component) {
    let radius = 300

    return (
        <div class="mdl-layout mdl-js-layout mdl-layout--fixed-header">
            <Header ed={ed} />
            <Drawer ed={ed} />
            <main class="mdl-layout__content">
                <div class="page-content">
                    <MapComponent ed={ed} radius={radius} />
                    <Time ed={ed} />
                    <Radius ed={ed} radius={radius} />
                </div>
            </main>
        </div>
    )
}

window.addEventListener('resize', debounce(resize, 200))
function resize(e) {
    ed.emit('resize')
}


export default { render }