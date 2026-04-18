import { showToast } from '../components/toast.js'
import { createProfilePath } from '../utils/format.js'

export var authPage = {
  path: '/auth',
  title: 'Sign In',
  async render(context) {
    return (
      '<section class="shell auth-grid page-stack">' +
      '<article class="card stack">' +
      '<span class="eyebrow">Welcome back</span>' +
      '<h1>Sign in</h1>' +
      '<form id="sign-in-form" class="stack">' +
      '<label>Email<input name="email" type="email" required placeholder="you@example.com" /></label>' +
      '<label>Password<input name="password" type="password" required placeholder="Minimum 6 characters" /></label>' +
      '<button class="button button-primary" type="submit">Sign In</button>' +
      '</form>' +
      '<p class="muted">Local demo users all use the password <code>pokopia-demo</code>.</p>' +
      '</article>' +
      '<article class="card stack">' +
      '<span class="eyebrow">New here</span>' +
      '<h2>Create account</h2>' +
      '<form id="sign-up-form" class="stack">' +
      '<label>Display name<input name="displayName" type="text" required placeholder="Moss Path" /></label>' +
      '<label>Username<input name="username" type="text" required placeholder="mosspath" /></label>' +
      '<label>Email<input name="email" type="email" required placeholder="you@example.com" /></label>' +
      '<label>Password<input name="password" type="password" required minlength="6" placeholder="At least 6 characters" /></label>' +
      '<button class="button button-secondary" type="submit">Create Account</button>' +
      '</form>' +
      '</article>' +
      '</section>'
    )
  },
  async afterRender(context) {
    var signInForm = document.getElementById('sign-in-form')
    var signUpForm = document.getElementById('sign-up-form')

    signInForm.addEventListener('submit', async function (event) {
      event.preventDefault()
      var formData = new FormData(signInForm)

      try {
        var session = await context.api.signIn({
          email: formData.get('email'),
          password: formData.get('password')
        })
        showToast('Signed in successfully.', 'success')
        context.router.navigate(context.query.redirect || createProfilePath(session.profile.username))
      } catch (error) {
        showToast(error.message, 'error')
      }
    })

    signUpForm.addEventListener('submit', async function (event) {
      event.preventDefault()
      var formData = new FormData(signUpForm)

      try {
        var session = await context.api.signUp({
          displayName: formData.get('displayName'),
          username: formData.get('username'),
          email: formData.get('email'),
          password: formData.get('password')
        })
        if (session?.pendingConfirmation) {
          showToast('Account created. Confirm your email, then sign in.', 'success')
          context.router.navigate('/auth')
          return
        }

        showToast('Account created.', 'success')
        if (session?.profile) {
          context.router.navigate(createProfilePath(session.profile.username))
        } else {
          context.router.navigate('/')
        }
      } catch (error) {
        showToast(error.message, 'error')
      }
    })
  }
}
