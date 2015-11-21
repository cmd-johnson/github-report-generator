GitHub Report generateReport
============================

A `node.js` application for generating reports out of GitHub issues of repositories you are contributing to.

Installation
------------

Make sure you have a up-to-date `node.js` installation, clone the repository, switch to the repo's root directory and run `npm install`.

Setup
-----

First, you'll need to register a GitHub application for this app to work. You can do that [here](https://github.com/settings/applications/new). Make sure to set the `Authorization callback URL` to `http://[your.domain]/login/callback`.

Now you should adjust the config files. Open `config/github.json` and enter the data of your GitHub application (`clientID`, `clientSecret` and `callbackUrl`). The `userAgent` parameter is later used to make requests to the GitHub API (it rejects all requests without a user-agent set, see [here](https://developer.github.com/v3/#user-agent-required) for more information).

When you're done setting up the GitHub configuration, open `config/server.json`. Here you can change on what port the application will listen, along with the base-url that will later be used to build the links presented by the app's REST API. The session secret will be used to encrypt the session cookies used to remember the logged in user.

Running the app
---------------

After configuring the application, you should be good to go. Simply run `npm start` or `node app.js` to run it. When you're working on the app's code, I recommend using [`nodemon`](https://www.npmjs.com/package/nodemon) to automatically restart the app after changes. Install it globally by running `npm install -g nodemon`, then run the app using `nodemon app.js`.
