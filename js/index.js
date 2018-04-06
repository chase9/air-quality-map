angular.module('myApp', ['ngMap'])

    .controller('MyCtrl', function (NgMap) {

        let vm = this;

        vm.aqAverage = 0.0;
        vm.center = '44.97772264248057,-93.26501080000003';
        vm.address = 'Minneapolis, Minnesota (US)';
        vm.measurements = [];

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
        });

        vm.updateLocation = function () {

            toDatePicker.datepicker("option", "minDate", fromDatePicker.val());

            let center = vm.map.getCenter();
            vm.center = center.lat() + "," + center.lng();

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

            let dateFrom = fromDatePicker.datepicker('getDate');
            let dateTo = toDatePicker.datepicker('getDate');

            dateFrom = dateFrom.getUTCFullYear() + "-" + dateFrom.getUTCMonth() + "-" + dateFrom.getUTCDay();
            dateTo = dateTo.getUTCFullYear() + "-" + dateTo.getUTCMonth() + "-" + dateTo.getUTCDay();

            let parameterString = "";

            $.ajax("https://api.openaq.org/v1/measurements?coordinates=" + vm.center + "&date_from=" + dateFrom + "&date_to=" + dateTo)
                .then((response) => {

                    console.log(response);

                    let results = processAQ(response);
                    vm.aqAverage = results.average;
                    vm.measurements = results.measurements;

                    createMarker(vm.map, response);
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
 */
function createMarker(map, data) {

    // Check for no points found
    if (data.meta.found === 0) { return; }

    let coordinates = [];
    // Loop through all data points and separate out their coordinates
    $.each(data.results, (item, val) => {
        let found = false;

        $.each(coordinates, (subitem, subval) => {
            if (val.coordinates.latitude === subval.latitude && val.coordinates.longitude === subval.longitude) {
                found = true;
            }
        });

        if (!found) {
            coordinates.push(val.coordinates);
        }
    });

    // Loop through our separated coordinates
    $.each(coordinates, (item, val) => {

        let contentString = "<table>";
        $.each(data.results, (subitem, subval) => {
            if (subval.coordinates.latitude === val.latitude && subval.coordinates.longitude === val.longitude) {
                contentString += "<tr><td>(" + subval.date.local + "):</td><td>" + subval.value + " " + subval.unit + "</td><td>" + subval.parameter + "</td></tr>";
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

        marker.addListener('mouseout', function() {
            infoWindow.close();
        });
    });
}