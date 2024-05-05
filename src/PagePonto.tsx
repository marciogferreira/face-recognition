import { useState } from 'react'
import ReconhecimentoFacial from './reconhecimentoFacil'
import { IUser } from './App'

export default function PagePonto(props: { user: IUser }) {

    const [onCapture, setOnCapture] = useState<boolean>(false)
    const [user, setUser] = useState<IUser>(props.user)
    const [captureSuccess, setCaptureSuccess] = useState<boolean>(false)
    const [onError, setOnError] = useState<boolean>(false)

    const onCaptureFace = (faceid: Float32Array) => {
        console.log(faceid)
        const newUser = { name: user.name, faceid: [faceid] }
        localStorage.setItem('user', JSON.stringify(newUser))
        setUser(newUser)
        setOnCapture(false)
        setCaptureSuccess(true)
    }

    const onCancel = () => {
        //setOnCapture(false)
        setOnError(true)
    }

    if(onError) return (
        <div>
            <h1>Olá {user.name}</h1>
            <h2>Erro ao cadastrar tentar fazer a leitura facil</h2>
            <button onClick={() => setOnError(false)} >Voltar</button>
        </div>
    )
    
    if (user.faceid.length === 0) {
        return onCapture ? (
            <ReconhecimentoFacial onCapture={onCaptureFace} onCancel={onCancel}/>
            ) : (
                <div>
                    <h1>Olá {user.name}</h1>
                    <h2>Vamos iniciar o cadastro da sua leitura ID facial</h2>
                    <button onClick={() => setOnCapture(true)} >Iniciar Leitura Facial</button>
                </div>
            )
    }

    if (captureSuccess) {
        return (
            <div>
                <h1>Olá {user.name}</h1>
                <h2>Leitura ID facial cadastrada com sucesso!</h2>
                <button onClick={() => setCaptureSuccess(false)} >Voltar</button>
            </div>
        )
    }

    return (
        <div>
            <h1>Ponto</h1>
            <h2>Olá {user.name}</h2>
        </div>
    )
    
}