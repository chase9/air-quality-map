angular.module('myApp', ['ngMap'])

    .controller('MyCtrl', function (NgMap) {

        let vm = this;

        vm.aqAverage = 0.0;
        vm.center = '44.97772264248057,-93.26501080000003';
        vm.radius = 0;
        vm.address = 'Minneapolis, Minnesota (US)';
        vm.measurements = [];
        vm.markers = [];

        vm.dateFrom = new Date().toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
        vm.dateTo = new Date().toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });

        let fromDatePicker = $('#fromDatePicker');
        fromDatePicker.datepicker({
            minDate: "-90d",
            maxDate: 0
        });
        let toDatePicker = $('#toDatePicker');
        toDatePicker.datepicker({
            minDate: fromDatePicker.val(),
            maxDate: 0
        });

        NgMap.getMap().then(function (map) {
            vm.map = map;
            vm.markerCluster = new MarkerClusterer(map, [], {
                imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
            });
        });

        vm.updateLocation = function () {

            // Update the center of our map
            let center = vm.map.getCenter();
            vm.center = center.lat() + "," + center.lng();

            // Update the radius of our map
            vm.radius = getMapRadius(vm.map);
            console.log(vm.radius);

            // Get the address of the center of our map
            $.ajax("https://nominatim.openstreetmap.org/reverse?format=json&lat=" + center.lat() + "&lon=" + center.lng())
                .then((response) => {
                    let addressString = "";
                    if (typeof response.address.city === "undefined") {
                        addressString = response.address.state + " (" + response.address.country_code.toUpperCase()+ ")"
                    } else {
                        addressString = response.address.city + ", " + response.address.state + " (" + response.address.country_code.toUpperCase()+ ")"
                    }

                    vm.address = addressString;
                });

            // Declare and initialize our date picker
            toDatePicker.datepicker("option", "minDate", fromDatePicker.val());

            let dateFrom = fromDatePicker.datepicker('getDate');
            let dateTo = toDatePicker.datepicker('getDate');

            dateFrom = dateFrom.getUTCFullYear() + "-" + dateFrom.getUTCMonth() + "-" + dateFrom.getUTCDay();
            dateTo = dateTo.getUTCFullYear() + "-" + dateTo.getUTCMonth() + "-" + dateTo.getUTCDay();

            // Make a call to retrieve air quality data
            $.ajax("https://api.openaq.org/v1/measurements?coordinates=" + vm.center + "&radius=" + vm.radius + "&date_from=" + dateFrom + "&date_to=" + dateTo)
                .then((response) => {

                    console.log(response);

                    // Update the variables that contain our data
                    let results = processAQ(response);
                    vm.aqAverage = results.average;
                    vm.measurements = results.measurements;

                    // Create all markers on our map based on the data
                    createMarker(vm.map, response, vm.markers, vm.markerCluster);
                });
        };
    });

/**
 * This function finds the average of air quality measurements returned from openAQ.
 * @param aqResponse - The response data from a call to api.openaq.org/v1/measurements
 * @returns {{average: number, measurements: Array}}
 */
function processAQ(aqResponse) {
    let aqAverage = 0.0;
    let count = 0;
    let measurements = [];

    // Iterate through each of the aq results
    $.each(aqResponse['results'], (i, item) => {
        measurements.push({
            location: item['location'],
            value: item['value'],
            unit: item['unit'],
            parameter: item['parameter']
        });
        aqAverage += item['value'];
        count = i + 1;
    });

    return {average: (aqAverage / count), measurements: measurements};
}

/**
 * This function separates locations based on coordinates and creates a point at each coordinate with related information
 * @param map - The map that will contain our markers
 * @param data - The data that we will create our markers based off of
 * @param markerCoordinates - A list of all coordinates of markers that exist on the map
 * @param markerCluster - A MarkerCluster object that will cluster our markers
 */
function createMarker(map, data, markerCoordinates, markerCluster) {
    console.log(markerCoordinates);

    // Check for no points found
    if (data.meta.found === 0) { return; }

    let coordinates = [];
    // Loop through all data points and separate out their coordinates
    $.each(data.results, (item, val) => {
        let willAdd = true;

        if (markerExists(val.coordinates, markerCoordinates)) {
            willAdd = false;

        } else {
            $.each(coordinates, (subitem, subval) => {

                if (val.coordinates.latitude === subval.latitude && val.coordinates.longitude === subval.longitude) {
                    willAdd = false;
                }
            });
        }

        if (willAdd) {
            coordinates.push(val.coordinates);
        }
    });

    // Loop through our separated coordinates
    $.each(coordinates, (item, val) => {

        let contentString = "<table>";
        $.each(data.results, (subitem, subval) => {
            if (subval.coordinates.latitude === val.latitude && subval.coordinates.longitude === val.longitude) {
                contentString += "<tr><td>" + subval.location + "</td><td>(" + subval.date.local + "):</td><td>" + subval.value + " " + subval.unit + "</td><td>" + subval.parameter + "</td></tr>";
            }
        });
        contentString += "</table>";


        let marker = new google.maps.Marker({
            position: new google.maps.LatLng(
                val.latitude,
                val.longitude
            ),
            map: map,
            title: 'Data'
        });

        let infoWindow = new google.maps.InfoWindow({
            content: contentString
        });

        marker.addListener('mouseover', function () {
            infoWindow.open(map, marker)
        });

        marker.addListener('mouseout', function () {
            infoWindow.close();
        });

        markerCoordinates.push(val);
        markerCluster.addMarkers([marker]);
    });
}

function markerExists(coordinates, markers) {
    let found = false;

    $.each(markers, (item, val) => {
        if (val.latitude === coordinates.latitude && val.longitude === coordinates.longitude) {
            found = true;
        }
    });

    return found;
}

function getMapRadius(map) {
    let bounds = map.getBounds();

    let diameter = getDistanceFromLatLonInKm(
        bounds.getNorthEast().lat(), bounds.getNorthEast().lng(),
        bounds.getSouthWest().lat(), bounds.getSouthWest().lng()
    ) * 1000;

    return diameter / 2;
}

// https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
    let R = 6371; // Radius of the earth in km
    let dLat = deg2rad(lat2-lat1);  // deg2rad below
    let dLon = deg2rad(lon2-lon1);
    let a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    let d = R * c; // Distance in km
    return d;
}
function deg2rad(deg) {
    return deg * (Math.PI/180)
}