const MailgunApi = require('mailgun-js')
const WebhooksApi = require('@octokit/webhooks')
const fetch = require('node-fetch')

function try_require(path) {
  try {
    return require(path)
  } catch (ex) {
    return null
  }
}

const EventSource = try_require('eventsource')


let configPath
if (process.argv.length == 2) {
  configPath = './config.js'
} else if (process.argv.length == 3) {
  configPath = process.argv[2]
} else {
  throw new Exception('pass 1 or 2 command line arguments')
}

const config = require(configPath)

const mailgun = MailgunApi({apiKey: config.MAILGUN_API_KEY, domain: config.MAILGUN_DOMAIN})
const webhooks = new WebhooksApi({secret: config.WEBHOOK_SECRET})

async function handleWebhook({id, name, payload}) {
  if (payload.ref_type !== 'tag') {
    return
  }

  let match = payload.ref.match(/^v([0-9]+)(-rc.*)?$/)
  if (!match) {
    console.log(`Ignoring unknown tag ${payload.ref}`)
    return
  }

  let unprefixed = payload.ref.substring(1)

  let version = match[1]
  let prerelease = match[2] !== undefined
  console.log(`Received tag ${unprefixed} for v${version}${prerelease ? ' (prerelease)' : ''}`)

  let baseUrl = config.GITHUB_REPO_OVERRIDE || payload.repository.html_url
  let tarballUrl = `${baseUrl}/archive/${payload.ref}.tar.gz`
  let newsUrl = `${baseUrl}/raw/${payload.ref}/${config.GITHUB_NEWS_PATH}`

  console.log(`Reading news from ${newsUrl}`)
  let news = await fetch(newsUrl).then((res) => res.text())
  let changes = news.match(new RegExp(`CHANGES WITH ${version}.*:\n+((?:.|\n)*?)\nCHANGES`))[1]

  let message = {
    from: config.MAILGUN_FROM,
    to: config.MAILGUN_TO,
  }

  if (prerelease) {
    message.subject = `systemd prerelease ${unprefixed}`
    message.text = 'A new systemd ☠️ pre-release ☠️ has just been tagged.'
  } else {
    message.subject = `systemd ${unprefixed} released`
    message.text = '🎆 A new, official systemd release has just 🎉 been 🎊 tagged 🍾.'
  }

  message.text += ` Please download the tarball here:

        ${tarballUrl}

`

  if (prerelease) {
    message.text += `NOTE: This is ☠️ pre-release☠️ software. Do not run this on \
production systems, but please test this and report any issues you find to GitHub:

        https://github.com/systemd/systemd/issues/new?template=Bug_report.md

`
  }

  message.text += 'Changes since the previous release:\n\n'
  message.text += changes

  await mailgun.messages().send(message)
  console.log(`Sent message`)
}

webhooks.on('create', (event) => {
  handleWebhook(event).catch((ex) => {
    console.log(`Exception in webhook: ${ex}`)
  })
})


process.on('SIGINT', () => {
  process.exit(0)
})


if (config.WEBHOOK_PROXY_URL) {
  const source = new EventSource(config.WEBHOOK_PROXY_URL)

  source.onmessage = async (rawEvent) => {
    const webhookEvent = JSON.parse(rawEvent.data)
    await webhooks.verifyAndReceive({
      id: webhookEvent['x-request-id'],
      name: webhookEvent['x-github-event'],
      signature: webhookEvent['x-hub-signature'],
      payload: webhookEvent.body,
    })
  }

  console.log('EventSource set up, going to wait forever')

  function sleepForever() {
    setTimeout(sleepForever, 5000)
  }
  sleepForever()
} else {
  console.log(`Waiting on port ${config.WEBHOOK_PORT}`)
  require('http').createServer(webhooks.middleware).listen(config.WEBHOOK_PORT)
}
