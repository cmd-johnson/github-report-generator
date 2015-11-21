'use strict';

var async = require('async');

var logger = require.main.logger;
var config = require.main.config;

var Router = require('express').Router;
var router = new Router();

var ensureAuthenticated = require('../api').ensureAuthenticated;
var getRequestHeaders = require('../api').getRequestHeaders;
var traverson = require('traverson');

module.exports = router;


router.get('', ensureAuthenticated, getRepositories);

router.get('/:repositoryId/report',
  ensureAuthenticated,
  extractRepository,
  generateReport);


function getRepositories(req, res) {
  logger.trace('getRepositories');

  loadRepositories(req, function(err, repositories) {
    if (err) {
      return res.status(500).json({
        message: 'error requesting repository list'
      });
    }
    return res.json(repositories);
  });
}

function generateReport(req, res) {
  logger.trace('generateReport');

  var user = req.user;
  var repo = req.repository;
  var from = req.query.from;

  loadRepositoryIssues(user, repo, from, function(error, issues) {
    if (error) {
      return res.status(400).json(error);
    }
    return res.json(issues);
  });
}

function loadRepositories(req, fetchedCb) {
  logger.trace('loadRepositories');

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
        issuesUrl: resource[i].issues_url,
        reportUrl: config.server.baseUrl + req.originalUrl + '/' + resource[i].id + '/report{?from}'
      };
      repositories.push(repo);
    }

    user.repositories = repositories;
    return fetchedCb(null, repositories);
  });
}

function loadRepositoryIssues(user, repository, from, issuesLoadedCb) {
  loadFullPaginatedResource(user, repository.issuesUrl, { state: 'all', since: from }, function(error, issues) {
    if (error) {
      return issuesLoadedCb(error);
    }

    logger.debug('loadFullPaginatedResource returned ' + issues.length + ' issues');

    var relevant = { };

    async.each(issues, function(issue, doneCb) {
      // skip pull-requests
      if ('pull_request' in issue) {
        return doneCb();
      }

      loadInvolvedUsers(user, issue.events_url, function(err, involvedUsers) {
        logger.trace('loadInvolvedUsers for ' + issue.title + ' returned');

        if (err) {
          return doneCb(err);
        }

        var relevantParts = {
          title: issue.title,
          id: issue.id,
          number: issue.number,
          description: issue.body,
          labels: issue.labels,
          state: issue.state,
          assignee: (issue.assignee && {
            id: issue.assignee.id,
            login: issue.assignee.login
          }) || null,
          createdAt: issue.created_at,
          lastUpdate: issue.updated_at,
          closedAt: issue.closed_at,
          involvedUsers: []
        };

        // remove the assignee from the involved users list
        for (var i = 0; i < involvedUsers.length; i++) {
          if (involvedUsers[i].id === relevantParts.assignee.id) {
            relevantParts.involvedUsers = involvedUsers.splice(i, 1);
            break;
          }
        }

        var milestone = (issue.milestone && issue.milestone.title) || 'unassigned';

        if (!(milestone in relevant)) {
          relevant[milestone] = [];
        }

        relevant[milestone].push(relevantParts);

        logger.trace('exiting async.each for ' + issue.title);
        return doneCb();
      });
    }, function(err) {
      logger.trace('loadRepositoryIssues exit');
      issuesLoadedCb(err, relevant);
    });
  });
}

function loadInvolvedUsers(user, issueEventsUrl, usersFetchedCb) {
  loadFullPaginatedResource(user, issueEventsUrl, {}, function(error, events) {
    if (error) {
      return usersFetchedCb(error);
    }

    var mentionedUsers = [];
    for (var i = 0; i < events.length; i++) {
      var update = events[i];
      if (update.event === 'mentioned' && update.actor) {
        var mentioned = {
          id: update.actor.id,
          name: update.actor.login
        };
        var alreadyIn = false;
        for (var j = 0; j < mentionedUsers.length; j++) {
          if (mentionedUsers[j].id === mentioned.id) {
            alreadyIn = true;
            break;
          }
        }
        if (!alreadyIn) {
          mentionedUsers.push(mentioned);
        }
      }
    }
    usersFetchedCb(null, mentionedUsers);
  });
}

function loadFullPaginatedResource(user, link, queryOptions, fetchedCb, previousItems) {
  logger.trace('loadFullPaginatedResource', link, queryOptions);

  var items = previousItems || [];

  traverson.from(link)
  .withRequestOptions({
    headers: getRequestHeaders(user),
    qs: queryOptions
  })
  .get(function(error, response) {
    if (error) {
      return fetchedCb(error);
    }
    items = items.concat(JSON.parse(response.body));

    var links = parseLinkHeader(response.headers['link']);

    if (!links || !links.last || link === links.last || !links.next || links.next === '') {
      return fetchedCb(null, items);
    } else {
      // there are more pages to fetch!
      return loadFullPaginatedResource(user, links.next, queryOptions, fetchedCb, items);
    }
  });
}

var linkHeaderRegex = /^<(http[s]?:\/\/[a-z0-9\.]+\/.*?)>; rel="([a-z0-9]+)"$/i;

function parseLinkHeader(linkHeader) {
  logger.trace('parseLinkHeader', linkHeader);

  if (!linkHeader) {
    return null;
  }

  var links = {};

  if (linkHeader && typeof linkHeader === 'string') {
    var linkSegments = linkHeader.split(', ');

    for (var i = 0; i < linkSegments.length; i++) {
      var match = linkHeaderRegex.exec(linkSegments[i]);
      if (match) {
        links[match[2]] = match[1];
      }
    }
  }

  return links;
}

// middleware
function extractRepository(req, res, next) {
  logger.trace('extractRepository');

  if (!req.params.repositoryId) {
    return next();
  }

  var repositoryId = parseInt(req.params.repositoryId, 10);
  if (isNaN(repositoryId)) {
    return next({
      message: 'malformed repositoryId'
    });
  }

  if (!req.user.repositories) {
    return loadRepositories(req, function(error) {
      if (error) {
        return next(error);
      }
      return extractRepository(req, res, next);
    });
  }
  var repos = req.user.repositories;
  for (var i = 0; i < repos.length; i++) {
    if (repos[i].id === repositoryId) {
      req.repository = repos[i];
      return next();
    }
  }
  return next({
    message: 'invalid repositoryId'
  });
}
