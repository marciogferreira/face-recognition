/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import PagePonto from './PagePonto'

import './App.css'

export type IUser = {
  name: string
  faceid: Float32Array[]
}

function App() {

  const [isOpenPontoPage, setIsOpenPontoPage] = useState(false)

  const [user, setUser] = useState<IUser | null>(null)

  const [userName, setUserName] = useState('')

  useEffect(() => {
    // find user on localstorage
    const user = localStorage.getItem('user')
    if (user) setUser(JSON.parse(user))
  }, [])

  const onSaveClient = (event: any) => {
    event.preventDefault()
    const newUser = { name: userName, faceid: []}
    localStorage.setItem('user', JSON.stringify(newUser))
    setUser(newUser)
  }


  if (!user) {
    return (
          <div>
            <h1>Sistema de Ponto</h1>
            <h1>Cadastro de usuario</h1>
            <div className="card">
              <form>
                <input type="text" placeholder="Nome" onChange={(e) => setUserName(e.target.value)} />
                <button type="submit" onClick={onSaveClient}>Cadastrar</button>
              </form>
            </div>
          </div>
    )
  }

  if (isOpenPontoPage) {
    return (
      <div>
          <PagePonto user={user} />
      </div>
    )
  }

  return (
    <>
      <div>
      </div>
      <h1>Sistema de Ponto</h1>
      <h2>Olá, {user.name}</h2>
      <div className="card">
        <button onClick={() => { setIsOpenPontoPage(true)}}>
          Bater Ponto
        </button>
      </div>
    </>
  )
}

export default App
