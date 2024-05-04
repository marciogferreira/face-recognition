import { useEffect, useRef, useState } from 'react'
import PagePonto from './PagePonto'

import './App.css'

function App() {

  const [isOpenPontoPage, setIsOpenPontoPage] = useState(false)


  if (isOpenPontoPage) {
    return (
      <div>
          <PagePonto />
      </div>
    )
  }

  return (
    <>
      <div>
      </div>
      <h1>Sistema de Ponto</h1>
      <div className="card">
        <button onClick={() => { setIsOpenPontoPage(true)}}>
          Bater Ponto
        </button>
      </div>
    </>
  )
}

export default App
