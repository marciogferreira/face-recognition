import { useEffect, useRef, useState } from 'react'
import * as faceapi from '@vladmandic/face-api';
import { FaceMatcher } from '@vladmandic/face-api';

import './App.css'

const MODEL_PATH = './models'

function App() {
  const [isLoaded, setLoaded] = useState(false);
  const [localUserStream, setLocalUserStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef();
  const videoWidth = 640;
  const videoHeight = 360;

  useEffect(() => {
    loadFaceApiModels();
  }, []);

  const loadFaceApiModels = async () => {
    await faceapi.tf.setBackend('webgl');
    await faceapi.tf.ready();
    if (faceapi.tf?.env().flagRegistry.CANVAS2D_WILL_READ_FREQUENTLY) faceapi.tf.env().set('CANVAS2D_WILL_READ_FREQUENTLY', true);
    if (faceapi.tf?.env().flagRegistry.WEBGL_EXP_CONV) faceapi.tf.env().set('WEBGL_EXP_CONV', true);
    if (faceapi.tf?.env().flagRegistry.WEBGL_EXP_CONV) faceapi.tf.env().set('WEBGL_EXP_CONV', true);

    Promise.all([
      faceapi.nets.tinyFaceDetector.load(MODEL_PATH),
      //faceapi.nets.ssdMobilenetv1.load(MODEL_PATH),
      //faceapi.nets.ageGenderNet.load(MODEL_PATH),
      faceapi.nets.faceLandmark68Net.load(MODEL_PATH),
      faceapi.nets.faceRecognitionNet.load(MODEL_PATH),
      //faceapi.nets.faceExpressionNet.load(MODEL_PATH)
    ]).finally(() => {
      console.log('Models loaded: ' + faceapi.tf.engine().state.numTensors + ' tensors');
      setLoaded(true)
    });
  };

  const getLocalUserVideo = async () => {
    if (isCapturing) {
      return setIsCapturing(false);
    }
    
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        setLocalUserStream(stream);
        setIsCapturing(true);
      })
      .catch((err) => {
        console.error("error:", err);
      });
  };

  const scanFace = async () => {
    console.log("scanFace")
    const detections = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (detections) {
      console.log(detections)
      console.log(detections.descriptor)
    }
  };
  
  if (!isLoaded) {
    return (
        <h2> loading...</h2>
    )
  }

  return (
    <>
      
      <div>
        
      </div>
      <h1>Face Recognition Test</h1>
      <div className="card">
        <button onClick={() => { getLocalUserVideo()}}>
          { isCapturing ? "Parar Captura" : "Capturar Rosto"}
        </button>
        <button onClick={() => {}}>
          Login
        </button>
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
            objectFit: "fill",
            height: "360px",
            borderRadius: "10px",
            display: isCapturing ? "block" : "none",
          }}
        />
      </div>

    </>
  )
}

export default App
