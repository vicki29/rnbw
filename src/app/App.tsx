import React, { useEffect } from 'react';

import {
  BrowserRouter as Router,
  Route,
  Routes,
} from 'react-router-dom';
import { Workbox } from 'workbox-window';

import { LogAllow } from '@_constants/main';
import MainPage from '@_pages/main';

import { AppProps } from './types';

export default function App(props: AppProps) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const wb = new Workbox('/nohost-sw.js?route=rnbw')

      wb.controlling.then(() => {
        LogAllow && console.log('nohost ready')
      })

      wb.addEventListener('installed', (event) => {
        if (!event.isUpdate) {
          LogAllow && console.log('nohost first time installed')
        }
      })

      wb.register()
    }
  }, [])

  return <>
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
      </Routes>
    </Router>
  </>
}

// extend global interfaces
declare global {
  interface Window {
    Filer: any,
  }
  interface Element {
    appendBefore: (element: Element) => void,
    appendAfter: (element: Element) => void,
  }
}

window.Filer = window.Filer

Element.prototype.appendBefore = function (element: Element) {
  element.parentNode?.insertBefore(this, element)
}
Element.prototype.appendAfter = function (element: Element) {
  element.parentNode?.insertBefore(this, element.nextSibling)
}