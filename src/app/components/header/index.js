import { dom } from 'deku'

let defaultProps = {
    types: ['food', 'drinks']
}

function render({ props }) {
    return (
        <header class="mdl-layout__header">
            <div class="mdl-layout__header-row">
                <span class="mdl-layout-title">Food'n Stuff</span>
                <div class="mdl-layout-spacer"></div>
                <label class="mdl-icon-toggle mdl-js-icon-toggle mdl-js-ripple-effect">
                    <input
                        name="food"
                        onChange={changeType}
                        type="checkbox"
                        class="mdl-icon-toggle__input"
                        checked
                    />
                    <i class="mdl-icon-toggle__label material-icons">local_dining</i>
                </label>
                <label class="mdl-icon-toggle mdl-js-icon-toggle mdl-js-ripple-effect">
                    <input
                        name="drinks"
                        onChange={changeType}
                        type="checkbox"
                        class="mdl-icon-toggle__input"
                        checked
                    />
                    <i class="mdl-icon-toggle__label material-icons">local_bar</i>
                </label>
            </div>
        </header>
    )


    /* Events */
    function changeType(e, { props }) {
        let el = e.delegateTarget
        if (el.checked) {
            props.types.push(el.name)
        } else {
            props.types = props.types.filter((type) => type !== el.name)
        }
        props.ed.emit('changes:types', props.types)
    }
}


export default { defaultProps, render }