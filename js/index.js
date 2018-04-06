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

            $.ajax("https://api.openaq.org/v1/measurements?coordinates=" + vm.center + "&date_from=" + dateFrom + "&date_to=" + dateTo)
            //$.getJSON("js/measurements.json")
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
 * @param aqResponse the response data from a call to api.openaq.org/v1/measurements
 * @returns {{average: number, measurements: Array}}
 */
function processAQ(aqResponse) {
    let aqAverage = 0.0;
    let count = 0;
    let measurements = [];

    // Iterate through each of the aq results
    $.each(aqResponse['results'], (i, item) => {
        measurements.push({
            city: item['city'],
            value: item['value'],
            unit: item['unit'],
            parameter: item['parameter']
        });
        aqAverage += item['value'];
        count = i + 1;
    });

    return {average: (aqAverage / count), measurements: measurements};
}

function createMarker(map, data) {

    if (data.meta.found === 0) {
        return;
    }

    let contentString = "<ul>";
    $.each(data.results, (item, val) => {
        contentString += "<li>" + val.city + ": " + val.value + " " + val.unit + " " + val.parameter + "</li>";
    });
    contentString += "</ul>";

    let marker = new google.maps.Marker({
        position: new google.maps.LatLng(
            data.results[0].coordinates.latitude,
            data.results[0].coordinates.longitude
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
}