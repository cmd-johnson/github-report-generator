(function() {
  'use strict';

  angular.module('application', [
    'ui.router'
  ]);

  angular.module('application').config(function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/');

    $stateProvider.state('login', {
      url: '/',
      templateUrl: 'templates/login.html'
    });

    $stateProvider.state('repositorySelection', {
      url: '/repositories',
      templateUrl: 'templates/repository-selection.html'
    });

    $stateProvider.state('repositoryReport', {
      url: '/repositories/:repoId/report',
      templateUrl: 'templates/report.html'
    });
  });

  angular.module('application').factory('reportApi', function($http) {
    var reportApi = {
      ensureLoggedIn: ensureLoggedIn,
      loadRepositories: loadRepositories,
      generateReport: generateReport
    };

    function ensureLoggedIn(loggedInCallback) {
      $http.get('/api/status')
      .then(function success(response) {
        loggedInCallback(response.data);
      }, function error() {
        loggedInCallback(false);
      });
    }

    function loadRepositories(reposLoadedCallback) {
      $http.get('/api/repositories')
      .then(function success(response) {
        reposLoadedCallback(response.data);
      }, function error() {
        reposLoadedCallback(null);
      });
    }

    function generateReport(repoId, startTime, reportGeneratedCallback) {
      var requestUrl = '/api/repositories/' + repoId + '/report';
      if (startTime) {
        requestUrl += '?from=' + startTime;
      }

      $http.get(requestUrl)
      .then(function success(response) {
        reportGeneratedCallback(response.data);
      }, function error() {
        reportGeneratedCallback(null);
      });
    }

    return reportApi;
  });

  angular.module('application').controller('repositorySelection', function($rootScope, $scope, $state, reportApi) {
    $scope.loading = false;
    $scope.loadingError = false;
    $scope.reloadRepositories = reloadRepositories;

    reportApi.ensureLoggedIn(function(user) {
      if (!user || !user.loggedIn) {
        return $state.go('login');
      }
      $rootScope.user = user;
      reloadRepositories();
    });

    function reloadRepositories() {
      $scope.loading = true;
      $scope.repositories = [];

      reportApi.loadRepositories(function(repositories) {
        $scope.loading = false;
        $scope.loadingError = !repositories;

        if (!$scope.loadingError) {
          $scope.repositories = repositories;
        }
      });
    }
  });

  angular.module('application').controller('repositoryReport', function($rootScope, $scope, $state, $stateParams, reportApi) {
    $scope.report = [];
    $scope.loading = false;
    $scope.loadingError = false;
    $scope.startTime = null;
    $scope.generateReport = generateReport;

    if (!$rootScope.user || !$rootScope.user.loggedIn) {
      $state.go('login');
    }

    function generateReport() {
      $scope.loading = true;
      $scope.report = [];

      reportApi.generateReport($stateParams.repoId, $scope.startTime, function(report) {
        $scope.loading = false;
        $scope.loadingError = !report;

        if (!$scope.loadingError) {
          var milestones = Object.keys(report);
          milestones.sort();

          // put the 'unassigned' milestone behind all others
          if ('unassigned' in report) {
            milestones.splice(milestones.indexOf('unassigned'), 1);
            milestones.push('unassigned');
          }

          var sortedReport = [];

          for (var i = 0; i < milestones.length; i++) {
            sortedReport.push({
              milestone: milestones[i],
              description: report[milestones[i]].description,
              issues: report[milestones[i]].issues
            });
          }

          $scope.report = sortedReport;
        }
      });
    }
  });
}());
