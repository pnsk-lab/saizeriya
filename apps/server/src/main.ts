import { Hono } from 'hono'
import { PeopleNumber } from './template/Number'
import { Top } from './template/Top'
import { Main } from './template/Main'
import { History } from './template/History'
import { Menu } from './template/Menu'
import { Account } from './template/Account'
import { Call } from './template/Call'

interface Data {
  proc: 'history' | 'main' | 'top' | 'number' | 'menu'
  ctrl: 'remember'
  sub_ctrl: ''
  cur_lang: '1'
  message: ''
  code: ''
  'drinkbar-cnt': '0'
  'alcohol-cnt': '0'
  'ord-drkbar-cnt': '0'
  token: '6954a6a3c646a5.93625306'
}
const saizeriyaApp = new Hono()
  .all('/', async (c) => {
    const search = new URL(c.req.url).search.slice(1)
    let data: Data | undefined
    if (c.req.header('Content-Type') === 'application/x-www-form-urlencoded') {
      data = Object.fromEntries(
        (await c.req.formData()).entries(),
      ) as unknown as Data
    }

    const next = data?.proc ?? 'top'

    if (next === 'number') {
      return c.html(PeopleNumber())
    }
    if (next === 'top') {
      return c.html(Top())
    }
    if (next === 'main') {
      return c.html(Main())
    }
    if (next === 'menu') {
      return c.html(Menu())
    }
    if (next === 'history') {
      return c.html(History())
    }
    if (next === 'call') {
      return c.html(Call())
    }
    if (next === 'account') {
      return c.html(Account())
    }
    return c.notFound()
  })

  .get('/src/page/js/base.js.php', async (c) => {
    const jsName = c.req.query('JS')
    if (!jsName || jsName.includes('..')) {
      return c.text('Invalid JS parameter', 400)
    }
    const filePath = `./dynamic-assets/js/${jsName.replace('.php', '')}`
    const file = Bun.file(filePath)
    if (!(await file.exists())) {
      return c.text('File not found', 404)
    }
    return c.body(file.stream())
  })
  .get('/data/:path{.+}', async (c) => {
    const path = c.req.param('path')
    if (path.includes('..')) {
      return c.text('Invalid path', 400)
    }
    const filePath = `./assets/data/${path}`
    const file = Bun.file(filePath)
    if (!(await file.exists())) {
      return c.text('File not found', 404)
    }
    return c.body(file.stream())
  })
  .get('/src/:path{.+}', async (c) => {
    const path = c.req.param('path')
    if (path.includes('..')) {
      return c.text('Invalid path', 400)
    }
    const filePath = `./assets/src/${path}`
    const file = Bun.file(filePath)
    if (!(await file.exists())) {
      const filePathNoPhp = filePath
        .replace(/\.js.php$/, '.js.php.js')
        .replace(/\.css.php$/, '.css.php.css')
      const fileNoPhp = Bun.file(filePathNoPhp)
      if (!(await fileNoPhp.exists())) {
        return c.text('File not found', 404)
      }
      return c.body(fileNoPhp.stream())
    }
    return c.body(file.stream())
  })

export default new Hono().route('/saizeriya3/', saizeriyaApp)
