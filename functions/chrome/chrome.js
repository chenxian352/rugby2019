const chromium = require('chrome-aws-lambda')
const puppeteer = require('puppeteer-core')
const fetch = require('node-fetch')

exports.handler = async (event, context, callback) => {
  let theTitle = null
  let browser = null
  let targetDOM = null
  const targetSelector = '.pools__items-wrapper'

  let getCachedDOMHTML = false;
  console.log('Fetching GraphCMS')
  await fetch("https://api-uswest.graphcms.com/v1/ck0w3i8cv2du401eb3dtm586l/master", {
    method: 'POST',
    headers: {
      "Content-type": "application/json"
    },
    body: JSON.stringify({
      query: `
        query {
          domHtml(where: {id: "ck0w3jgbxny9l0998orsk5od8"}) {
            jsNow
            id
            body
          }
        }
        `
    })
  })
  .then(response => response.json())
  .then(data => {
    if ( (data.data.jsNow + 600000) > Date.now() ) {
      console.log('Cached GraphCMS is updated in 10 minutes', data)
      getCachedDOMHTML = true
      targetDOM = JSON.parse(data.data.body)
    }
  })

  if (!getCachedDOMHTML) {

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
      // await page.waitFor(3000)
      await page.waitForSelector(targetSelector)

      theTitle = await page.title();
      targetDOM = await page.$eval(targetSelector, e => e.outerHTML);
      targetDOM = targetDOM.replace("\n", '').
        replace(/\\n/, '').
        replace(/\n/, '');
      targetDOM = JSON.stringify(targetDOM)

      console.log('Page Loaded: ', theTitle)
      console.log('Target DOM HTML: ', targetDOM.substr(0, 100))

      console.log('Updating GraphCMS.')

      let jsNow = JSON.stringify(Date.now().toString())

      await fetch("https://api-uswest.graphcms.com/v1/ck0w3i8cv2du401eb3dtm586l/master", {
        method: 'POST',
        headers: {
          "Content-type": "application/json"
        },
        body: JSON.stringify({
          query: `
          mutation {
            updateDomHtml(
              where: { id: "ck0w3jgbxny9l0998orsk5od8" }
              data: { 
                body: ${targetDOM}
                jsNow: ${jsNow} 
              }
            ) {
              id
              body
            }
          }
        `
        })
      })
      .then(response => response.json())
      .then(data => (
        console.log('Updated GraphCMS', data)
      ))

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
  }


  return callback(null, {
    statusCode: 200,
    body: JSON.stringify({
      targetDOM: targetDOM
    })
  })
}
