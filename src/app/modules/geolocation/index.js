function getCoords() {
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(function(geo) {
            let { latitude, longitude } = geo.coords
            resolve({ lat: latitude, lng: longitude })
        })
    })
}


export { getCoords }