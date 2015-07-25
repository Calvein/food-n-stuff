import App from './app'
import { render, tree, dom } from 'deku'


// Create the app
window.app = tree(<App />)

// Render into the DOM
render(app, document.querySelector('.app'))