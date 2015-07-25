import App from './app'
import { render, tree, dom } from 'deku'


// Create the app
let app = tree(<App />)

// Render into the DOM
render(app, document.querySelector('.app'))