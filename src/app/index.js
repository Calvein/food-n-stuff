import * as Map from './components/map'
import * as Form from './components/form'
import { element } from 'deku'

function render(component) {
    return (
        <div class="App">
            <Map></Map>
            <Form></Form>
        </div>
    )
}


export default { render }