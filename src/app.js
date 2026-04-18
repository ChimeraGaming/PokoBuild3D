import { renderFooter } from './components/footer.js'
import { mountLiveChat, renderLiveChat } from './components/live-chat.js'
import { renderNavbar } from './components/navbar.js'
import { showToast } from './components/toast.js'
import { aboutPage } from './pages/about.js'
import { authPage } from './pages/auth.js'
import { buildDetailPage } from './pages/build-detail.js'
import { blocksPage } from './pages/blocks.js'
import { catalogPage } from './pages/catalog.js'
import { createBuildPage } from './pages/create-build.js'
import { dashboardPage } from './pages/dashboard.js'
import { editorPage } from './pages/editor.js'
import { editProfilePage } from './pages/edit-profile.js'
import { favoritesPage } from './pages/favorites.js'
import { homePage } from './pages/home.js'
import { notFoundPage } from './pages/not-found.js'
import { profilePage } from './pages/profile.js'
import { settingsPage } from './pages/settings.js'
import { createProfilePath } from './utils/format.js'
import { createRouter } from './utils/router.js'
import { createAppApi } from './utils/app-api.js'

var routes = [
  homePage,
  catalogPage,
  blocksPage,
  buildDetailPage,
  createBuildPage,
  editorPage,
  authPage,
  profilePage,
  editProfilePage,
  dashboardPage,
  favoritesPage,
  settingsPage,
  aboutPage,
  {
    path: '/profile',
    title: 'Profile',
    requiresAuth: true,
    async render() {
      return '<section class="shell narrow page-stack"><div class="card">Redirecting to your profile...</div></section>'
    },
    async afterRender(context) {
      context.router.navigate(createProfilePath(context.session.profile.username))
    }
  }
]

export function initApp() {
  var appRoot = document.getElementById('app')
  var api = createAppApi()
  var router = createRouter(routes)
  var activeCleanup = []

  async function render(routeState) {
    activeCleanup.forEach(function (cleanup) {
      cleanup()
    })
    activeCleanup = []

    var session = null

    try {
      session = await api.getSession()
    } catch (error) {
      console.error(error)
      showToast('Backend connection failed. Falling back where possible.', 'error')
    }

    var page = routeState.route || notFoundPage
    if (page.requiresAuth && !session) {
      router.navigate('/auth', {
        redirect: routeState.path
      })
      return
    }

    var context = {
      api: api,
      router: router,
      session: session,
      params: routeState.params,
      query: routeState.query,
      path: routeState.path
    }
    var content = await page.render(context)
    var modeLabel = api.backendMode === 'supabase' ? 'Supabase' : 'Local demo'

    appRoot.innerHTML =
      renderNavbar(session) +
      '<main class="site-main">' +
      '<div class="shell app-mode-row"><span class="status-pill">' +
      modeLabel +
      '</span><a class="text-link" href="#/about">How this app runs</a></div>' +
      content +
      '</main>' +
      renderFooter() +
      renderLiveChat(session)

    document.title = page.title + ' | PokoBuild3D'

    if (page.afterRender) {
      var pageCleanup = await page.afterRender(context)

      if (typeof pageCleanup === 'function') {
        activeCleanup.push(pageCleanup)
      }
    }

    activeCleanup.push(
      mountLiveChat({
        api: api,
        router: router,
        session: session,
        path: routeState.path
      })
    )
  }

  router.onChange(function (state) {
    render(state)
  })
  router.start()
}
