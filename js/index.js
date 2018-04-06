angular.module('myApp', ['ngMap'])

    .controller('MyCtrl', function (NgMap, $http) {

        let vm = this;

        vm.aqAverage = 0.0;
        vm.center = 'Minneapolis';
        vm.address = 'Minneapolis';
        vm.measurements = [];

        NgMap.getMap().then(function (map) {
            vm.map = map;
        });

        vm.updateLocation = function () {
            let center = vm.map.getCenter();
            vm.center = center.lat() + "," + center.lng();

        $http.get("https://api.openaq.org/v1/measurements?coordinates=" + vm.center)
            .then(function (response) {
                vm.aqAverage = averageAQ(response.data);
            });

        createMarker(vm.map, center);
    };
});

            $http.get("https://api.openaq.org/v1/measurements?coordinates=" + vm.center)
                .then(function (response) {
                    let results = processAQ(response.data);
                    vm.aqAverage = results.average;
                    vm.measurements = results.measurements;

                    console.log(response);
                    createMarker(vm.map, response.data);
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
        measurements.push({address: item['city'], reading: item['value']});
        aqAverage += item['value'];
        count = i + 1;
    });

    return {average: (aqAverage / count), measurements: measurements};
}

function createMarker(map, data) {

    if (data.meta.found === 0) { return; }

    let contentString = "";
    $.each(data.results, (item, val) => {

    });

    let marker = new google.maps.Marker({
        position: new google.maps.LatLng(
            data.results[0].coordinates.latitude,
            data.results[0].coordinates.longitude
        ),
        map: map,
        title: 'Data'
    });

    marker.addListener('onmouseover', function() {
        new google.maps.InfoWindow({
            content: contentString
        }).open(map, marker)
    });
}