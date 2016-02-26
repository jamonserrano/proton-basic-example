// Application states
init({
    screen: {
        welcome: true,
        login: false,
        "login-filled": false,
        home: false,
        search: false,
        likes: false,
        profile: false
    }
});

// SCREEN: Welcome
var welcome = addLayer({
    visible: "screen:welcome",
    image: "img/welcome@3x.png"
});

// Login button
welcome.addLayer({
    width: 90, height: 40, top: 555, left: 195,
    click: "screen:login"
});


// SCREEN: Login
var login = addLayer({
    visible: "screen:login",
    image: "img/login@3x.png"
});

// Login inputs
login.addLayer({
    width: 320, height: 90, top: 310, left: 20,
    click: "screen:login-filled"
});


// SCREEN: Login with credentials
var loginFilled = addLayer({
    visible: "screen:login-filled",
    image: "img/login-filled@3x.png"
});
// Filled login inputs
loginFilled.addLayer({
    width: 140, height: 40, top: 415, left: 197,
    click: "screen:home"
});


// Pages

// SCREEN: Home
addLayer({
    visible: "screen:home",
    image: "img/home@3x.png"
});

// SCREEN: Search
addLayer({
    visible: "screen:search",
    image: "img/search@3x.png"
});

// SCREEN: Likes
addLayer({
    visible: "screen:likes",
    image: "img/likes@3x.png"
});

// SCREEN: Profile
addLayer({
    visible: "screen:profile",
    image: "img/profile@3x.png"
});


// Main menu
var menu = addLayer({
    visible: "screen:home, screen:search, screen:likes, screen:profile",
    height: 55
});

// Main menu items
// Home link
menu.addLayer({
    width: "25%",
    click: "screen:home"
});
// Search link
menu.addLayer({
    width: "25%", left: "25%",
    click: "screen:search"
});
// Likes link
menu.addLayer({
    width: "25%", left: "50%",
    click: "screen:likes"
});
// Profile link
menu.addLayer({
    width: "25%", left: "75%",
    click: "screen:profile"
});
