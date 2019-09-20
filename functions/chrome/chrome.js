const chromium = require('chrome-aws-lambda')
const puppeteer = require('puppeteer-core')

exports.handler = async (event, context, callback) => {
  let theTitle = null
  let browser = null
  let targetDOM = null
  const targetSelector = '.pools__items-wrapper'

  console.log('Spawning Chrome Headless')

  try {
    const executablePath = await chromium.executablePath

    // setup
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: executablePath,
      headless: chromium.headless,
    })

    // Do stuff with headless chrome
    const page = await browser.newPage()
    const targetUrl = 'https://www.rugbyworldcup.com/'

    // Goto page and then do stuff
    await page.goto(targetUrl, {
      waitUntil: ["domcontentloaded", "networkidle0"]
    })

    await page.waitForSelector(targetSelector)

    theTitle = await page.title();
    await page.$eval(targetSelector, e => targetDOM = e.innerHTML);

    console.log('Page Loaded: ', theTitle)
    console.log('Target DOM HTML: ', targetDOM)

  } catch (error) {
    console.log('error', error)
    return callback(null, {
      statusCode: 500,
      body: JSON.stringify({
        error: error
      })
    })
  } finally {
    // close browser
    if (browser !== null) {
      await browser.close()
    }
  }

  return callback(null, {
    statusCode: 200,
    body: JSON.stringify({
      title: theTitle,
      targetDOM: targetDOM
    })
  })
}
