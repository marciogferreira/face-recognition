
import { useEffect, useState } from 'react'
import ReconhecimentoFacial from './reconhecimentoFacialjs'

import './App.css'

export type IUser = {
    name: string
    faceid: Float32Array[]
}

declare global {
  interface Window {
    ReactNativeWebView: {
      postMessage: (message: string) => void;
    };
  }
}

export default function App() {

  const EVENTS = {
    CAPTURE: 'capture',
    MATCH: 'match',
    ERROR: 'error'
  }

    const [loading, setLoading] = useState<boolean>(true)
    const [onCapture, setOnCapture] = useState<boolean>(false)
    const [user, setUser] = useState<IUser>()
    const [debug, seDebug] = useState<string>('');

    useEffect(() => {
      // navigator.mediaDevices.getUserMedia({
      //   video: true,
      // })
      document.addEventListener('message' as keyof DocumentEventMap, handleEvent as EventListener)
      return () => {
        document.removeEventListener('message' as keyof DocumentEventMap, handleEvent as EventListener)
      }
    }, [])

    // useEffect(() => {
    //   setTimeout(() => {
    //     onCancel()
    //   }
    //   , 2000)
    // }
    // , [])

    const handleEvent = (eventData: MessageEvent) => {
      console.log(eventData)
      const { event , payload } = JSON.parse(eventData.data)
      alert(JSON.stringify(event));
      seDebug(JSON.stringify(event));
      switch (event){
        case EVENTS.CAPTURE:
          setOnCapture(true)
          setLoading(false)
          break
        case EVENTS.MATCH:
          setLoading(false)
          setUser(payload.user)
          break
        default:
          break
      }
    
    }

    const sendPostMensage = (event: string, payload: object) => {
      const msg = { event, payload };
      const message = JSON.stringify(msg);
      console.log(msg);
      try {
        window.ReactNativeWebView.postMessage(message);
      } catch (error) {
        console.error(error);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onCaptureFace = (faceid: Float32Array, img: any) => {
      const reader = new FileReader()

      alert("Capiturou Imagem")
      sendPostMensage(EVENTS.CAPTURE, { faceid, img: reader.result });
      reader.onloadend = () => {
        // alert("Capiturou Imagem 2")
        // sendPostMensage(EVENTS.CAPTURE, { faceid, img: reader.result });
      }
      reader.readAsDataURL(img)
    };

    const onCancel = () => {
      sendPostMensage(EVENTS.ERROR, { error: 'timeout' })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFaceMatch = (faceid: Float32Array, img: any) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        sendPostMensage(EVENTS.MATCH, { faceid, img: reader.result })
      }
      reader.readAsDataURL(img)
    }

    const renderReconhecimento = () => {
      return onCapture ? (
        <ReconhecimentoFacial onCapture={onCaptureFace} onCancel={onCancel} />
      ) : (
        <ReconhecimentoFacial onFaceMatch={onFaceMatch} onCancel={onCancel} userForMatch={user} />
      )
    }

    return !loading ? (
      renderReconhecimento()
    ) : (
      <>
        <h3> Carregando Biblioteca... {debug}</h3>
      </>
    )

}
