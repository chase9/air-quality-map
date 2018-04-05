angular.module('myApp', ['ngMap'])

.controller('MyCtrl', function (NgMap, $http) {
    let vm = this;

    vm.aqAverage = 0.0;
    vm.center = 'Minneapolis';
    vm.address = 'Minneapolis';

    NgMap.getMap().then(function (map) {
        vm.map = map;
    });

    vm.updateLocation = function () {
        let center = vm.map.getCenter();
        vm.center = center.lat() + "," + center.lng();

        $.ajax("https://nominatim.openstreetmap.org/reverse?format=json&lat=" + center.lat() + "&lon=" + center.lng())
            .then((response) => {
                vm.address = response['display_name'];
            });

        $http.get("https://api.openaq.org/v1/measurements?coordinates=" + vm.center)
            .then(function (response) {
                vm.aqAverage = averageAQ(response.data);
            });
    };
});

/**
 * This function finds the average of air quality measurements returned from openAQ.
 * @param aqResponse the response data from a call to api.openaq.org/v1/measurements
 * @returns {number} a double indicating the air quality average of the measurements
 */
function averageAQ(aqResponse) {
    let aqAverage = 0.0;
    let count = 0;

    // Iterate through each of the aq results
    $.each(aqResponse['results'], (i, item) => {
        aqAverage += item.value;
        count = i + 1;
    });

    return aqAverage / count;
}