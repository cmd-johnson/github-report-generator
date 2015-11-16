'use strict';

var logger = require.main.logger;

var Router = require('express').Router;
var router = new Router();

var ensureAuthenticated = require('../api').ensureAuthenticated;
var getRequestHeaders = require('../api').getRequestHeaders;
var traverson = require('traverson');

module.exports = router;

router.get('', ensureAuthenticated, function(req, res) {
  loadRepositories(req, function(err, repositories) {
    if (err) {
      return res.status(500).json({
        message: 'error requesting repository list'
      });
    }
    return res.json(repositories);
  });
});

router.get('/:repositoryId', ensureAuthenticated, function(req, res) {
  try {
    parseInt(req.params.repositoryId, 10);
  } catch (exception) {
    return res.status(400).json({
      message: 'malformed repositoryId'
    });
  }

  loadRepositoryIssues(req, function(err, issues) {
    if (err) {
      return res.status(400).json(err);
    }
    return res.json(issues);
  });
});



function loadRepositories(req, fetchedCb) {
  var user = req.user;

  if (user.repositories && user.repositories.length > 0) {
    return fetchedCb(null, user.repositories);
  }

  traverson.from('https://api.github.com')
  .json()
  .follow('current_user_repositories_url')
  .withRequestOptions({ headers: getRequestHeaders(user) })
  .getResource(function(error, resource) {
    if (error) {
      return fetchedCb(error);
    }

    var repositories = [];

    for (var i = 0; i < resource.length; i++) {
      var repo = {
        id: resource[i].id,
        name: resource[i].name,
        fullName: resource[i].full_name,
        description: resource[i].description,
        createdAt: resource[i].created_at,
        updatedAt: resource[i].updated_at,
        gitIssuesUrl: resource[i].issues_url,
        issuesUrl: 'http://localhost:3000' + req.originalUrl + '/' + resource[i].id
      };
      repositories.push(repo);
    }

    user.repositories = repositories;
    return fetchedCb(null, repositories);
  });
}

function loadRepositoryIssues(req, fetchedCb) {
  var user = req.user;

  if (!user.repositories || user.repositories.length === 0) {
    return loadRepositories(user, function(error) {
      if (error) {
        return fetchedCb(error);
      }
      loadRepositoryIssues(user, fetchedCb);
    });
  }

  var repositories = user.repositories;
  var repo = null;
  for (var i = 0; i < repositories.length; i++) {
    if (repositories[i].id === parseInt(req.params.repositoryId, 10)) {
      repo = repositories[i];
      break;
    }
  }
  if (repo === null) {
    return fetchedCb({ message: 'invlid repositoryId' });
  }

  loadFullPaginatedResource(user, repo.gitIssuesUrl, { state: 'all' }, function(error, issues) {
    return fetchedCb(error, issues);
  });
}

var linkHeaderRegex = /^<(http[s]?:\/\/[a-z0-9\.]+\/.*?)>; rel="([a-z0-9]+)"$/i;

function loadFullPaginatedResource(user, link, queryOptions, fetchedCb, previousItems) {
  var items = previousItems || [];

  logger.trace('requesting ' + link + ' with queryOptions ' + JSON.stringify(queryOptions));

  traverson.from(link)
  .withRequestOptions({
    headers: getRequestHeaders(user),
    qs: queryOptions
  })
  .get(function(error, response) {
    if (error) {
      return fetchedCb(error);
    }

    var res = JSON.parse(response.body);

    for (var itemId = 0; itemId < res.length; itemId++) {
      items.push(res[itemId]);
    }

    var nextLink = '';
    var lastLink = '';

    if (response.headers['link']) {
      var links = response.headers['link'].split(', ');

      for (var i = 0; i < links.length; i++) {
        var match = linkHeaderRegex.exec(links[i]);
        if (match) {
          if (match[2] === 'next') {
            nextLink = match[1];
          } else if (match[2] === 'last') {
            lastLink = match[1];
          }
        }
      }
    }

    if (link === lastLink || nextLink === '') {
      return fetchedCb(null, items);
    } else {
      // there are more pages to fetch!
      return loadFullPaginatedResource(user, nextLink, queryOptions, fetchedCb, items);
    }
  });
}
