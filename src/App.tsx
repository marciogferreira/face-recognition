/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import * as faceapi from '@vladmandic/face-api';
import localforage from 'localforage';
import { FaceMatcher } from '@vladmandic/face-api';

import './App.css'

const MODEL_PATH = './models'

localforage.config({
  name: 'face-recognition',
  version: 1.0,
  storeName: 'face-recognition',
  description: 'Face Recognition',
  driver: localforage.INDEXEDDB,
})

function App() {
  const [isLoaded, setLoaded] = useState(false);
  const [users, setUsers] = useState<string[]>([])
  const [isLoging, setIsLogging] = useState(false);
  const [userLogged, setUserLogged] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [userDescription, setUserDescription] = useState<Float32Array>(new Float32Array())
  const [userName, setUserName] = useState('')
  const [isEditingUser, setIsEditingUser] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoWidth = 640;
  const videoHeight = 360;

  useEffect(() => {
    loadFaceApiModels();
    
  }, []);

  useEffect(() => {
    localforage.keys().then((keys) => {
      setUsers(keys)
    });
  }, [isEditingUser]);

  const loadFaceApiModels = async () => {
    // @ts-expect-error erro esperado
    await faceapi.tf.setBackend('webgl');
    // @ts-expect-error erro esperado
    await faceapi.tf?.ready();
    // @ts-expect-error erro esperado
    if (faceapi.tf?.env().flagRegistry.CANVAS2D_WILL_READ_FREQUENTLY) faceapi.tf.env().set('CANVAS2D_WILL_READ_FREQUENTLY', true);
    // @ts-expect-error erro esperado
    if (faceapi.tf?.env().flagRegistry.WEBGL_EXP_CONV) faceapi.tf.env().set('WEBGL_EXP_CONV', true);
    // @ts-expect-error erro esperado
    if (faceapi.tf?.env().flagRegistry.WEBGL_EXP_CONV) faceapi.tf.env().set('WEBGL_EXP_CONV', true);

    Promise.all([
      faceapi.nets.tinyFaceDetector.load(MODEL_PATH),
      //faceapi.nets.ssdMobilenetv1.load(MODEL_PATH),
      //faceapi.nets.ageGenderNet.load(MODEL_PATH),
      faceapi.nets.faceLandmark68Net.load(MODEL_PATH),
      faceapi.nets.faceRecognitionNet.load(MODEL_PATH),
      //faceapi.nets.faceExpressionNet.load(MODEL_PATH)
    ]).finally(() => {
      // @ts-expect-error erro esperado
      console.log('Models loaded: ' + faceapi.tf.engine().state.numTensors + ' tensors');
      setLoaded(true)
    });
  };

  const stopLocalUserVideo = () => {
    setIsCapturing(false);
    setIsLogging(false);
    // @ts-expect-error erro esperado
    videoRef.current?.srcObject?.getVideoTracks().forEach((track: any) => track.stop());
  };

  const getLocalUserVideo = async () => {
    
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: true })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        //setLocalUserStream(stream);
        setIsCapturing(true);
      })
      .catch((err) => {
        console.error("error:", err);
      });
  };

  const scanFace = async () => {
    console.log("scanFace")
    if (!videoRef.current) return;
    const detections = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      //.detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor()
    
    if (detections) {
      if (isLoging) {
        await localforage.iterate((value: Float32Array, key) => {
          const descriptor = new faceapi.LabeledFaceDescriptors(
            key,
            [value]
          )
          const faceMatcher = new FaceMatcher(descriptor)
          const bestMatch = faceMatcher.findBestMatch(detections.descriptor)
          console.log('--> bestMatch ' + key + ' ', bestMatch.toString())
          if (bestMatch.label === key ) {
            setIsLogging(false)
            setUserLogged(key)
            setIsCapturing(false)
            return key
          }
        }).finally(() => {
          console.log('usuario encontrado')
        })
      } else {
        setUserDescription(detections.descriptor)
        setIsCapturing(false)
        setIsEditingUser(true)
      }
      stopLocalUserVideo()
    } else {
      if(isCapturing || isLoging) {
        //slep 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        scanFace()
      }
    }
  };

  const doLogin = async () => {
    setUserLogged('')
    setIsLogging(true)
    getLocalUserVideo()
  };
  
  if (!isLoaded) {
    return (
        <h2> loading...</h2>
    )
  }

  if (isEditingUser) {
    return (
      <div>
          <h2>Cadastro de usuario</h2>
          <input type="text" placeholder="Nome" value={userName} onChange={(e) => setUserName(e.target.value)} />
          <button style={{ flex: 1, margin: '10px' }} onClick={() => {
            localforage.setItem(userName, userDescription)
            setIsEditingUser(false)
          }}>Salvar</button>
          <button style={{ flex: 1, margin: '10px' }} onClick={() => {
            setUserName('')
            setUserDescription(new Float32Array())
            setIsEditingUser(false)
          }}>Cancelar</button>
      </div>
    )
  }

  return (
    <>
      
      <div>
        
      </div>
      <h1>Face Recognition Test</h1>
      { userLogged && <h2>Usuario logado: {userLogged}</h2>}
      <div style={{display: 'flex', flexDirection: 'row', padding: '10px', width: '100%'}}>
        { !isCapturing && !isLoging &&
          <button style={{flex: 1, margin: '10px'}} onClick={ getLocalUserVideo }>
            Capturar Rosto
          </button>
        }
        { (isCapturing || isLoging) && 
          <button  style={{flex: 1, margin: '10px'}} onClick={ stopLocalUserVideo }>
            { isLoging ? "Cancelar Login" : "Parar Captura"}
          </button>
        }
        {!isCapturing && !isLoging &&
          <button style={{ flex: 1, margin: '10px' }} onClick={ doLogin }>
            Login
          </button>
        }
      </div>
      <div className="relative flex flex-col items-center p-[10px]">
        <video
          muted
          autoPlay
          ref={videoRef}
          height={videoHeight}
          width={videoWidth}
          onPlay={scanFace}
          style={{
            // objectFit: "fill",
            // height: "360px",
            borderRadius: "10px",
            margin : "10px",
            backgroundColor: "black",
            display: isCapturing || isLoging ? "block" : "none",
          }}
        />
      </div>
      {!isCapturing && !isEditingUser 
        && <>
          <br/>
          <br/>
          <h2> {users.length ? "Usuarios cadastrados" : "Nenhum usuario cadastrado"}</h2>
          <div style={{display: 'flex', flexDirection: 'row'}}>
            { users.map((user) => {
              return (
                <div key={user} style={{margin: '10px', backgroundColor: 'blue', color: 'white', padding: '10px', borderRadius: '10px'}}>{user}</div>
              )
            }) }
          </div>
        </>
      }

    </>
  )
}

export default App
