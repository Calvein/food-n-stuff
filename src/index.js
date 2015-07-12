import App from './app'
import { render, tree, element } from 'deku'


// Create the app
var app = tree(<App />)

// Render into the DOM
render(app, document.querySelector('.app'))