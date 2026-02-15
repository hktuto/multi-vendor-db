export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password']
  
  // If user is not logged in and trying to access protected route
  if (!loggedIn.value && !publicRoutes.includes(to.path)) {
    // Save the intended destination for redirect after login
    if (to.path !== '/') {
      return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
    return navigateTo('/login')
  }
  
  // If user is logged in and trying to access auth pages
  if (loggedIn.value && publicRoutes.includes(to.path)) {
    // Check for redirect query param
    const redirect = to.query.redirect as string
    if (redirect) {
      return navigateTo(redirect)
    }
    return navigateTo('/dashboard')
  }
})
