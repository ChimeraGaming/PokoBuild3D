import { renderEmptyState } from '../components/states.js'

export var notFoundPage = {
  path: '/404',
  title: 'Not Found',
  async render() {
    return (
      '<section class="shell narrow page-stack">' +
      renderEmptyState('Page not found', 'The page you were looking for could not be found.', '#/', 'Back home') +
      '</section>'
    )
  }
}
