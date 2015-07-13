import { dom } from 'deku'

function render(component) {
    return (
        <div class="mdl-layout__drawer">
            <span class="mdl-layout-title">Food'n Stuff</span>
            <nav class="mdl-navigation">
                <a class="mdl-navigation__link" href="https://github.com/Calvein/food-n-stuff">Repo</a>
            </nav>
        </div>
    )
}


export default { render }