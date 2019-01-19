// Copy to config.js and fill in

module.exports = {
  // Mailgun API key and domain
  MAILGUN_API_KEY: '',
  MAILGUN_DOMAIN: '',

  // Sender address (in format 'My Name <my.email@xyz.com>')
  MAILGUN_FROM: '',
  // Target address
  MAILGUN_TO: ''
  // Override the GitHub repo for testing
  GITHUB_REPO_OVERRIDE: null,
  // Path to the NEWS file from the repo root
  GITHUB_NEWS_PATH: '',

  // GitHub webhook secret
  WEBHOOK_SECRET: '',
  // Webhook proxy URL (e.g. at smee.io) for testing
  WEBHOOK_PROXY_URL: null,
  // Normal webhook server port #
  WEBHOOK_PORT: 3000,
}
