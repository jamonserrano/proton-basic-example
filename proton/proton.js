/*
Proton
 */

"use strict";
{
    const visiblePostfix = "--visible", // class name for visible elements
        body = document.body, // shortcut for body
        mobile = window.orientation !== undefined, // mobile browser
        create = document.createElement.bind(document), // shortcut for createElement
        states = new Map(), // {state.fullName => state}
        activeStates = new Set(), // active states
        layers = new Map(), // {layerName => Layer}
        //events = new Map(), // {event => [listeners]}
        Canvas = createCanvas(); // the root element

    let orientation, // current orientation
        index = 1;

    /*
    Initialization with the state tree
     */
    function init (defaultStates) {
        SwitchBoard.init(); // set up switch board
        getStates(defaultStates || {}); // set up the state machine
        window.addEventListener("popstate", applyURLStates); // listen to history events
        SwitchBoard.render(); // show the populated (by getStates) switch board
    }

    /*
    Create the root element
     */
    function createCanvas () {
        const element = create("div"),
            id = "Canvas";

        element.id = id;
        body.insertBefore(element, body.firstChild);
        return {element, id}; // so we can use it as a parent for layers
    }

    /*
    Set up the state machine
     */
    function getStates (defaultStates) {
        if (mobile) { // add orientation states for mobile
            defaultStates = Object.assign(
                { orientation: { portrait: false, landscape: false } },
                defaultStates
            );
        }

        getDefaultStates(defaultStates); // then the default states from the code
        generateCSSRules(); // build the css
        applyURLStates(null, true); // apply initial states from the url
        initOrientation(); // set up device orientation
    }

    /*
    Recursive function to parse the initial state tree
     */
    function getDefaultStates (target, group) {
        for (const key of Object.keys(target)) {
            const value = target[key];
            if (typeof value === "boolean") { // it's a leaf
                const state = new State(key, group); // create a new State instance
                states.set(state.fullName, state); // add to state list
                SwitchBoard.createSwitch(state, value); // add switch
                if (value) { // add to active states
                    setState(state.fullName, true);
                }
            } else if (value === Object(value)) { // it's a branch
                getDefaultStates(value, group || key); // go deeper
            }
        }
    }

    /*
    Apply the states defined in the popstate/URL
     */
    function applyURLStates (e, initial) {
        let newStates = e ? e.state : undefined; // get states from the history event…
        if (!newStates) { // …or from the URL
            const urlStates = window.location.search.slice(1, -1);
            if (urlStates) {
                newStates = new Set(urlStates.split(","));
            }
        }

        if (newStates) { // refresh states
            for (const stateName of activeStates) {
                removeState(stateName, true);
            }

            for (const stateName of newStates) {
                setState(stateName, true);
            }
        }

        if (initial) { // initial pageload
            history.replaceState(activeStates, null); // store the states
        }
    }

    /*
    Generate the CSS rules that show/hide the appropriate states, and add them to the document
    e.g. '.state-name state-name--visible {display: block;}'
     */
    function generateCSSRules () {
        const style = create("style"),
            visibleSelector = [];
        let sheet;

        for (const state of states.values()) { // add selector for each state
            const selector = "." + state.className;
            visibleSelector.push(`${selector} ${selector + visiblePostfix}`);
        }

        // add stylesheet
        document.head.appendChild(style);
        sheet = style.sheet;
        sheet.insertRule(visibleSelector.join(", ") + " {display: block;}", 0);
    }

    /*
    Put the prototype in a new state
     */
    function setState (stateName, init) {
        if (!hasState(stateName)) { // trying to set a nonexisting state
            throw new Error(`Trying to set an invalid state: ${stateName}`);
        }
        const state = states.get(stateName),
            group = state.group;
        // handle orientation separately because we don't want it to show up in history
        // (imagine turning your device then tapping the back button)
        if (group === "orientation") {
            setOrientationState(stateName);
            return;
        }

        if (group) { // it's in a group, so we should remove all sibling states
            for (const stateToRemove of activeStates) {
                if (states.get(stateToRemove).group === group) { // siblings have the same group
                    removeState(stateToRemove, true); // remove the state, but don't change the URL yet
                }
            }
        }

        activeStates.add(stateName); // set the state
        body.classList.add(state.className); // add the state class

        if (!init) { // if this is not the initial setup, update the URL and trigger an event
            updateURL();
            trigger("setState", stateName);
        }
   }

   /*
   Remove a state from the prototype
    */
   function removeState (stateName, indirect) {
        if (!hasState(stateName)) {
            throw new Error(`Trying to remove an invalid state: ${stateName}`);
        }

        const wasActive = activeStates.delete(stateName); // remove the state
        body.classList.remove(states.get(stateName).className); // remove the state class

        if (!indirect) {
            updateURL(); // if it's not because we are setting a sibling state, update the URL
        }
        if (wasActive) { // if the state was previously active, trigger event
            trigger("removeState", stateName);
        }
    }

    /*
    Check if the prototype is in a given state
     */
    function isInState (stateName) {
        return (activeStates.has(stateName)) || orientation === stateName;
    }

    /*
    Check if a state exists
     */
    function hasState (stateName) {
        return states.has(stateName);
    }

    /*
    Update the URL with the current states
     */
    function updateURL () {
        history.pushState(activeStates, null, "?" + Array.from(activeStates).join(","));
    }

    /*
    Activate device orientation states if available
     */
    function initOrientation () {
        if (mobile) { // mobile
            body.classList.add("proton-mobile");
            getDeviceOrientation();
            window.addEventListener("orientationchange", getDeviceOrientation);
        } else { // desktop
            body.classList.add("proton-desktop");
        }
    }

    /*
    Get the device orientation
     */
    function getDeviceOrientation () {
        if (Math.abs(window.orientation) === 90) {
            setOrientationState("orientation:landscape");
        } else {
            setOrientationState("orientation:portrait");
        }
    }

    /*
    Set the orientation state according to the device or forced orientation
     */
    function setOrientationState (stateName) {
        const stateToRemove = (stateName === "orientation:landscape") ? "orientation:portrait" : "orientation:landscape";
        if (orientation === stateName) { // nothing happened
            return;
        }
        orientation = stateName; // set current orientation
        if (hasState(stateToRemove)) {
            body.classList.remove(states.get(stateToRemove).className);
        }
        body.classList.add(states.get(stateName).className);

        trigger("removeState", stateToRemove);
        trigger("setState", stateName);
    }

    /*
    Force orientation for showing mobile prototypes on desktop
     */
    function setOrientation (orientation) {
        if (!mobile) { // only on desktop
            setOrientationState(`orientation:${orientation}`);
        }
    }

    /*
    Add a new layer
     */
    function addLayer (attributes) {
        if (!attributes.id) {
            attributes.id = "proton-" + index++;
        }

        let id = attributes.id;
        if (layers.get(id)) { // duplicate layer name
            throw new Error(`Layer name '${name}' already exists`);
        } else { // create and add layer
            const layer = new Layer(attributes);
            layers.set(id, layer);
            return layer;
        }
    }

    /*
    Get a layer by id
     */
    function getLayer (id) {
        return layers.get(id);
    }

/*
    function addEvent (event, listener) {
        let listeners;
        if (typeof listener !== "function") {
            throw new TypeError(`Listener is not a function: ${listener}`);
        }

        listeners = events.get(event) || new Set();
        listeners.add(listener);
        events.set(event, listeners);
    }

    function removeEvent (event, listener) {
        events.get(event).delete(listener);
    }

    function triggerEvent (event, args) {
        let listeners = events.get(event);
        if (listeners) {
            listeners.forEach(function (listener) {
                listener.apply(null, args);
            });
        }
    }

    function logStates () {
        return states;
    }
*/

    /*
    Trigger an event
     */
    function trigger (type, args) {
        window.dispatchEvent(new CustomEvent(type, {
            cancelable: true,
            bubbles: true,
            detail: args
        }));
    }

    /*
    Change numbers to px
     */
    function normalizeCSSValue (value) {
        value = typeof value === "number" ? value + "px" : value;
        return value;
    }

    /*
    Preload background images
     */
    function preloadImage (value) {
        return new Promise(function (resolve) {
            const image = new Image();
            image.onload = function () {
                resolve(image);
            };
            image.src = value;
        });
    }

    /*
    Layer constructor
     */
    const Layer = function (attributes) {
        this.createElement(); // create the element
        this.setAttributes(attributes); // set the attributes
        this.addElement(); // add the element (attributes must be set before)
    };

    /*
    Layer prototype
     */
    Layer.prototype = {
        /*
        Create the layer element
         */
        createElement: function () {
            const el = create("div");
            el.classList.add("proton-layer");
            this.element = el;
        },

        /*
        Set the attributes
         */
        setAttributes: function (attributes) {
            const defaultAttributes = {
                parent: Canvas, // default parent is the canvas
                visible: undefined // visible by default
            };

            this.attributes = {}; // just a container for the attributes

            Object.assign(defaultAttributes, attributes); // mix the default and constructor attributes
            Object.keys(defaultAttributes).forEach(function (attribute) {
                this[attribute] = defaultAttributes[attribute]; // set each attribute
            }, this);
        },

        /*
        Add the layer element to the DOM
         */
        addElement: function () {
            this.element.id = this.id;
            this.parent.element.appendChild(this.element);
        },

        /*
        Add a child layer to this layer
         */
        addLayer: function (attributes) {
            addLayer(Object.assign(attributes, {parent: this})); // override the parent to this layer
        },

        /*
        SET layer width
         */
        set width (value) {
            this.attributes.width = value;
            this.element.style.width = normalizeCSSValue(value); // convert numbers to px
        },

        /*
        GET layer width
         */
        get width () {
            return this.attributes.width;
        },

        /*
        SET layer height
         */
        set height (value) {
            this.attributes.height = value;
            this.element.style.height = normalizeCSSValue(value); // convert numbers to px
        },
        /*
        GET layer height
         */
        get height () {
            return this.attributes.height;
        },

        /*
        SET left position
         */
        set left (value) {
            this.attributes.left = value;
            this.element.style.left = normalizeCSSValue(value); // convert numbers to px
        },

        /*
        GET left position
         */
        get left () {
            return this.attributes.left;
        },

        /*
        SET top position
         */
        set top (value) {
            this.attributes.top = value;
            this.element.style.top = normalizeCSSValue(value); // convert numbers to px
        },

        /*
        GET top position
         */
        get top () {
            return this.attributes.top;
        },

        /*
        SET background image
         */
        set image (value) {
            this.attributes.image = value;
            let imageRatio = value.match(/@(\d)x\./); // extract the image ratio from the filename
            imageRatio = imageRatio ? imageRatio[1] : 1;
            // preload the image, and resize the layer to the image dimensions
            preloadImage(value).then((image) => {
                if (this.width === undefined) {
                    this.width = image.width / imageRatio;
                }
                if (this.height === undefined) {
                    this.height = image.height / imageRatio;
                }
                this.element.style.backgroundImage = `url(${value})`; // set the image as background
            });
        },

        /*
        GET background image
         */
        get image () {
            return this.attributes.image;
        },

        /*
        SET html content
         */
        set html (value) {
            this.element.innerHTML = value;
        },

        /*
        GET html content
         */
        get html () {
            return this.element.innerHTML;
        },

        /*
        SET html template
         */
        set template (id) {
            const templateElement = document.getElementById(id);

            if (templateElement) { // insert the template into the element
                this.element.appendChild(document.importNode(templateElement.content, true));
            }

            this.attributes.template = id;
        },

        /*
        GET html template
         */
        get template () {
            return this.attributes.template;
        },

        /*
        SET click handler
         */
        set click (value) {
            if (typeof value === "undefined") {
                return;
            }

            this.element.dataset.click = true; // add data-click attribute for CSS styling

            this.attributes.click = value;

            if (typeof value === "string") { // switch to the given state
                this.element.addEventListener("click", () => window.setState(value));
            } else if (typeof value === "function") { // use the callback
                this.element.addEventListener("click", value);
            }
        },

        /*
        GET click handler
         */
        get click () {
            return this.attributes.click;
        },

        /*
        SET visibility
         */
        set visible (value) {
            this.attributes.visible = value;

            if (typeof value === "string") { // one or more states are given
                const visibleStates = value.split(", "); // parse states
                for (const stateName of visibleStates) {
                    const state = states.get(stateName);
                    if (state) {
                        this.element.classList.add(state.className + visiblePostfix);
                    }
                }
            } else if (value === undefined || value === true) { // layer is always visible
                this.element.classList.add("visible");
            }
        },

        /*
        GET visibility
         */
        get visible () {
            return this.attributes.visible;
        },

        /*
        SET class names
         */
        set className (value) {
            const classNames = value.split(" ");
            this.attributes.className = value;
            this.element.classList.add(...classNames);
        },

        /*
        GET class names
         */
        get className () {
            return this.attributes.className;
        },

        /*
        SET parent layer
         */
        set parent (parent) {
            if (typeof parent === "string") { // layer ID
                parent = getLayer(parent);
            } else if (parent instanceof Layer || parent === Canvas) { // layer instance or canvas
                parent = parent;
            }

            if (!parent) { // nothing found
                throw new ReferenceError(`Invalid parent for ${this.name}: ${parent}`);
            }
            this.attributes.parent = parent;
        },

        /*
        GET parent layer
         */
        get parent () {
            return this.attributes.parent;
        },

        /*
        SET debug mode
         */
        set debug (value) {
            this.attributes.debug = value;
            if (value) {
                this.element.classList.add("debug");
            }
        },

        /*
        GET debug mode
         */
        get debug () {
            return this.attributes.debug;
        }
    };


    /*
    State constructor
     */
    const State = function (name, group) {
        this.name = name;
        this.group = group;
        this.className = this.generateStateName("-", this.name, this.group);
        this.fullName = this.generateStateName(":", this.name, this.group);
    };

    State.prototype.generateStateName = function (separator, name, group) {
        return (group ? group + separator : "") + name;
    };

    /*
    Switch board for manual state change
     */
    const SwitchBoard = {
        groupElements: new Map(), // group name => element

        /*
        Initialization
         */
        init () {
            this.createBoard();
            this.addListeners();
        },

        /*
        Create the board skeleton
         */
        createBoard () {
            const board = create("div"), // board
                show = create("div"), // show toggle
                hide = create("div"), // hide toggle
                reload = create("div"), // reload toggle
                groups = create("div"); // switch group container

            board.className = "proton-switchboard";
            show.className = "proton-switchboard-toggle proton-switchboard-show";
            hide.className = "proton-switchboard-toggle proton-switchboard-hide";
            reload.className = "proton-switchboard-toggle proton-switchboard-reload";
            groups.className = "proton-switch-groups";

            show.setAttribute("title", "Show states");
            hide.setAttribute("title", "Hide states");
            reload.setAttribute("title", "Restore default states");

            body.appendChild(show);
            board.appendChild(groups);
            board.appendChild(hide);
            board.appendChild(reload);

            this.board = board;
            this.show = show;
            this.hide = hide;
            this.reload = reload;
            this.groups = groups;
        },

        /*
        Add event listeners
         */
        addListeners () {
            this.show.addEventListener("click", this.onShowClick.bind(this));
            this.hide.addEventListener("click", this.onHideClick.bind(this));
            this.groups.addEventListener("click", this.onSwitchClick.bind(this));
            this.reload.addEventListener("click", this.onReloadClick.bind(this));

            window.addEventListener("setState", this.onStateChange.bind(this));
            window.addEventListener("removeState", this.onStateChange.bind(this));

            if (mobile) {
                window.addEventListener("touchstart", this.onTouchStart.bind(this));
            }
        },

        /*
        Create new switch group
         */
        createGroup (group) {
            const element = create("div"),
                title = create("p");

            title.innerHTML = this.generateFriendlyName(group);

            if (group === "other" || group === "orientation") { // mark special groups
                element.classList.add(group);
            }

            element.classList.add("proton-switch-group");
            element.appendChild(title);
            this.groups.appendChild(element);
            this.groupElements.set(group, element);

            return element;
        },

        /*
        Create a single switch
         */
        createSwitch (state, active) {
            const groupName = state.group || "other",
                groupElement = this.groupElements.get(groupName) || this.createGroup(groupName),
                element = create("div");

            if (active) {
                element.classList.add("active");
            }
            element.classList.add("proton-switch");
            element.dataset.state = state.fullName;
            element.innerHTML = this.generateFriendlyName(state.name);
            groupElement.appendChild(element);
        },

        /*
        Show the board
         */
        onShowClick () {
            this.board.classList.add("proton-open");
            this.show.classList.add("proton-hidden");
        },

        /*
        Hide the board
         */
        onHideClick () {
            this.board.classList.remove("proton-open");
            this.show.classList.remove("proton-hidden");
            this.groups.scrollTop = 0; // reset scroll position
        },

        /*
        Reload the prototype with default states
         */
        onReloadClick () {
            window.location = window.location.origin + window.location.pathname; // reset the URL
        },

        /*
        Click on switch
         */
        onSwitchClick (e) {
            const target = e.target;

            if (target.classList.contains("proton-switch")) {
                const state = states.get(target.dataset.state),
                    stateName = state.fullName;
                if (!state.group && isInState(stateName)) { // only remove non-exclusive states
                    removeState(stateName);
                } else {
                    setState(stateName);
                }
            }
        },

        /*
        Touch start
         */
        onTouchStart (e) {
            if (e.touches.length === 3) { // 3-finger touch
                if (!this.onTouchEndProxy) { // set up bound listener
                    this.onTouchEndProxy = this.onTouchEnd.bind(this);
                }
                window.addEventListener("touchend", this.onTouchEndProxy); // listen to touchend
            }
        },

        /*
        Touch end
         */
        onTouchEnd () {
            window.removeEventListener("touchend", this.onTouchEndProxy); // remove listener
            this.board.classList.add("proton-open"); // open board
        },

        /*
        Keep switches in sync with the prototype
         */
        onStateChange (e) {
            const action = e.type === "setState" ? "add" : "remove",
                stateName = e.detail,
                switchElement = this.board.querySelector("[data-state='" + stateName + "']");

            if (switchElement) {
                switchElement.classList[action]("active");
            }
        },

        /*
        Render the prototype (after its contents are ready)
         */
        render () {
            body.appendChild(this.board);
        },

        /*
        Generate readable state name (state-name => State name)
         */
        generateFriendlyName (name) {
            return name[0].toUpperCase() + name.slice(1).replace(/-/g, " ");
        }
    };

    /*
    Global exports
     */
    window.init = init;
    window.setState = setState;
    window.removeState = removeState;
    window.isInState = isInState;
    /*window.addEvent = addEvent;
    window.removeEvent = removeEvent;
    window.triggerEvent = triggerEvent;*/
    window.trigger = trigger;
    window.addLayer = addLayer;
    window.getLayer = getLayer;
    window.setOrientation = setOrientation;
    window.Canvas = Canvas;
    window.Layer = Layer;
}
