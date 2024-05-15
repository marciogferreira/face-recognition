import { useState } from 'react'
import ReconhecimentoFacial from './reconhecimentoFacialjs'
import { IUser } from './App'

export default function PagePonto(props: { user: IUser }) {

    const [onCapture, setOnCapture] = useState<boolean>(false)
    const [user, setUser] = useState<IUser>(props.user)
    const [captureSuccess, setCaptureSuccess] = useState<boolean>(false)
    const [onError, setOnError] = useState<boolean>(false)
    const [pontoBatido, setPontoBatido] = useState<boolean>(false)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onCaptureFace = (faceid: Float32Array, img: any) => {
        console.log(img)
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFaceMatch = (faceid: Float32Array, img: any) => {
        console.log(img)
        setOnCapture(false)
        const ponto = JSON.parse(localStorage.getItem('ponto') ?? "[]")
        localStorage.setItem('ponto', JSON.stringify([...ponto, { faceid, date: new Date(), user: user.name, status: 'entrada'}]))
        setPontoBatido(true)
    }

    if(onError) return (
        <div>
            <h1>Olá {user.name}</h1>
            <h2>Erro ao cadastrar tentar fazer a leitura facil</h2>
            <button style={{ backgroundColor: 'green' }}  onClick={() => setOnError(false)} >Voltar</button>
        </div>
    )
    
    if (user.faceid.length === 0) {
        return onCapture ? (
            <ReconhecimentoFacial onCapture={onCaptureFace} onCancel={onCancel}/>
            ) : (
                <div>
                    <h1>Olá {user.name}</h1>
                    <h2>Vamos iniciar o cadastro da sua leitura ID facial</h2>
                    <button style={{ backgroundColor: 'green' }} onClick={() => setOnCapture(true)} >Iniciar Leitura Facial</button>
                </div>
            )
    }

    if (captureSuccess) {
        return (
            <div>
                <h1>Olá {user.name}</h1>
                <h2>Leitura ID facial cadastrada com sucesso!</h2>
                <button style={{ backgroundColor: 'green' }} onClick={() => setCaptureSuccess(false)} >Voltar</button>
            </div>
        )
    }

    return onCapture ? (
        <ReconhecimentoFacial onFaceMatch={onFaceMatch} onCancel={onCancel}  userForMatch={user}/>
        ) :(
            <>
                <div>
                    <h1>Ponto</h1>
                    <h2>Olá {user.name}</h2>
                    {pontoBatido && <h2>Ponto batido com sucesso!</h2>}
                    <button style={{ backgroundColor: 'green' }}  onClick={() => { setOnCapture(true); setPontoBatido(false) } } >Bater Ponto</button>
                </div>
                <div>
                    <h2>Historico de ponto</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Nome</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            
                            {JSON.parse(localStorage.getItem('ponto') ?? "[]").map((ponto: {date: string, user: string, status: string}) => (
                                ponto && 
                                <tr key={ponto.date}>
                                    <td>{ponto.date}</td>
                                    <td>{ponto.user}</td>
                                    <td>{ponto.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        )
    
}