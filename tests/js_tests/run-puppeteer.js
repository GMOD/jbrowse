/*eslint-env node*/

const fs = require('fs')
const assert = require('assert')
const puppeteer = require('puppeteer')

let browser
return puppeteer
  .launch()
  .then(b => {
    browser = b
    return b.newPage()
  })
  .then(page => {
    return new Promise((resolve, reject) => {
      page.on('console', msg => {
        console.log(msg.text())
      })
      page
        .goto(process.argv[2] || 'http://localhost:8082/tests/js_tests/')
        .then(() => {
          return page
            .evaluate(() => {
              return new Promise((res, rej) => {
                let counter = 0
                setInterval(() => {
                  if (
                    document.querySelector('.symbolSummary') !== null &&
                    document.querySelector('.symbolSummary .pending') === null
                  )
                    res(true)
                  else if (counter++ > 500) {
                    rej()
                  }
                }, 500)
              }).then(() => {
                return new Promise((res, rej) => {
                  var list = document.querySelectorAll(
                    '.results > #details > .specDetail.failed',
                  )
                  if (list && list.length > 0) {
                    console.log('')
                    console.log(list.length + ' test(s) FAILED:')
                    for (var i = 0; i < list.length; i++) {
                      var el = list[i],
                        desc = el.querySelector('.description').innerText,
                        res = el.querySelector('.resultMessage.fail').innerText
                      console.log('')
                      console.log(desc)
                      console.log(res)
                      console.log('')
                    }
                    rej()
                  } else {
                    console.log(
                      document.querySelector('.alert > .passingAlert.bar')
                        .innerText,
                    )
                    res()
                  }
                })
              })
            })
            .then(resolve, reject)
        })
    })
  })
  .then(
    () => {
      browser.close()
      process.exit(0)
    },
    () => {
      browser.close()
      process.exit(1)
    },
  )
