angular.module('myApp', ['ngMap']).controller('MyCtrl', function(NgMap, $http) {
    var vm = this;

    vm.center = 'Minneapolis';
    vm.aqTable = [];

    NgMap.getMap().then(function(map) {
        vm.map = map;
    });

    vm.updateLocation = function() {
        var center = vm.map.getCenter();
        vm.center = center.lat() + "," + center.lng();

        console.log(vm.center);

        $http.get("https://api.openaq.org/v1/measurements?coordinates=" + vm.center)
            .then(function(response){
                vm.aqTable = response.data;
                console.log(vm.aqTable);
            });
    };
});