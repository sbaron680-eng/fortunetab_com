'use client'

import { useEffect, useRef } from 'react'
import { trackScrollDepth } from '@/lib/analytics'

export default function ScrollTracker() {
  const fired50 = useRef(false)
  const fired90 = useRef(false)

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return

      const percent = Math.round((scrollTop / docHeight) * 100)

      if (!fired50.current && percent >= 50) {
        fired50.current = true
        trackScrollDepth(50)
      }
      if (!fired90.current && percent >= 90) {
        fired90.current = true
        trackScrollDepth(90)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return null
}
