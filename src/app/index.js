import Map from './components/map'
import Form from './components/form'
import { element } from 'deku'

function render(component) {
    return (
        <div class="app">
            <Form></Form>
            <Map></Map>
        </div>
    )
}


export default { render }