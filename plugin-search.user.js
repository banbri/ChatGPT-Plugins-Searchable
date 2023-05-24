// ==UserScript==
// @name         让你的 ChatGPT 插件商店支持搜索
// @name:zh-CN   让你的 ChatGPT 插件商店支持搜索
// @name:zh-TW   让你的 ChatGPT 插件商店支持搜索
// @name:en      Make your ChatGPT Plugin store searchable.
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  在 ChatGPT 插件商店里面添加搜索框，实现搜索！
// @description:zh-CN  在 ChatGPT 插件商店里面添加搜索框，实现搜索！
// @description:zh-TW  在 ChatGPT 插件商店里面添加搜索框，实现搜索！
// @description:en  Add a search box in the ChatGPT Plugin store to achieve search!
// @author       Banbri
// @match        https://chat.openai.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @grant        unsafeWindow
// @homepage          https://github.com/banbri/ChatGPT-Plugins-Searchable
// @supportURL        https://github.com/banbri/ChatGPT-Plugins-Searchable
// @updateURL         https://chatgpt-plugins.banbri.cn/plugin.user.js
// @downloadURL       https://chatgpt-plugins.banbri.cn/plugin.user.js
// @run-at       document-start
// @license      MIT
// ==/UserScript==

;(function () {
  const constantMock = unsafeWindow.fetch

  let plugins = []
  let token = ''
  let hasOperation = false

  const pluginStoreSelector = '.mt-4.flex.flex-col.gap-4'
  const pluginStoreHeaderSelector = '.flex.flex-wrap.gap-3'
  const shadowMaskSelector = 'absolute inset-0'

  unsafeWindow.fetch = function () {
    const response = constantMock.apply(this, arguments)
    if (
      arguments[0].indexOf('https://chat.openai.com/backend-api/aip/p') > -1
    ) {
      token = arguments[1].headers.Authorization
      response
        .then((result) => {
          result
            .clone()
            .json()
            .then((body) => {
              plugins = body.items
            })
        })
        .catch((err) => {})
    }
    return response
  }

  function waitForElm(selector) {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector))
      }

      const observer = new MutationObserver((mutations) => {
        if (document.querySelector(selector)) {
          resolve(document.querySelector(selector))
          observer.disconnect()
        }
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      })
    })
  }

  main()

  function watchMask() {
    let shadow = null
    const els = document.body.childNodes
    for (let i = 0; i < els.length; i++) {
      if (els[i].className === shadowMaskSelector) {
        shadow = els[i]
        break
      }
    }

    var observerOptions = {
      childList: true,
    }

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.removedNodes.length) {
          for (let removedNode of mutation.removedNodes) {
            if (removedNode === shadow) {
              // console.log('目标元素已被移除');
              if (hasOperation) {
                // 刷新页面
                location.reload()
                return
              }
              main()
            }
          }
        }
      })
    })

    observer.observe(shadow.parentNode, observerOptions)
  }

  function main() {
    waitForElm(pluginStoreSelector).then(() => {
      waitForElm(pluginStoreHeaderSelector).then((element) => {
        watchMask()

        // 创建一个按钮
        const button = document.createElement('button')
        button.setAttribute('type', 'button')
        button.setAttribute('id', 'search-button')
        button.setAttribute(
          'class',
          'btn relative btn-neutral focus:ring-0 text-black/50',
        )
        button.innerText = 'Search'

        // 创建一个输入框
        const input = document.createElement('input')
        input.setAttribute('type', 'text')
        input.setAttribute('id', 'search')
        input.setAttribute('placeholder', 'Search Plugin')
        input.setAttribute(
          'class',
          'w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-sm',
        )
        input.setAttribute('autocomplete', 'off')
        input.addEventListener('keyup', (event) => {
          if (event.keyCode === 13) {
            event.preventDefault()
            button.click()
          }
        })

        // 创建一个div
        const div = document.createElement('div')
        div.setAttribute('class', 'flex gap-3 ml-auto')
        div.appendChild(input)
        div.appendChild(button)

        element.appendChild(div)

        const pluginContainer = element.nextElementSibling
        const bottomContainer = pluginContainer.nextElementSibling

        // 按钮点击事件
        button.addEventListener('click', () => {
          bottomContainer.classList.add('hidden')
          pluginContainer.classList.add('relative')

          // 查询 element 下所有的直属 .btn
          const buttons = Array.from(element.querySelectorAll('.btn')).slice(
            0,
            -1,
          )
          buttons.forEach((item) => {
            item.classList.remove('btn-light')
            item.classList.add('btn-neutral')
            item.classList.add('text-black/50')

            item.addEventListener('click', () => {
              bottomContainer.classList.remove('hidden')
              // 移除 pluginContainer 元素
              cover.remove()
            })
          })

          if (document.querySelector('#cover')) {
            document.querySelector('#cover').remove()
          }

          // 创建一个div
          const cover = document.createElement('div')
          cover.setAttribute(
            'class',
            'absolute top-0 left-0 w-full h-full grid grid-cols-1 gap-3 sm:grid-cols-2 sm:grid-rows-2 lg:grid-cols-3 xl:grid-cols-4 bg-white',
          )
          cover.setAttribute('id', 'cover')
          cover.setAttribute('style', 'z-index: 999;')

          pluginContainer.appendChild(cover)

          const search = document.querySelector('#search')
          const searchValue = search.value

          const plugin = plugins.find(
            (item) =>
              item.manifest.name_for_human.toLowerCase().replace(/\s/g, '') ===
              searchValue.toLowerCase().replace(/\s/g, ''),
          )

          if (!plugin) {
            cover.innerHTML = `
            <div class="w-full h-full flex items-center justify-center text-black/50">No result.</div>
          `
            return
          }

          const { name_for_human, description_for_human, logo_url } =
            plugin.manifest
          const {
            id,
            user_settings: { is_installed },
          } = plugin

          const uninstalledBtn = `
        <button class="btn relative btn-light hover:bg-gray-200"><div class="flex w-full gap-2 items-center justify-center">Uninstall<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></div></button>
        `

          const installedBtn = `
          <button class="btn relative btn-primary">
            <div class="flex w-full gap-2 items-center justify-center">
              Install<svg
                stroke="currentColor"
                fill="none"
                stroke-width="2"
                viewBox="0 0 24 24"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-4 w-4"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg">
                <polyline points="8 17 12 21 16 17"></polyline>
                <line x1="12" y1="12" x2="12" y2="21"></line>
                <path
                  d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"></path>
              </svg>
            </div>
          </button>
        `

          cover.innerHTML = `
        <div
          class="flex flex-col gap-4 rounded border border-black/10 bg-white p-6 dark:border-white/20 dark:bg-gray-900">
          <div class="flex gap-4">
            <div class="h-[70px] w-[70px] shrink-0">
              <div class="relative" style="width: 100%; height: 100%">
                <img
                  src="${logo_url}"
                  alt="logo"
                  class="h-full w-full bg-white rounded-[5px]" />
                <div
                  class="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-[5px]"></div>
              </div>
            </div>
            <div class="flex min-w-0 flex-col items-start justify-between">
              <div class="max-w-full truncate text-lg leading-6">${name_for_human}</div>
              ${is_installed ? uninstalledBtn : installedBtn}
            </div>
          </div>
          <div class="h-[60px] text-sm text-black/70 line-clamp-3 dark:text-white/70">
            ${description_for_human}
          </div>
        </div>
        `

          const installButton = cover.querySelector('.btn')
          installButton.addEventListener('click', () => {
            hasOperation = true
            const pendingBtn = `
            <button class="btn relative btn-light bg-green-100 hover:bg-green-100">
              <div class="flex w-full gap-2 items-center justify-center">
                Installing
                <svg
                  stroke="currentColor"
                  fill="none"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="animate-spin text-center"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg">
                  <line x1="12" y1="2" x2="12" y2="6"></line>
                  <line x1="12" y1="18" x2="12" y2="22"></line>
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                  <line x1="2" y1="12" x2="6" y2="12"></line>
                  <line x1="18" y1="12" x2="22" y2="12"></line>
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
              </div>
            </button>
          `
            installButton.outerHTML = pendingBtn

            fetch(
              'https://chat.openai.com/backend-api/aip/p/' +
                id +
                '/user-settings',
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: token,
                },
                body: JSON.stringify({
                  is_installed: !is_installed,
                }),
              },
            )
              .then((result) => {
                result
                  .clone()
                  .json()
                  .then((body) => {
                    const btn = cover.querySelector('.btn')
                    btn.outerHTML = is_installed ? installedBtn : uninstalledBtn

                    plugin.user_settings.is_installed = !is_installed
                  })
              })
              .catch((err) => {})
          })
        })
      })
    })
  }
})()
