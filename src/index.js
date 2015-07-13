import App from './app'
import { render, tree, dom } from 'deku'


// Create the app
var app = tree(<App />)

// Render into the DOM
render(app, document.querySelector('.app'))